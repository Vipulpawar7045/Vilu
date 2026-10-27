import { describe, expect, it } from "vitest";

import {
  aggregateClusterScores,
  buildClusterSummary,
  chooseClusterTitle,
  matchCapabilityToCluster,
} from "@/domain/intelligence";

const baseSignal = {
  title: "Setup workflow is confusing",
  excerpt: "Users cannot finish the setup workflow without support.",
  observedAt: new Date("2026-10-27T12:00:00.000Z"),
  sourcePublishedAt: new Date("2026-10-26T12:00:00.000Z"),
  sourceUpdatedAt: null,
  sourceType: "review",
  sourceHost: "reviews.example",
  recencyScore: 5,
  specificityScore: 4,
  sourceReliabilityScore: 3,
  impactScore: 5,
  solutionFitScore: 4,
};

describe("issue intelligence", () => {
  it("aggregates first/latest dates and independent source identities", () => {
    const scores = aggregateClusterScores([
      baseSignal,
      {
        ...baseSignal,
        title: "Setup remains difficult",
        observedAt: new Date("2026-10-28T12:00:00.000Z"),
        sourceType: "github",
        sourceHost: "github.com",
        recencyScore: 4,
        sourceReliabilityScore: 4,
      },
    ]);
    expect(scores.firstSeenAt.toISOString()).toBe("2026-10-27T12:00:00.000Z");
    expect(scores.latestSeenAt.toISOString()).toBe("2026-10-28T12:00:00.000Z");
    expect(scores.independentSourceCount).toBe(2);
    expect(scores.corroborationScore).toBe(3);
    expect(scores.rankingScore).toBeGreaterThan(3);
  });

  it("does not inflate independent-source count for repeated copies", () => {
    const scores = aggregateClusterScores([
      baseSignal,
      { ...baseSignal, sourceHost: "reviews.example", sourceType: "review" },
      { ...baseSignal, sourceHost: "github.com", sourceType: "github" },
    ]);
    expect(scores.independentSourceCount).toBe(2);
    expect(scores.corroborationScore).toBe(3);
  });

  it("chooses a useful representative title and keeps the cluster neutral", () => {
    const title = chooseClusterTitle([
      { title: "Maybe something", recencyScore: 1, impactScore: 1 },
      { title: "Export fails for large workspaces", recencyScore: 5, impactScore: 5 },
    ]);
    expect(title).toBe("Export fails for large workspaces");
    expect(buildClusterSummary(title, 2, 2)).toContain("research lead, not proof");
  });

  it("matches only configured capability terms and leaves the result reviewable", () => {
    const match = matchCapabilityToCluster(
      {
        title: "Setup workflow is confusing",
        neutralSummary: "Users cannot finish onboarding.",
        solutionFitScore: 4,
      },
      {
        name: "Onboarding redesign",
        description: "Improve activation",
        category: "product-onboarding",
        keywords: "onboarding, setup, activation",
      },
    );
    expect(match.matchedTerms).toEqual(expect.arrayContaining(["setup", "onboarding"]));
    expect(match.fitScore).toBe(5);
    expect(match.rationale).toContain("configured capability terms");
  });
});
