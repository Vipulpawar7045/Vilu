import { createHash } from "node:crypto";

import {
  calculatePriorityScore,
  getOpportunityFreshness,
  OPPORTUNITY_CATEGORIES,
} from "@/domain/rules";
import {
  canonicalizeDiscoveryUrl,
  DISCOVERY_ADAPTERS,
  isDiscoveryAdapter,
  isDiscoveryReviewStatus,
  isDiscoverySourceType,
  makeDiscoveryFingerprint,
  makeDiscoveryGroupKey,
  neutralizeDiscoverySummary,
  parseDiscoveryPayload,
  scoreDiscoveryItem,
  type DiscoveryAdapter,
  type DiscoveryItem,
  type DiscoveryReviewStatus,
  type DiscoverySourceType,
} from "@/domain/discovery";
import {
  aggregateClusterScores,
  buildClusterSummary,
  chooseClusterTitle,
  matchCapabilityToCluster,
  isClusterResolutionState,
  isSolutionMatchReviewStatus,
  type ClusterResolutionState,
  type SolutionMatchReviewStatus,
} from "@/domain/intelligence";
import { fetchWithRetry, isAllowedByRobots } from "@/lib/collection-service";
import { prisma } from "@/lib/prisma";

export {
  DISCOVERY_ADAPTERS,
  DISCOVERY_REVIEW_STATUSES,
  DISCOVERY_SOURCE_TYPES,
  isDiscoveryAdapter,
  isDiscoveryReviewStatus,
  isDiscoverySourceType,
} from "@/domain/discovery";
export type {
  DiscoveryAdapter,
  DiscoveryReviewStatus,
  DiscoverySourceType,
} from "@/domain/discovery";

const MAX_DISCOVERY_ITEMS = 50;
const MAX_RESPONSE_BYTES = 1_000_000;
const lastDiscoveryRequestAt = new Map<string, number>();

export type DiscoveryFetchResult = {
  ok: boolean;
  sourceUrl: string;
  adapter: DiscoveryAdapter;
  responseStatus: number | null;
  observedAt: Date;
  items: DiscoveryItem[];
  blockedByRobots: boolean;
  errorMessage: string | null;
};

export class DiscoveryInputError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super("Discovery input is invalid.");
    this.name = "DiscoveryInputError";
  }
}

export class DiscoveryReviewError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super("The discovery review action is invalid.");
    this.name = "DiscoveryReviewError";
  }
}

export function validateDiscoveryUrl(
  companyWebsiteUrl: string,
  targetUrl: string,
  sourceType: DiscoverySourceType,
  adapter: DiscoveryAdapter,
) {
  const errors: Record<string, string> = {};
  const companyUrl = parseHttpUrl(companyWebsiteUrl);
  const target = parseHttpUrl(targetUrl);

  if (!companyUrl) errors.companyId = "The company website must be a valid HTTP or HTTPS URL.";
  if (!target) errors.url = "Enter a valid HTTP or HTTPS public feed or issue URL.";
  if (!isDiscoverySourceType(sourceType))
    errors.sourceType = "Choose a supported public source type.";
  if (!isDiscoveryAdapter(adapter))
    errors.adapter = `Choose one of: ${DISCOVERY_ADAPTERS.join(", ")}.`;
  if (Object.keys(errors).length > 0 || !companyUrl || !target)
    return { success: false as const, errors };

  if (target.username || target.password) {
    return {
      success: false as const,
      errors: { url: "URLs with embedded credentials are not allowed." },
    };
  }

  const companyHost = normalizeHost(companyUrl.hostname);
  const targetHost = normalizeHost(target.hostname);
  if (companyHost !== targetHost && !isPermittedExternalHost(targetHost, sourceType)) {
    return {
      success: false as const,
      errors: {
        url: "This source host is not allowlisted for the selected adapter. Use the company domain or a permitted public provider.",
      },
    };
  }

  if (sourceType === "github" && adapter !== "github-json") {
    return {
      success: false as const,
      errors: { adapter: "GitHub discovery requires the GitHub JSON adapter." },
    };
  }

  return {
    success: true as const,
    data: { url: canonicalizeDiscoveryUrl(target.toString()) ?? target.toString() },
  };
}

