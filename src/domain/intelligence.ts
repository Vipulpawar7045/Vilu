import {
  calculateDiscoveryRankingScore,
  corroborationScore,
  normalizeDiscoveryText,
} from "@/domain/discovery";

export const CLUSTER_RESOLUTION_STATES = ["open", "monitoring", "resolved", "stale"] as const;
export type ClusterResolutionState = (typeof CLUSTER_RESOLUTION_STATES)[number];

export const SOLUTION_MATCH_REVIEW_STATUSES = ["needs-review", "approved", "rejected"] as const;
export type SolutionMatchReviewStatus = (typeof SOLUTION_MATCH_REVIEW_STATUSES)[number];

export type ClusterSignalScore = {
  title: string;
  excerpt: string;
  observedAt: Date;
  sourcePublishedAt: Date | null;
  sourceUpdatedAt: Date | null;
  sourceType: string;
  sourceHost: string;
  recencyScore: number;
  specificityScore: number;
  sourceReliabilityScore: number;
  impactScore: number;
  solutionFitScore: number;
};

export type ClusterScores = {
  firstSeenAt: Date;
  latestSeenAt: Date;
  independentSourceCount: number;
  recencyScore: number;
  specificityScore: number;
  sourceReliabilityScore: number;
  corroborationScore: number;
  impactScore: number;
  solutionFitScore: number;
  rankingScore: number;
};

export function isClusterResolutionState(value: unknown): value is ClusterResolutionState {
  return (
    typeof value === "string" && CLUSTER_RESOLUTION_STATES.includes(value as ClusterResolutionState)
  );
}

export function isSolutionMatchReviewStatus(value: unknown): value is SolutionMatchReviewStatus {
  return (
    typeof value === "string" &&
    SOLUTION_MATCH_REVIEW_STATUSES.includes(value as SolutionMatchReviewStatus)
  );
}

export function aggregateClusterScores(signals: ClusterSignalScore[]): ClusterScores {
  if (signals.length === 0) {
    const now = new Date(0);
    return {
      firstSeenAt: now,
      latestSeenAt: now,
      independentSourceCount: 0,
      recencyScore: 1,
      specificityScore: 1,
      sourceReliabilityScore: 1,
      corroborationScore: 1,
      impactScore: 1,
      solutionFitScore: 1,
      rankingScore: 1,
    };
  }
  const independentSourceCount = new Set(
    signals.map((signal) => `${signal.sourceType}:${signal.sourceHost}`),
  ).size;
  const recencyScore = maxScore(signals.map((signal) => signal.recencyScore));
  const specificityScore = maxScore(signals.map((signal) => signal.specificityScore));
  const sourceReliabilityScore = maxScore(signals.map((signal) => signal.sourceReliabilityScore));
  const impactScore = maxScore(signals.map((signal) => signal.impactScore));
  const solutionFitScore = maxScore(signals.map((signal) => signal.solutionFitScore));
  const corroboration = corroborationScore(independentSourceCount);
  const firstSeenAt = signals.reduce(
    (earliest, signal) => (signal.observedAt < earliest ? signal.observedAt : earliest),
    signals[0].observedAt,
  );
  const latestSeenAt = signals.reduce(
    (latest, signal) => (signal.observedAt > latest ? signal.observedAt : latest),
    signals[0].observedAt,
  );
  return {
    firstSeenAt,
    latestSeenAt,
    independentSourceCount,
    recencyScore,
    specificityScore,
    sourceReliabilityScore,
    corroborationScore: corroboration,
    impactScore,
    solutionFitScore,
    rankingScore: calculateDiscoveryRankingScore({
      recencyScore,
      specificityScore,
      sourceReliabilityScore,
      corroborationScore: corroboration,
      impactScore,
      solutionFitScore,
    }),
  };
}

export function chooseClusterTitle(
  signals: Array<Pick<ClusterSignalScore, "title" | "recencyScore" | "impactScore">>,
): string {
  return (
    [...signals]
      .sort(
        (left, right) =>
          right.impactScore + right.recencyScore - left.impactScore - left.recencyScore,
      )
      .map((signal) => signal.title.trim())
      .find(Boolean) ?? "Unresolved public issue signal"
  );
}

export function buildClusterSummary(
  title: string,
  signalCount: number,
  sourceCount: number,
): string {
  return `A reviewable public issue cluster around “${title}” with ${signalCount} signal${signalCount === 1 ? "" : "s"} from ${sourceCount} independent source identity${sourceCount === 1 ? "" : "ies"}. This is a research lead, not proof of an internal company problem.`;
}

export function matchCapabilityToCluster(
  cluster: { title: string; neutralSummary: string; solutionFitScore: number },
  capability: { name: string; description: string; category?: string | null; keywords: string },
) {
  const clusterText = normalizeForMatch(`${cluster.title} ${cluster.neutralSummary}`);
  const terms = capability.keywords
    .split(",")
    .map((term) => normalizeForMatch(term))
    .filter(Boolean);
  const matchedTerms = terms.filter((term) => clusterText.includes(term));
  const fitScore = Math.min(
    5,
    Math.max(1, Math.round(cluster.solutionFitScore + matchedTerms.length * 0.5)),
  );
  const rationale = matchedTerms.length
    ? `The cluster overlaps the configured capability terms: ${matchedTerms.join(", ")}. Confirm the service fit and expected outcome before acting.`
    : `This capability was selected for review against the cluster. Confirm the fit, effort, and outcome before acting.`;
  return { fitScore, matchedTerms, rationale };
}

function normalizeForMatch(value: string) {
  return normalizeDiscoveryText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function maxScore(values: number[]) {
  return Math.max(1, ...values);
}
