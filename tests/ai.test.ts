import { afterEach, describe, expect, it } from "vitest";

import {
  AiProviderError,
  buildAiPromptContext,
  getAiProvider,
  runAiProvider,
} from "@/lib/ai-service";

const originalProvider = process.env.AI_PROVIDER;

afterEach(() => {
  if (originalProvider === undefined) delete process.env.AI_PROVIDER;
  else process.env.AI_PROVIDER = originalProvider;
});

describe("provider-neutral AI drafts", () => {
  it("builds context with evidence excerpts and all source dates", () => {
    const context = buildAiPromptContext({
      kind: "summary",
      companyName: "Fictional Orbit",
      opportunityTitle: "Documentation clarity",
      hypothesis: "The setup guide may leave a key workflow unclear.",
      suggestedSolution: "Add a short workflow checklist.",
      evidence: [
        {
          id: "evidence-1",
          excerpt: "The setup page omits the first workspace step.",
          sourceTitle: "Setup guide",
          sourceUrl: "https://orbit.example/docs/setup",
          sourcePublishedAt: new Date("2026-10-20T12:00:00.000Z"),
          sourceUpdatedAt: new Date("2026-10-21T12:00:00.000Z"),
          observedAt: new Date("2026-10-26T12:00:00.000Z"),
          lastVerifiedAt: new Date("2026-10-27T12:00:00.000Z"),
        },
      ],
    });
    expect(context).toContain("The setup page omits the first workspace step.");
    expect(context).toContain("Published: 2026-10-20T12:00:00.000Z");
    expect(context).toContain("Source updated: 2026-10-21T12:00:00.000Z");
    expect(context).toContain("Observed: 2026-10-26T12:00:00.000Z");
    expect(context).toContain("Verified: 2026-10-27T12:00:00.000Z");
    expect(context).toContain("Do not send a message or change any database status.");
  });

  it("uses the offline provider and keeps the result in review language", async () => {
    process.env.AI_PROVIDER = "local";
    const result = await runAiProvider(getAiProvider(), {
      kind: "outreach",
      promptContext: "Company: Fictional Orbit\nEvidence context:\n1. A public observation.",
    });
    expect(result.text).toContain("needs review");
    expect(result.text).toContain("does not send it automatically");
    expect(result.model).toBe("review-draft-v1");
  });

  it("classifies malformed, timed-out, rate-limited, and unavailable providers", async () => {
    await expect(
      runAiProvider(
        { name: "malformed", generate: async () => ({ answer: "wrong shape" }) },
        { kind: "summary", promptContext: "" },
      ),
    ).rejects.toMatchObject({ code: "malformed" });
    await expect(
      runAiProvider(
        { name: "slow", generate: () => new Promise(() => undefined) },
        { kind: "summary", promptContext: "" },
        5,
      ),
    ).rejects.toMatchObject({ code: "timeout" });
    await expect(
      runAiProvider(
        {
          name: "limited",
          generate: async () => {
            throw new AiProviderError("Too many requests.", "rate-limited");
          },
        },
        { kind: "summary", promptContext: "" },
      ),
    ).rejects.toMatchObject({ code: "rate-limited" });
    process.env.AI_PROVIDER = "missing-provider";
    expect(() => getAiProvider()).toThrowError(/not configured/);
  });
});
