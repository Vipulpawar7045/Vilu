import type { Prisma } from "@prisma/client";

import {
  getConfidenceLevel,
  getOpportunityFreshness,
  needsOpportunityVerification,
  type FreshnessLabel,
} from "@/domain/rules";
import { prisma } from "@/lib/prisma";

const opportunityInclude = {
  company: {
    select: {
      id: true,
      name: true,
      status: true,
      _count: { select: { contacts: true } },
    },
  },
  evidenceLinks: {
    orderBy: { linkedAt: "asc" },
    include: {
      evidence: {
        include: {
          source: {
            select: {
              id: true,
              url: true,
              title: true,
              sourceType: true,
              publishedAt: true,
              sourceUpdatedAt: true,
              lastCheckedAt: true,
              accessibilityStatus: true,
            },
          },
        },
      },
    },
  },
  _count: { select: { evidenceLinks: true, outreach: true } },
} satisfies Prisma.OpportunityInclude;

type OpportunityWithRelations = Prisma.OpportunityGetPayload<{
  include: typeof opportunityInclude;
}>;

export type OpportunityQueueItem = ReturnType<typeof toQueueItem>;

export const FRESHNESS_ORDER: FreshnessLabel[] = [
  "Hot",
  "Recent",
  "Aging",
  "Historical",
  "Undated",
];

export async function getOpportunityQueue(options?: {
  status?: "active" | "needs-verification" | "resolved" | "all";
  freshness?: FreshnessLabel | "all";
  companyId?: string;
  referenceDate?: Date;
}) {
  const status = options?.status ?? "active";
  const referenceDate = options?.referenceDate ?? new Date();
  const opportunities = await prisma.opportunity.findMany({
    where: {
      ...(options?.companyId ? { companyId: options.companyId } : {}),
      ...(status === "active" ? { status: { notIn: ["resolved", "archived"] } } : {}),
      ...(status === "needs-verification" ? { status: { notIn: ["resolved", "archived"] } } : {}),
      ...(status === "resolved" ? { status: "resolved" } : {}),
    },
    include: opportunityInclude,
  });

  const items = opportunities
    .map((opportunity) => toQueueItem(opportunity, referenceDate))
    .filter((opportunity) => {
      if (status === "needs-verification" && !opportunity.needsVerification) return false;
      if (
        options?.freshness &&
        options.freshness !== "all" &&
        opportunity.freshnessLabel !== options.freshness
      ) {
        return false;
      }
      return true;
    })
    .sort((left, right) => {
      const freshnessDifference =
        FRESHNESS_ORDER.indexOf(left.freshnessLabel) -
        FRESHNESS_ORDER.indexOf(right.freshnessLabel);
      if (freshnessDifference !== 0) return freshnessDifference;
      if (right.priorityScore !== left.priorityScore)
        return right.priorityScore - left.priorityScore;
      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });

  return items;
}

export async function getOpportunity(id: string) {
  return prisma.opportunity.findUnique({ where: { id }, include: opportunityInclude });
}

export async function getOpportunityEditorData(companyId?: string) {
  const [companies, evidence] = await Promise.all([
    prisma.company.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    }),
    prisma.evidence.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { observedAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        source: {
          select: {
            id: true,
            url: true,
            title: true,
            sourceType: true,
            accessibilityStatus: true,
          },
        },
      },
    }),
  ]);

  return { companies, evidence };
}

export function toQueueItem(opportunity: OpportunityWithRelations, referenceDate: Date) {
  const evidenceDates = opportunity.evidenceLinks.map(({ evidence }) => ({
    sourcePublishedAt: evidence.source.publishedAt,
    sourceUpdatedAt: evidence.source.sourceUpdatedAt,
    sourceLastCheckedAt: evidence.source.lastCheckedAt,
    observedAt: evidence.observedAt,
    lastVerifiedAt: evidence.lastVerifiedAt,
  }));
  const allSourcesAccessible =
    evidenceDates.length > 0 &&
    opportunity.evidenceLinks.every(
      ({ evidence }) => evidence.source.accessibilityStatus === "accessible",
    );
  const freshnessLabel = getOpportunityFreshness(
    { opportunityLastVerifiedAt: opportunity.lastVerifiedAt, evidenceDates },
    referenceDate,
  );
  const sourceIds = new Set(opportunity.evidenceLinks.map(({ evidence }) => evidence.source.id));
  const confidence = getConfidenceLevel({
    evidenceCount: opportunity.evidenceLinks.length,
    independentSourceCount: sourceIds.size,
    hasRecentEvidence: freshnessLabel === "Hot" || freshnessLabel === "Recent",
    manuallyVerified: Boolean(opportunity.lastVerifiedAt),
  });

  return {
    ...opportunity,
    freshnessLabel,
    confidence,
    allSourcesAccessible,
    needsVerification: needsOpportunityVerification({
      freshnessLabel,
      status: opportunity.status,
      allSourcesAccessible,
    }),
  };
}

export function getVerificationReason(opportunity: OpportunityQueueItem): string {
  if (!opportunity.allSourcesAccessible) return "A supporting source is inaccessible or changed.";
  if (opportunity.freshnessLabel === "Aging") return "The latest signal is 31–90 days old.";
  if (opportunity.freshnessLabel === "Historical")
    return "The latest signal is more than 90 days old.";
  if (opportunity.freshnessLabel === "Undated")
    return "No reliable source or verification date is recorded.";
  if (opportunity.status === "needs-verification")
    return "This opportunity was explicitly flagged for review.";
  return "Review the evidence before using this opportunity.";
}
