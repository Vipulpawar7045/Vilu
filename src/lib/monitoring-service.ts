import type { Prisma } from "@prisma/client";

import {
  collectPublicPage,
  CollectionInputError,
  type CollectionFetchResult,
} from "@/lib/collection-service";
import { type MonitoringResultStatus, type MonitoringReviewStatus } from "@/domain/monitoring";
import { prisma } from "@/lib/prisma";

const monitoredOpportunityStatuses = [
  "researching",
  "needs-verification",
  "verified",
  "solution-ready",
  "ready-for-outreach",
  "contacted",
  "replied",
  "meeting-booked",
  "proposal-sent",
] as const;

type MonitoringSource = Prisma.SourceGetPayload<{
  include: {
    company: {
      select: { id: true; name: true; websiteUrl: true; priority: true; status: true };
    };
  };
}>;

export type MonitoringFetchResult = Pick<
  CollectionFetchResult,
  | "ok"
  | "finalUrl"
  | "responseStatus"
  | "normalizedText"
  | "contentHash"
  | "errorMessage"
  | "blockedByRobots"
>;

export type MonitoringRunOptions = {
  referenceDate?: Date;
  limit?: number;
  companyId?: string;
  checkSource?: (source: MonitoringSource, checkedAt: Date) => Promise<MonitoringFetchResult>;
};

export async function runMonitoring(options: MonitoringRunOptions = {}) {
  const checkedAt = options.referenceDate ?? new Date();
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 50);
  const sources = await prisma.source.findMany({
    where: {
      company: {
        ...(options.companyId ? { id: options.companyId } : {}),
        status: "active",
        priority: { gte: 4 },
      },
    },
    include: {
      company: { select: { id: true, name: true, websiteUrl: true, priority: true, status: true } },
    },
    orderBy: [{ lastCheckedAt: "asc" }, { updatedAt: "asc" }],
  });
  const targets = sources
    .sort((left, right) => right.company.priority - left.company.priority)
    .slice(0, limit);
  const checkSource = options.checkSource ?? defaultCheckSource;
  const results: MonitoringRunResult[] = [];

  for (const source of targets) {
    const previous = await prisma.sourceCheck.findFirst({
      where: { sourceId: source.id },
      orderBy: [{ checkedAt: "desc" }, { createdAt: "desc" }],
    });
    const fetchResult = await checkSource(source, checkedAt);
    const resultStatus = getMonitoringResultStatus(previous?.contentHash ?? null, fetchResult);
    const alert = resultStatus !== "unchanged";
    const duplicateAlert = isDuplicateMonitoringAlert(
      previous,
      resultStatus,
      fetchResult.contentHash,
    );
    const reviewStatus: MonitoringReviewStatus =
      alert && !duplicateAlert ? "pending" : "not-needed";
    const note = buildMonitoringNote(source.url, resultStatus, checkedAt);

    const saved = await prisma.$transaction(async (tx) => {
      const check = await tx.sourceCheck.create({
        data: {
          sourceId: source.id,
          checkedAt,
          responseStatus: fetchResult.responseStatus,
          finalUrl: fetchResult.finalUrl || null,
          previousHash: previous?.contentHash ?? null,
          contentHash: fetchResult.contentHash,
          normalizedText: fetchResult.normalizedText,
          resultStatus,
          reviewStatus,
          errorMessage: fetchResult.errorMessage,
        },
        include: { source: { include: { company: { select: { id: true, name: true } } } } },
      });
      await tx.source.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: checkedAt,
          accessibilityStatus: accessibilityStatusFor(resultStatus),
        },
      });

      let downgradedCount = 0;
      if (alert && !duplicateAlert) {
        const opportunities = await tx.opportunity.findMany({
          where: {
            status: { in: [...monitoredOpportunityStatuses] },
            evidenceLinks: { some: { evidence: { sourceId: source.id } } },
          },
          select: { id: true, verificationNotes: true },
        });
        for (const opportunity of opportunities) {
          await tx.opportunity.update({
            where: { id: opportunity.id },
            data: {
              status: "needs-verification",
              verificationNotes: appendNote(opportunity.verificationNotes, note),
            },
          });
        }
        downgradedCount = opportunities.length;
      }

      return { check, downgradedCount };
    });

    results.push({
      sourceId: source.id,
      sourceUrl: source.url,
      companyName: source.company.name,
      resultStatus,
      reviewStatus,
      duplicateAlert,
      downgradedCount: saved.downgradedCount,
      check: saved.check,
    });
  }

  return {
    checkedAt,
    checkedCount: results.length,
    alertCount: results.filter((result) => result.reviewStatus === "pending").length,
    downgradedCount: results.reduce((total, result) => total + result.downgradedCount, 0),
    results,
  };
}

