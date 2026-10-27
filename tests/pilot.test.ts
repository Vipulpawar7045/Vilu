import { describe, expect, it } from "vitest";

import { summarizePilotEntries, validatePilotEntryInput, validatePilotInput } from "@/domain/pilot";

const completeEntry = {
  pilotId: "pilot-1",
  companyId: "company-1",
  sourceCategory: "documentation",
  issueCategory: "documentation",
  sourceUrl: "https://example.com/docs/setup",
  evidenceDate: new Date("2026-10-25T12:00:00.000Z"),
  observedAt: new Date("2026-10-26T12:00:00.000Z"),
  lastVerifiedAt: new Date("2026-10-27T12:00:00.000Z"),
  manuallyReviewed: true,
  impactScore: 4,
  evidenceScore: 5,
  solutionFitScore: 4,
  reachabilityScore: 3,
  proposedSolution: "Create a concise setup checklist with examples.",
  messageSentAt: new Date("2026-10-27T12:00:00.000Z"),
  replyStatus: "positive" as const,
  meetingAt: new Date("2026-10-28T12:00:00.000Z"),
  outcomeStatus: "meeting-booked" as const,
};

describe("pilot validation and analysis", () => {
  it("requires manual review and dated evidence before a sent message", () => {
    const result = validatePilotEntryInput({
      ...completeEntry,
      manuallyReviewed: false,
      evidenceDate: null,
      observedAt: null,
      lastVerifiedAt: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toMatchObject({
        manuallyReviewed: expect.any(String),
        evidenceDate: expect.any(String),
        observedAt: expect.any(String),
        lastVerifiedAt: expect.any(String),
      });
    }
  });

  it("calculates descriptive source and issue outcome comparisons", () => {
    const result = summarizePilotEntries(
      [
        completeEntry,
        {
          ...completeEntry,
          sourceCategory: "github",
          issueCategory: "product-gap",
          messageSentAt: new Date("2026-10-27T12:00:00.000Z"),
          replyStatus: "no-reply" as const,
          meetingAt: null,
          outcomeStatus: "no-response" as const,
        },
      ],
      { researchedCompanies: 2, targetCompanies: 25, targetMessages: 10 },
    );
    expect(result).toMatchObject({
      entries: 2,
      researchedCompanies: 2,
      sent: 2,
      replies: 1,
      meetings: 1,
      wins: 0,
    });
    expect(result.bySource).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "documentation",
          sent: 1,
          replies: 1,
          meetings: 1,
          replyRate: 100,
        }),
        expect.objectContaining({ label: "github", sent: 1, replies: 0, replyRate: 0 }),
      ]),
    );
    expect(result.byIssue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "documentation", entries: 1 }),
        expect.objectContaining({ label: "product-gap", entries: 1 }),
      ]),
    );
  });

  it("keeps the default pilot target focused and bounded", () => {
    expect(
      validatePilotInput({
        name: "SaaS pilot",
        niche: "Startup SaaS",
        targetCompanies: 25,
        targetMessages: 10,
      }).success,
    ).toBe(true);
    expect(
      validatePilotInput({
        name: "SaaS pilot",
        niche: "Startup SaaS",
        targetCompanies: 1001,
        targetMessages: 10,
      }).success,
    ).toBe(false);
  });
});