export async function fetchPublicDiscoverySource(
  companyWebsiteUrl: string,
  targetUrl: string,
  sourceType: DiscoverySourceType,
  adapter: DiscoveryAdapter,
  options: {
    fetchImpl?: typeof fetch;
    now?: () => Date;
    sleep?: (milliseconds: number) => Promise<void>;
    minIntervalMs?: number;
    maxRetries?: number;
    timeoutMs?: number;
  } = {},
): Promise<DiscoveryFetchResult> {
  const validation = validateDiscoveryUrl(companyWebsiteUrl, targetUrl, sourceType, adapter);
  if (!validation.success) throw new DiscoveryInputError(validation.errors);

  const sourceUrl = validation.data.url;
  const observedAt = options.now?.() ?? new Date();
  const sleep = options.sleep ?? delay;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxRetries = options.maxRetries ?? 2;
  await waitForDiscoveryRateLimit(new URL(sourceUrl).host, options.minIntervalMs ?? 750, sleep);

  try {
    const robotsUrl = `${new URL(sourceUrl).origin}/robots.txt`;
    const robotsResponse = await fetchWithRetry(robotsUrl, {
      fetchImpl: options.fetchImpl,
      maxRetries,
      timeoutMs,
      sleep,
    });

    if (robotsResponse.status >= 200 && robotsResponse.status < 300) {
      if (
        robotsResponse.url &&
        normalizeHost(new URL(robotsResponse.url).hostname) !==
          normalizeHost(new URL(sourceUrl).hostname)
      ) {
        return failedDiscoveryResult({
          sourceUrl,
          adapter,
          observedAt,
          responseStatus: robotsResponse.status,
          blockedByRobots: true,
          errorMessage: "Discovery stopped because robots.txt redirected outside the allowed host.",
        });
      }
      if (!isAllowedByRobots(new URL(sourceUrl).pathname, await robotsResponse.text())) {
        return failedDiscoveryResult({
          sourceUrl,
          adapter,
          observedAt,
          responseStatus: null,
          blockedByRobots: true,
          errorMessage: "Discovery was blocked by the source robots.txt policy.",
        });
      }
    } else if (robotsResponse.status !== 404) {
      return failedDiscoveryResult({
        sourceUrl,
        adapter,
        observedAt,
        responseStatus: robotsResponse.status,
        blockedByRobots: true,
        errorMessage: "Discovery stopped because robots.txt could not be checked safely.",
      });
    }

    const response = await fetchWithRetry(sourceUrl, {
      fetchImpl: options.fetchImpl,
      maxRetries,
      timeoutMs,
      sleep,
    });
    const finalUrl = response.url || sourceUrl;
    if (normalizeHost(new URL(finalUrl).hostname) !== normalizeHost(new URL(sourceUrl).hostname)) {
      return failedDiscoveryResult({
        sourceUrl,
        adapter,
        observedAt,
        responseStatus: response.status,
        blockedByRobots: false,
        errorMessage: "Discovery stopped because the source redirected outside the allowed host.",
      });
    }
    const payload = await response.text();
    if (new TextEncoder().encode(payload).byteLength > MAX_RESPONSE_BYTES) {
      return failedDiscoveryResult({
        sourceUrl,
        adapter,
        observedAt,
        responseStatus: response.status,
        blockedByRobots: false,
        errorMessage: "The discovery response is larger than the safe 1 MB limit.",
      });
    }
    if (response.status < 200 || response.status >= 400) {
      return failedDiscoveryResult({
        sourceUrl,
        adapter,
        observedAt,
        responseStatus: response.status,
        blockedByRobots: false,
        errorMessage: `The discovery source returned HTTP ${response.status}.`,
      });
    }

    return {
      ok: true,
      sourceUrl,
      adapter,
      responseStatus: response.status,
      observedAt,
      items: parseDiscoveryPayload(payload, adapter, sourceUrl).slice(0, MAX_DISCOVERY_ITEMS),
      blockedByRobots: false,
      errorMessage: null,
    };
  } catch (error) {
    return failedDiscoveryResult({
      sourceUrl,
      adapter,
      observedAt,
      responseStatus: null,
      blockedByRobots: false,
      errorMessage:
        error instanceof Error ? error.message : "The discovery source could not be fetched.",
    });
  }
}