export async function getMonitoringWorkspaceData() {
  const [sources, checks] = await Promise.all([
    prisma.source.findMany({
      where: { company: { status: "active", priority: { gte: 4 } } },
      orderBy: [{ lastCheckedAt: "asc" }, { updatedAt: "asc" }],
      include: {
        company: { select: { id: true, name: true, priority: true } },
        _count: { select: { evidence: true, checks: true } },
      },
    }),
    prisma.sourceCheck.findMany({
      take: 100,
      orderBy: [{ reviewStatus: "asc" }, { checkedAt: "desc" }],
      include: {
        source: { include: { company: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  return {
    sources,
    checks,
    alerts: checks.filter((check) => check.reviewStatus === "pending"),
  };
}

export async function getMonitoringAlerts(limit = 10) {
  return prisma.sourceCheck.findMany({
    where: { reviewStatus: "pending" },
    take: limit,
    orderBy: { checkedAt: "desc" },
    include: {
      source: { include: { company: { select: { id: true, name: true } } } },
    },
  });
}

export async function updateMonitoringReview(id: string, reviewStatus: MonitoringReviewStatus) {
  return prisma.sourceCheck.update({
    where: { id },
    data: { reviewStatus },
    include: { source: { include: { company: { select: { id: true, name: true } } } } },
  });
}

export function getMonitoringResultStatus(
  previousHash: string | null,
  result: Pick<MonitoringFetchResult, "ok" | "responseStatus" | "contentHash" | "blockedByRobots">,
): MonitoringResultStatus {
  if (result.blockedByRobots) return "blocked";
  if (result.responseStatus === 404 || result.responseStatus === 410) return "missing";
  if (!result.ok) return "failed";
  if (previousHash !== null && previousHash !== result.contentHash) return "changed";
  return "unchanged";
}

export function isDuplicateMonitoringAlert(
  previous: { reviewStatus: string; resultStatus: string; contentHash: string | null } | null,
  resultStatus: MonitoringResultStatus,
  contentHash: string | null,
) {
  return Boolean(
    previous &&
    previous.reviewStatus === "pending" &&
    previous.contentHash === contentHash &&
    (previous.resultStatus === resultStatus ||
      (resultStatus === "unchanged" && previous.resultStatus !== "unchanged")),
  );
}

async function defaultCheckSource(
  source: MonitoringSource,
  checkedAt: Date,
): Promise<MonitoringFetchResult> {
  try {
    return await collectPublicPage(source.company.websiteUrl, source.url, {
      now: () => checkedAt,
    });
  } catch (error) {
    return {
      ok: false,
      finalUrl: source.url,
      responseStatus: null,
      normalizedText: null,
      contentHash: null,
      errorMessage:
        error instanceof CollectionInputError
          ? Object.values(error.errors).join(" ")
          : error instanceof Error
            ? error.message
            : "The source could not be checked.",
      blockedByRobots: error instanceof CollectionInputError,
    };
  }
}

function accessibilityStatusFor(resultStatus: MonitoringResultStatus) {
  if (resultStatus === "missing") return "deleted";
  if (resultStatus === "changed") return "changed";
  if (resultStatus === "blocked") return "inaccessible";
  if (resultStatus === "failed") return "unknown";
  return "accessible";
}

function buildMonitoringNote(url: string, resultStatus: MonitoringResultStatus, checkedAt: Date) {
  return `Monitoring detected ${resultStatus} for ${url} on ${checkedAt.toISOString()}. Review the source check before continuing.`;
}

function appendNote(existing: string | null, note: string) {
  return existing ? `${existing}\n${note}` : note;
}

export type MonitoringRunResult = {
  sourceId: string;
  sourceUrl: string;
  companyName: string;
  resultStatus: MonitoringResultStatus;
  reviewStatus: MonitoringReviewStatus;
  duplicateAlert: boolean;
  downgradedCount: number;
  check: Awaited<ReturnType<typeof prisma.sourceCheck.create>>;
};