export async function getDiscoveryWorkspaceData(options?: {
  companyId?: string;
  reviewStatus?: DiscoveryReviewStatus | "all";
  sourceType?: DiscoverySourceType | "all";
  minimumScore?: number;
}) {
  const [companies, signals, clusters, capabilities, savedSearches] = await Promise.all([
    prisma.company.findMany({
      where: { status: "active" },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      select: { id: true, name: true, websiteUrl: true },
    }),
    prisma.issueSignal.findMany({
      where: {
        ...(options?.companyId ? { companyId: options.companyId } : {}),
        ...(options?.reviewStatus && options.reviewStatus !== "all"
          ? { reviewStatus: options.reviewStatus }
          : {}),
        ...(options?.sourceType && options.sourceType !== "all"
          ? { sourceType: options.sourceType }
          : {}),
        ...(options?.minimumScore !== undefined
          ? { rankingScore: { gte: options.minimumScore } }
          : {}),
      },
      take: 100,
      orderBy: [{ rankingScore: "desc" }, { observedAt: "desc" }],
      include: {
        company: { select: { id: true, name: true } },
        source: {
          select: {
            id: true,
            url: true,
            title: true,
            sourceType: true,
            publishedAt: true,
            sourceUpdatedAt: true,
            accessibilityStatus: true,
          },
        },
      },
    }),
    prisma.issueCluster.findMany({
      where: {
        ...(options?.companyId ? { companyId: options.companyId } : {}),
        ...(options?.minimumScore !== undefined
          ? { rankingScore: { gte: options.minimumScore } }
          : {}),
      },
      take: 100,
      orderBy: [{ rankingScore: "desc" }, { latestSeenAt: "desc" }],
      include: {
        company: { select: { id: true, name: true } },
        timeline: { orderBy: { createdAt: "desc" }, take: 20 },
        solutionMatches: {
          include: { capability: true },
          orderBy: { fitScore: "desc" },
        },
      },
    }),
    prisma.serviceCapability.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.savedSearch.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { companies, signals, clusters, capabilities, savedSearches };
}

export async function discoverCompanySignals(
  companyId: string,
  targetUrl: string,
  sourceType: DiscoverySourceType,
  adapter: DiscoveryAdapter,
  options: Parameters<typeof fetchPublicDiscoverySource>[4] = {},
) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, websiteUrl: true, status: true },
  });
  if (!company) throw new DiscoveryInputError({ companyId: "Company could not be found." });
  if (company.status === "archived") {
    throw new DiscoveryInputError({
      companyId: "Archived companies cannot receive new discovery signals.",
    });
  }

  const result = await fetchPublicDiscoverySource(
    company.websiteUrl,
    targetUrl,
    sourceType,
    adapter,
    options,
  );
  if (!result.ok) return { result, signals: [] };

  const signals = await prisma.$transaction(async (transaction) => {
    const savedSignals = [];
    for (const item of result.items) {
      const sourceUrl = canonicalizeDiscoveryUrl(item.url) ?? result.sourceUrl;
      const source = await transaction.source.upsert({
        where: { companyId_url: { companyId, url: sourceUrl } },
        update: {
          title: item.title,
          sourceType,
          publishedAt: item.sourcePublishedAt,
          sourceUpdatedAt: item.sourceUpdatedAt,
          lastCheckedAt: result.observedAt,
          accessibilityStatus: "accessible",
        },
        create: {
          companyId,
          url: sourceUrl,
          sourceType,
          title: item.title,
          publishedAt: item.sourcePublishedAt,
          sourceUpdatedAt: item.sourceUpdatedAt,
          lastCheckedAt: result.observedAt,
          accessibilityStatus: "accessible",
        },
      });
      const fingerprint = makeDiscoveryFingerprint({ ...item, url: sourceUrl });
      const groupKey = makeDiscoveryGroupKey(item);
      const cluster = await transaction.issueCluster.upsert({
        where: { companyId_groupKey: { companyId, groupKey } },
        update: { latestSeenAt: result.observedAt },
        create: {
          companyId,
          groupKey,
          title: item.title,
          neutralSummary: buildClusterSummary(item.title, 1, 1),
          category: categoryForSource(sourceType),
          firstSeenAt: result.observedAt,
          latestSeenAt: result.observedAt,
        },
      });
      const score = scoreDiscoveryItem(item, sourceType, 1, result.observedAt);
      const signal = await transaction.issueSignal.upsert({
        where: { companyId_fingerprint: { companyId, fingerprint } },
        update: {
          sourceId: source.id,
          sourceUrl,
          sourceType,
          title: item.title,
          excerpt: item.excerpt,
          neutralSummary: neutralizeDiscoverySummary(item.title, item.excerpt),
          sourcePublishedAt: item.sourcePublishedAt,
          sourceUpdatedAt: item.sourceUpdatedAt,
          observedAt: result.observedAt,
          accessibilityStatus: "accessible",
          responseStatus: result.responseStatus,
          groupKey,
          clusterId: cluster.id,
          recencyScore: score.recencyScore,
          specificityScore: score.specificityScore,
          sourceReliabilityScore: score.sourceReliabilityScore,
          impactScore: score.impactScore,
          solutionFitScore: score.solutionFitScore,
        },
        create: {
          companyId,
          sourceId: source.id,
          sourceUrl,
          sourceType,
          title: item.title,
          excerpt: item.excerpt,
          neutralSummary: neutralizeDiscoverySummary(item.title, item.excerpt),
          sourcePublishedAt: item.sourcePublishedAt,
          sourceUpdatedAt: item.sourceUpdatedAt,
          observedAt: result.observedAt,
          accessibilityStatus: "accessible",
          responseStatus: result.responseStatus,
          fingerprint,
          groupKey,
          clusterId: cluster.id,
          ...score,
        },
      });
      savedSignals.push(signal);
      await transaction.issueClusterEvent.create({
        data: {
          clusterId: cluster.id,
          signalId: signal.id,
          eventType: "signal-observed",
          title: item.title,
          summary: item.excerpt,
          sourceUrl,
          sourcePublishedAt: item.sourcePublishedAt,
          observedAt: result.observedAt,
        },
      });
    }

    await refreshGroupScores(
      transaction,
      companyId,
      [...new Set(savedSignals.map((signal) => signal.groupKey))],
      result.observedAt,
    );
    await refreshClusterScores(transaction, companyId, [
      ...new Set(savedSignals.map((signal) => signal.groupKey)),
    ]);
    return savedSignals;
  });

  const refreshed = await prisma.issueSignal.findMany({
    where: { id: { in: signals.map((signal) => signal.id) } },
    include: {
      company: { select: { id: true, name: true } },
      source: {
        select: { id: true, url: true, title: true, sourceType: true, accessibilityStatus: true },
      },
    },
    orderBy: [{ rankingScore: "desc" }, { observedAt: "desc" }],
  });
  return { result, signals: refreshed };
}

export async function captureIssueSignal(
  companyId: string,
  input: {
    url: string;
    sourceType: DiscoverySourceType;
    title: string;
    excerpt: string;
    sourcePublishedAt?: Date | null;
  },
) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, websiteUrl: true, status: true },
  });
  if (!company) throw new DiscoveryInputError({ companyId: "Company could not be found." });
  if (company.status === "archived") {
    throw new DiscoveryInputError({
      companyId: "Archived companies cannot receive new discovery signals.",
    });
  }
  const adapter = input.sourceType === "github" ? "github-json" : "rss";
  const validation = validateDiscoveryUrl(company.websiteUrl, input.url, input.sourceType, adapter);
  if (!validation.success) throw new DiscoveryInputError(validation.errors);
  const title = input.title.trim();
  const excerpt = input.excerpt.trim();
  const errors: Record<string, string> = {};
  if (title.length < 3) errors.title = "Capture a short source title.";
  if (excerpt.length < 10)
    errors.excerpt = "Capture at least 10 characters of the selected excerpt.";
  if (excerpt.length > 1600)
    errors.excerpt = "Captured excerpts must be 1,600 characters or fewer.";
  if (Object.keys(errors).length > 0) throw new DiscoveryInputError(errors);

  const observedAt = new Date();
  const item: DiscoveryItem = {
    url: validation.data.url,
    title,
    excerpt,
    sourcePublishedAt: input.sourcePublishedAt ?? null,
    sourceUpdatedAt: null,
  };
  const result = await prisma.$transaction(async (transaction) => {
    const source = await transaction.source.upsert({
      where: { companyId_url: { companyId, url: item.url } },
      update: {
        title: item.title,
        sourceType: input.sourceType,
        publishedAt: item.sourcePublishedAt,
        lastCheckedAt: observedAt,
        accessibilityStatus: "accessible",
      },
      create: {
        companyId,
        url: item.url,
        sourceType: input.sourceType,
        title: item.title,
        publishedAt: item.sourcePublishedAt,
        lastCheckedAt: observedAt,
      },
    });
    const fingerprint = makeDiscoveryFingerprint(item);
    const groupKey = makeDiscoveryGroupKey(item);
    const cluster = await transaction.issueCluster.upsert({
      where: { companyId_groupKey: { companyId, groupKey } },
      update: { latestSeenAt: observedAt },
      create: {
        companyId,
        groupKey,
        title: item.title,
        neutralSummary: buildClusterSummary(item.title, 1, 1),
        category: categoryForSource(input.sourceType),
        firstSeenAt: observedAt,
        latestSeenAt: observedAt,
      },
    });
    const score = scoreDiscoveryItem(item, input.sourceType, 1, observedAt);
    const signal = await transaction.issueSignal.upsert({
      where: { companyId_fingerprint: { companyId, fingerprint } },
      update: {
        sourceId: source.id,
        sourceUrl: item.url,
        sourceType: input.sourceType,
        title: item.title,
        excerpt: item.excerpt,
        neutralSummary: neutralizeDiscoverySummary(item.title, item.excerpt),
        sourcePublishedAt: item.sourcePublishedAt,
        observedAt,
        accessibilityStatus: "accessible",
        responseStatus: null,
        groupKey,
        clusterId: cluster.id,
        ...score,
      },
      create: {
        companyId,
        sourceId: source.id,
        sourceUrl: item.url,
        sourceType: input.sourceType,
        title: item.title,
        excerpt: item.excerpt,
        neutralSummary: neutralizeDiscoverySummary(item.title, item.excerpt),
        sourcePublishedAt: item.sourcePublishedAt,
        observedAt,
        accessibilityStatus: "accessible",
        responseStatus: null,
        fingerprint,
        groupKey,
        clusterId: cluster.id,
        ...score,
      },
    });
    await transaction.issueClusterEvent.create({
      data: {
        clusterId: cluster.id,
        signalId: signal.id,
        eventType: "browser-capture",
        title: item.title,
        summary: "A permitted public URL and operator-selected excerpt were submitted for review.",
        sourceUrl: item.url,
        sourcePublishedAt: item.sourcePublishedAt,
        observedAt,
      },
    });
    await refreshClusterScores(transaction, companyId, [groupKey]);
    return signal;
  });
  return prisma.issueSignal.findUnique({ where: { id: result.id }, include: issueSignalInclude });
}

export async function createSavedSearch(input: {
  name: string;
  companyId?: string | null;
  reviewStatus?: string | null;
  sourceType?: string | null;
  minimumScore?: number | null;
}) {
  const name = input.name.trim();
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Saved search name must be at least 2 characters.";
  if (name.length > 100) errors.name = "Saved search name must be 100 characters or fewer.";
  if (input.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: input.companyId },
      select: { id: true },
    });
    if (!company) errors.companyId = "Company could not be found.";
  }
  if (input.reviewStatus && !isDiscoveryReviewStatus(input.reviewStatus)) {
    errors.reviewStatus = "Choose a valid review status.";
  }
  if (input.sourceType && !isDiscoverySourceType(input.sourceType)) {
    errors.sourceType = "Choose a valid source type.";
  }
  if (
    input.minimumScore !== null &&
    input.minimumScore !== undefined &&
    (input.minimumScore < 1 || input.minimumScore > 5)
  ) {
    errors.minimumScore = "Minimum score must be between 1 and 5.";
  }
  if (Object.keys(errors).length > 0) throw new DiscoveryInputError(errors);
  return prisma.savedSearch.create({
    data: {
      name,
      companyId: input.companyId || null,
      reviewStatus: input.reviewStatus || null,
      sourceType: input.sourceType || null,
      minimumScore: input.minimumScore ?? null,
    },
  });
}

export async function createServiceCapability(input: {
  name: string;
  description: string;
  category?: string | null;
  keywords: string;
  estimatedEffort?: string | null;
  expectedOutcome?: string | null;
  nextAction?: string | null;
}) {
  const name = input.name.trim();
  const description = input.description.trim();
  const keywords = input.keywords.trim();
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Capability name must be at least 2 characters.";
  if (description.length < 10)
    errors.description = "Describe the capability in at least 10 characters.";
  if (keywords.length < 2) errors.keywords = "Add comma-separated matching terms.";
  if (Object.keys(errors).length > 0) throw new DiscoveryInputError(errors);
  return prisma.serviceCapability.create({
    data: {
      name,
      description,
      category: cleanText(input.category),
      keywords,
      estimatedEffort: cleanText(input.estimatedEffort),
      expectedOutcome: cleanText(input.expectedOutcome),
      nextAction: cleanText(input.nextAction),
    },
  });
}

export async function createSolutionMatch(
  clusterId: string,
  capabilityId: string,
  input: {
    rationale?: string | null;
    expectedOutcome?: string | null;
    nextAction?: string | null;
  } = {},
) {
  const [cluster, capability] = await Promise.all([
    prisma.issueCluster.findUnique({ where: { id: clusterId } }),
    prisma.serviceCapability.findUnique({ where: { id: capabilityId } }),
  ]);
  if (!cluster) throw new DiscoveryReviewError({ clusterId: "Issue cluster could not be found." });
  if (!capability || !capability.active)
    throw new DiscoveryReviewError({
      capabilityId: "Active service capability could not be found.",
    });
  const match = matchCapabilityToCluster(cluster, capability);
  const saved = await prisma.solutionMatch.upsert({
    where: { clusterId_capabilityId: { clusterId, capabilityId } },
    update: {
      rationale: cleanText(input.rationale) || match.rationale,
      fitScore: match.fitScore,
      estimatedEffort: capability.estimatedEffort,
      expectedOutcome: cleanText(input.expectedOutcome) || capability.expectedOutcome,
      nextAction: cleanText(input.nextAction) || capability.nextAction,
      reviewStatus: "needs-review",
    },
    create: {
      clusterId,
      capabilityId,
      rationale: cleanText(input.rationale) || match.rationale,
      fitScore: match.fitScore,
      estimatedEffort: capability.estimatedEffort,
      expectedOutcome: cleanText(input.expectedOutcome) || capability.expectedOutcome,
      nextAction: cleanText(input.nextAction) || capability.nextAction,
    },
    include: { capability: true },
  });
  await prisma.issueClusterEvent.create({
    data: {
      clusterId,
      eventType: "solution-match-created",
      summary: `Capability “${capability.name}” was matched for operator review.`,
    },
  });
  return saved;
}

export async function updateSolutionMatchReview(
  id: string,
  reviewStatus: SolutionMatchReviewStatus,
) {
  if (!isSolutionMatchReviewStatus(reviewStatus)) {
    throw new DiscoveryReviewError({
      reviewStatus: "Choose a valid solution match review status.",
    });
  }
  const match = await prisma.solutionMatch.findUnique({
    where: { id },
    select: { id: true, clusterId: true },
  });
  if (!match) throw new DiscoveryReviewError({ id: "Solution match could not be found." });
  const updated = await prisma.solutionMatch.update({
    where: { id },
    data: { reviewStatus },
    include: { capability: true },
  });
  await prisma.issueClusterEvent.create({
    data: {
      clusterId: match.clusterId,
      eventType: "solution-match-reviewed",
      summary: `Solution match review state changed to ${reviewStatus}.`,
    },
  });
  return updated;
}

export async function updateClusterResolution(id: string, resolutionState: ClusterResolutionState) {
  if (!isClusterResolutionState(resolutionState)) {
    throw new DiscoveryReviewError({ resolutionState: "Choose a valid cluster resolution state." });
  }
  const cluster = await prisma.issueCluster.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!cluster) throw new DiscoveryReviewError({ id: "Issue cluster could not be found." });
  const updated = await prisma.issueCluster.update({ where: { id }, data: { resolutionState } });
  await prisma.issueClusterEvent.create({
    data: {
      clusterId: id,
      eventType: "resolution-state-changed",
      summary: `Cluster “${cluster.title}” marked ${resolutionState}.`,
    },
  });
  return updated;
}

export async function updateIssueSignalReview(id: string, reviewStatus: DiscoveryReviewStatus) {
  const current = await prisma.issueSignal.findUnique({
    where: { id },
    select: { id: true, independentSourceCount: true },
  });
  if (!current) throw new DiscoveryReviewError({ id: "The issue signal could not be found." });
  if (reviewStatus === "corroborated" && current.independentSourceCount < 2) {
    throw new DiscoveryReviewError({
      reviewStatus:
        "Corroboration needs at least two independent source identities. Keep this signal in review or verify it manually first.",
    });
  }
  return prisma.$transaction(async (transaction) => {
    const verifiedAt = reviewStatus === "corroborated" ? new Date() : null;
    const signal = await transaction.issueSignal.update({
      where: { id },
      data: { reviewStatus, lastVerifiedAt: verifiedAt ?? undefined },
      include: issueSignalInclude,
    });
    if (signal.clusterId) {
      await transaction.issueClusterEvent.create({
        data: {
          clusterId: signal.clusterId,
          signalId: signal.id,
          eventType: "review-status-changed",
          title: signal.title,
          summary: `Signal review state changed to ${reviewStatus}.`,
          sourceUrl: signal.sourceUrl,
          observedAt: signal.observedAt,
          verifiedAt,
        },
      });
    }
    return signal;
  });
}

export async function bulkUpdateIssueSignalReview(
  ids: string[],
  reviewStatus: DiscoveryReviewStatus,
  confirmed: boolean,
) {
  const uniqueIds = [...new Set(ids.filter(Boolean))].slice(0, 100);
  if (!confirmed) {
    throw new DiscoveryReviewError({
      confirmation: "Confirm the bulk review action before saving.",
    });
  }
  if (uniqueIds.length === 0) {
    throw new DiscoveryReviewError({ ids: "Select at least one signal." });
  }
  const current = await prisma.issueSignal.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      title: true,
      clusterId: true,
      sourceUrl: true,
      observedAt: true,
      independentSourceCount: true,
    },
  });
  if (current.length !== uniqueIds.length) {
    throw new DiscoveryReviewError({ ids: "One or more selected signals could not be found." });
  }
  if (
    reviewStatus === "corroborated" &&
    current.some((signal) => signal.independentSourceCount < 2)
  ) {
    throw new DiscoveryReviewError({
      reviewStatus:
        "Every selected signal needs at least two independent source identities before corroboration.",
    });
  }
  return prisma.$transaction(async (transaction) => {
    const verifiedAt = reviewStatus === "corroborated" ? new Date() : null;
    await transaction.issueSignal.updateMany({
      where: { id: { in: uniqueIds } },
      data: { reviewStatus, lastVerifiedAt: verifiedAt ?? undefined },
    });
    for (const signal of current) {
      if (!signal.clusterId) continue;
      await transaction.issueClusterEvent.create({
        data: {
          clusterId: signal.clusterId,
          signalId: signal.id,
          eventType: "bulk-review-status-changed",
          title: signal.title,
          summary: `Signal review state changed to ${reviewStatus} in an explicit bulk action.`,
          sourceUrl: signal.sourceUrl,
          observedAt: signal.observedAt,
          verifiedAt,
        },
      });
    }
    return transaction.issueSignal.findMany({
      where: { id: { in: uniqueIds } },
      include: issueSignalInclude,
    });
  });
}

export async function promoteIssueSignal(
  id: string,
  input: {
    createOpportunity?: boolean;
    title?: string | null;
    category?: string | null;
    hypothesis?: string | null;
    suggestedSolution?: string | null;
  } = {},
) {
  const signal = await prisma.issueSignal.findUnique({
    where: { id },
    include: { company: true, source: true },
  });
  if (!signal) throw new DiscoveryReviewError({ id: "The issue signal could not be found." });
  if (signal.reviewStatus !== "corroborated") {
    throw new DiscoveryReviewError({
      reviewStatus: "Corroborate this signal with explicit human review before promoting it.",
    });
  }
  if (signal.accessibilityStatus !== "accessible") {
    throw new DiscoveryReviewError({
      source: "The source is not accessible. Re-verify it before promotion.",
    });
  }

  const now = new Date();
  const snapshotHash = createHash("sha256")
    .update(`issue-signal|${signal.id}|${signal.fingerprint}`)
    .digest("hex");
  const result = await prisma.$transaction(async (transaction) => {
    const existingEvidence = await transaction.evidence.findUnique({ where: { snapshotHash } });
    const evidence =
      existingEvidence ??
      (await transaction.evidence.create({
        data: {
          companyId: signal.companyId,
          sourceId: signal.sourceId,
          excerpt: signal.excerpt,
          observedAt: signal.observedAt,
          lastVerifiedAt: now,
          snapshotHash,
          confidence: Math.min(5, Math.max(1, signal.sourceReliabilityScore)),
          notes:
            "Promoted from a public issue signal after explicit human review. Original source dates are preserved.",
        },
        include: { source: true, company: true },
      }));

    let opportunity = null;
    if (input.createOpportunity) {
      const title = cleanText(input.title) || `Possible ${signal.title}`;
      const category = validOpportunityCategory(input.category)
        ? input.category!
        : categoryForSource(signal.sourceType);
      const hypothesis = cleanText(input.hypothesis) || signal.neutralSummary;
      const suggestedSolution = cleanText(input.suggestedSolution);
      const existing = await transaction.opportunity.findFirst({
        where: { companyId: signal.companyId, title },
      });
      opportunity =
        existing ??
        (await transaction.opportunity.create({
          data: {
            companyId: signal.companyId,
            title,
            category,
            hypothesis,
            impactDescription:
              "This public signal may indicate an improvement opportunity; confirm the company context before making a claim.",
            suggestedSolution,
            expectedOutcome: null,
            impactScore: signal.impactScore,
            evidenceScore: Math.max(signal.recencyScore, signal.corroborationScore),
            solutionFitScore: signal.solutionFitScore,
            reachabilityScore: 2,
            priorityScore: calculatePriorityScore({
              impact: signal.impactScore,
              evidence: Math.max(signal.recencyScore, signal.corroborationScore),
              solutionFit: signal.solutionFitScore,
              reachability: 2,
            }),
            freshnessLabel: getOpportunityFreshness(
              {
                opportunityLastVerifiedAt: now,
                evidenceDates: [
                  {
                    sourcePublishedAt: signal.sourcePublishedAt,
                    sourceUpdatedAt: signal.sourceUpdatedAt,
                    sourceLastCheckedAt: signal.observedAt,
                    observedAt: signal.observedAt,
                    lastVerifiedAt: now,
                  },
                ],
              },
              now,
            ),
            status: "new",
            companyConfirmed: false,
            lastVerifiedAt: now,
            verificationNotes:
              "Created from a corroborated public signal. Human confirmation is still required before verification or outreach.",
            evidenceLinks: { create: { evidenceId: evidence.id } },
          },
          include: { company: true },
        }));
    }

    const updatedSignal = await transaction.issueSignal.update({
      where: { id: signal.id },
      data: { promotedAt: now, lastVerifiedAt: now, reviewStatus: "corroborated" },
      include: issueSignalInclude,
    });
    if (signal.clusterId) {
      await transaction.issueClusterEvent.create({
        data: {
          clusterId: signal.clusterId,
          signalId: signal.id,
          eventType: "promoted-to-evidence",
          title: signal.title,
          summary: "Signal promoted to evidence after explicit human review.",
          sourceUrl: signal.sourceUrl,
          observedAt: signal.observedAt,
          verifiedAt: now,
        },
      });
    }
    return { signal: updatedSignal, evidence, opportunity };
  });
  return result;
}

const issueSignalInclude = {
  company: { select: { id: true, name: true } },
  source: {
    select: {
      id: true,
      url: true,
      title: true,
      sourceType: true,
      publishedAt: true,
      sourceUpdatedAt: true,
      accessibilityStatus: true,
    },
  },
};

async function refreshGroupScores(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  companyId: string,
  groupKeys: string[],
  referenceDate: Date,
) {
  for (const groupKey of groupKeys) {
    const group = await transaction.issueSignal.findMany({
      where: { companyId, groupKey },
      include: { source: { select: { url: true, sourceType: true } } },
    });
    const independentSourceKeys = new Set(
      group.map(
        (signal) => `${signal.sourceType}:${normalizeHost(new URL(signal.source.url).hostname)}`,
      ),
    );
    const independentSourceCount = independentSourceKeys.size;
    for (const signal of group) {
      const score = scoreDiscoveryItem(
        {
          url: signal.sourceUrl,
          title: signal.title,
          excerpt: signal.excerpt,
          sourcePublishedAt: signal.sourcePublishedAt,
          sourceUpdatedAt: signal.sourceUpdatedAt,
        },
        signal.sourceType as DiscoverySourceType,
        independentSourceCount,
        referenceDate,
      );
      await transaction.issueSignal.update({
        where: { id: signal.id },
        data: { independentSourceCount, ...score },
      });
    }
  }
}

async function refreshClusterScores(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  companyId: string,
  groupKeys: string[],
) {
  for (const groupKey of groupKeys) {
    const cluster = await transaction.issueCluster.findUnique({
      where: { companyId_groupKey: { companyId, groupKey } },
    });
    if (!cluster) continue;
    const signals = await transaction.issueSignal.findMany({
      where: { clusterId: cluster.id },
      include: { source: { select: { url: true } } },
      orderBy: { rankingScore: "desc" },
    });
    const scores = aggregateClusterScores(
      signals.map((signal) => ({
        title: signal.title,
        excerpt: signal.excerpt,
        observedAt: signal.observedAt,
        sourcePublishedAt: signal.sourcePublishedAt,
        sourceUpdatedAt: signal.sourceUpdatedAt,
        sourceType: signal.sourceType,
        sourceHost: normalizeHost(new URL(signal.source.url).hostname),
        recencyScore: signal.recencyScore,
        specificityScore: signal.specificityScore,
        sourceReliabilityScore: signal.sourceReliabilityScore,
        impactScore: signal.impactScore,
        solutionFitScore: signal.solutionFitScore,
      })),
    );
    const title = chooseClusterTitle(signals);
    await transaction.issueCluster.update({
      where: { id: cluster.id },
      data: {
        title,
        neutralSummary: buildClusterSummary(title, signals.length, scores.independentSourceCount),
        firstSeenAt: scores.firstSeenAt,
        latestSeenAt: scores.latestSeenAt,
        independentSourceCount: scores.independentSourceCount,
        recencyScore: scores.recencyScore,
        specificityScore: scores.specificityScore,
        sourceReliabilityScore: scores.sourceReliabilityScore,
        corroborationScore: scores.corroborationScore,
        impactScore: scores.impactScore,
        solutionFitScore: scores.solutionFitScore,
        rankingScore: scores.rankingScore,
      },
    });
  }
}

function failedDiscoveryResult(input: {
  sourceUrl: string;
  adapter: DiscoveryAdapter;
  responseStatus: number | null;
  observedAt: Date;
  blockedByRobots: boolean;
  errorMessage: string;
}): DiscoveryFetchResult {
  return { ...input, ok: false, items: [] };
}

async function waitForDiscoveryRateLimit(
  host: string,
  minIntervalMs: number,
  sleep: (milliseconds: number) => Promise<void>,
) {
  const previous = lastDiscoveryRequestAt.get(host);
  if (previous !== undefined) {
    const remaining = minIntervalMs - (Date.now() - previous);
    if (remaining > 0) await sleep(remaining);
  }
  lastDiscoveryRequestAt.set(host, Date.now());
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function normalizeHost(host: string) {
  return host.toLowerCase().replace(/^www\./, "");
}

function isPermittedExternalHost(host: string, sourceType: DiscoverySourceType) {
  const allowed = new Set([
    "api.github.com",
    "github.com",
    "raw.githubusercontent.com",
    "g2.com",
    "capterra.com",
    "trustpilot.com",
    "reddit.com",
    "news.ycombinator.com",
    "stackoverflow.com",
    "statuspage.io",
    "lever.co",
    "greenhouse.io",
    "ashbyhq.com",
  ]);
  if (sourceType === "github") return host === "api.github.com" || host.endsWith("github.com");
  return [...allowed].some(
    (allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`),
  );
}

function cleanText(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text.length > 0 ? text : null;
}

function validOpportunityCategory(
  value: string | null | undefined,
): value is (typeof OPPORTUNITY_CATEGORIES)[number] {
  return (
    typeof value === "string" &&
    OPPORTUNITY_CATEGORIES.includes(value as (typeof OPPORTUNITY_CATEGORIES)[number])
  );
}

function categoryForSource(sourceType: string) {
  if (sourceType === "status") return "reliability";
  if (sourceType === "job-posting") return "hiring-operations";
  if (sourceType === "github") return "product-gap";
  if (sourceType === "documentation") return "documentation";
  return "customer-support";
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
