import { describe, expect, it } from "vitest";

import { filterAndSortDashboardOpportunities } from "@/domain/dashboard";
import {
  calculatePriorityScore,
  canTransitionOpportunityStatus,
  evaluateOutreachEligibility,
  getConfidenceLevel,
  getEvidenceFreshness,
  getFreshnessLabel,
  getOpportunityFreshness,
  isValidHttpUrl,
  needsOpportunityVerification,
  normalizeWebsiteUrl,
  renderOutreachTemplate,
  validateContactRecordInput,
  validateOutreachRecordInput,
  validateCompanyRecordInput,
  validateCompanyInput,
  validateEvidenceInput,
  validateOpportunityRecordInput,
  validateOpportunityInput,
  validateOutreachInput,
  validateReverificationInput,
  validateSourceInput,
} from "@/domain/rules";

const referenceDate = new Date("2026-10-26T12:00:00.000Z");

function daysBefore(days: number): Date {
  return new Date(referenceDate.getTime() - days * 24 * 60 * 60 * 1000);
}

describe("Vilu domain rules", () => {
  describe("dashboard filters", () => {
    const opportunities = [
      {
        id: "hot-high",
        companyId: "company-a",
        companyName: "Alpha Orbit",
        title: "Current signup signal",
        hypothesis: "The current flow may be losing qualified intent.",
        category: "website-conversion",
        status: "verified",
        freshnessLabel: "Hot" as const,
        confidence: "High" as const,
        priorityScore: 4.2,
        lastVerifiedAt: new Date("2026-10-26T12:00:00.000Z"),
        updatedAt: new Date("2026-10-26T12:00:00.000Z"),
        needsVerification: false,
        evidenceCount: 2,
      },
      {
        id: "aging-low",
        companyId: "company-b",
        companyName: "Beta Cloud",
        title: "Older support signal",
        hypothesis: "The public support signal may indicate a service opportunity.",
        category: "customer-support",
        status: "needs-verification",
        freshnessLabel: "Aging" as const,
        confidence: "Low" as const,
        priorityScore: 4.8,
        lastVerifiedAt: null,
        updatedAt: new Date("2026-10-25T12:00:00.000Z"),
        needsVerification: true,
        evidenceCount: 1,
      },
    ];

    it("filters by status, company, freshness, confidence, and category", () => {
      expect(filterAndSortDashboardOpportunities(opportunities, { status: "active" })).toHaveLength(
        2,
      );
      expect(
        filterAndSortDashboardOpportunities(opportunities, { status: "needs-verification" }),
      ).toHaveLength(1);
      expect(
        filterAndSortDashboardOpportunities(opportunities, { companyId: "company-b" })[0]?.id,
      ).toBe("aging-low");
      expect(
        filterAndSortDashboardOpportunities(opportunities, {
          freshness: "Hot",
          confidence: "High",
        })[0]?.id,
      ).toBe("hot-high");
      expect(
        filterAndSortDashboardOpportunities(opportunities, { category: "customer-support" })[0]?.id,
      ).toBe("aging-low");
    });

    it("sorts by priority and confidence while keeping deterministic ties", () => {
      expect(
        filterAndSortDashboardOpportunities(opportunities, { sort: "priority" }).map(
          (item) => item.id,
        ),
      ).toEqual(["aging-low", "hot-high"]);
      expect(
        filterAndSortDashboardOpportunities(opportunities, { sort: "confidence" }).map(
          (item) => item.id,
        ),
      ).toEqual(["hot-high", "aging-low"]);
    });
  });

  describe("URL and input validation", () => {
    it("accepts normal HTTP and HTTPS URLs but rejects unsafe or malformed URLs", () => {
      expect(isValidHttpUrl("https://example.com/pricing")).toBe(true);
      expect(isValidHttpUrl("http://localhost:3000")).toBe(true);
      expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
      expect(isValidHttpUrl("https://user:password@example.com")).toBe(false);
      expect(isValidHttpUrl("not a url")).toBe(false);
    });

    it("normalizes valid company input and reports invalid fields", () => {
      expect(
        validateCompanyInput({
          name: "  Northstar Labs  ",
          websiteUrl: " https://northstar.example ",
        }),
      ).toEqual({
        success: true,
        data: {
          name: "Northstar Labs",
          websiteUrl: "https://northstar.example",
        },
      });

      const invalid = validateCompanyInput({ name: "A", websiteUrl: "ftp://bad.example" });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.errors).toMatchObject({
          name: expect.any(String),
          websiteUrl: expect.any(String),
        });
      }
    });

    it("normalizes company websites and validates the full company record", () => {
      expect(normalizeWebsiteUrl(" HTTPS://Example.com/research/?utm_source=test#notes ")).toBe(
        "https://example.com/research",
      );

      expect(
        validateCompanyRecordInput({
          name: "  Example Orbit ",
          websiteUrl: "https://example.com/",
          industry: " SaaS ",
          priority: 5,
          notes: " Useful research context ",
        }),
      ).toEqual({
        success: true,
        data: {
          name: "Example Orbit",
          websiteUrl: "https://example.com",
          industry: "SaaS",
          companyType: null,
          sizeEstimate: null,
          location: null,
          priority: 5,
          status: "active",
          notes: "Useful research context",
          lastResearchedAt: null,
        },
      });
    });

    it("requires evidence before an opportunity can be considered complete", () => {
      const evidence = validateEvidenceInput({
        companyId: "company-1",
        sourceId: "source-1",
        excerpt: "A useful public observation.",
        snapshotHash: "snapshot-123",
        confidence: 4,
      });
      expect(evidence.success).toBe(true);

      const opportunity = validateOpportunityInput({
        companyId: "company-1",
        title: "  Documentation gap  ",
        category: "documentation",
        hypothesis: "Users may need support to complete this workflow.",
        evidenceCount: 0,
      });
      expect(opportunity.success).toBe(true);

      const missingEvidence = validateEvidenceInput({
        companyId: "company-1",
        sourceId: "source-1",
        excerpt: "short",
        snapshotHash: "short",
      });
      expect(missingEvidence.success).toBe(false);
    });

    it("validates dated sources and evidence metadata", () => {
      const source = validateSourceInput({
        companyId: "company-1",
        url: " https://example.com/docs/setup?version=2 ",
        sourceType: "documentation",
        title: "Setup guide",
        publishedAt: new Date("2026-10-20T12:00:00.000Z"),
        lastCheckedAt: new Date("2026-10-26T12:00:00.000Z"),
        accessibilityStatus: "inaccessible",
      });

      expect(source).toMatchObject({
        success: true,
        data: {
          companyId: "company-1",
          url: "https://example.com/docs/setup?version=2",
          sourceType: "documentation",
          accessibilityStatus: "inaccessible",
        },
      });

      const invalid = validateSourceInput({
        companyId: "company-1",
        url: "not-a-url",
        sourceType: "",
        title: "x".repeat(201),
        publishedAt: new Date("invalid"),
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.errors).toMatchObject({
          url: expect.any(String),
          sourceType: expect.any(String),
          title: expect.any(String),
          publishedAt: expect.any(String),
        });
      }

      const evidence = validateEvidenceInput({
        companyId: "company-1",
        sourceId: "source-1",
        excerpt: "A dated observation from a public setup guide.",
        observedAt: new Date("2026-10-26T12:00:00.000Z"),
        lastVerifiedAt: null,
        snapshotPath: "notes/setup.png",
        notes: "Re-check if the documentation becomes accessible again.",
      });
      expect(evidence.success).toBe(true);
    });

    it("validates re-verification notes", () => {
      expect(
        validateReverificationInput({ note: "  Checked the live setup flow again.  " }),
      ).toEqual({
        success: true,
        data: { note: "Checked the live setup flow again.", verifiedAt: null },
      });

      const invalid = validateReverificationInput({ note: "no" });
      expect(invalid).toEqual({
        success: false,
        errors: { note: "Add a short note describing what you re-verified." },
      });
    });

    it("keeps opportunity wording hypothetical unless confirmation is recorded", () => {
      const unsupported = validateOpportunityRecordInput({
        companyId: "company-1",
        title: "Confirmed failure in signup",
        category: "website-conversion",
        hypothesis: "The company failed to provide a usable signup experience.",
        evidenceIds: ["evidence-1"],
        impactScore: 4,
        evidenceScore: 4,
        solutionFitScore: 3,
        reachabilityScore: 3,
      });
      expect(unsupported.success).toBe(false);
      if (!unsupported.success) {
        expect(unsupported.errors.hypothesis).toContain("hypothesis wording");
      }

      const valid = validateOpportunityRecordInput({
        companyId: "company-1",
        title: "Signup clarity opportunity",
        category: "website-conversion",
        hypothesis: "The public signup flow may be losing qualified intent.",
        evidenceIds: ["evidence-1", "evidence-2"],
        impactScore: 4,
        evidenceScore: 5,
        solutionFitScore: 3,
        reachabilityScore: 2,
        suggestedSolution: "Review the signup hierarchy and clarify the primary action.",
        status: "new",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects incomplete outreach drafts", () => {
      const result = validateOutreachInput({
        opportunityId: "opportunity-1",
        contactId: "contact-1",
        channel: "email",
        draftMessage: "too short",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.draftMessage).toBeDefined();
      }
    });

    it("validates contacts and blocks malformed outreach records", () => {
      expect(
        validateContactRecordInput({
          companyId: "company-1",
          name: " Maya Chen ",
          role: "Head of Growth",
          profileUrl: "https://example.com/maya",
          doNotContact: true,
        }),
      ).toMatchObject({
        success: true,
        data: { name: "Maya Chen", doNotContact: true },
      });

      const invalid = validateOutreachRecordInput({
        opportunityId: "opportunity-1",
        contactId: "contact-1",
        channel: "carrier-pigeon",
        draftMessage: "too short",
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.errors).toMatchObject({
          channel: expect.any(String),
          draftMessage: expect.any(String),
        });
      }
    });

    it("renders outreach variables and reports missing values", () => {
      expect(
        renderOutreachTemplate("Hi {{contact}} at {{company}} — {{unknown}}", {
          contact: "Maya",
          company: "Northstar Labs",
        }),
      ).toEqual({
        message: "Hi Maya at Northstar Labs — {{unknown}}",
        missingVariables: [],
      });

      expect(
        renderOutreachTemplate("{{company}} · {{solution}}", { company: "Northstar Labs" }),
      ).toEqual({
        message: "Northstar Labs · {{solution}}",
        missingVariables: ["solution"],
      });
    });
  });

  describe("freshness", () => {
    it.each([
      [0, "Hot"],
      [7, "Hot"],
      [8, "Recent"],
      [30, "Recent"],
      [31, "Aging"],
      [90, "Aging"],
      [91, "Historical"],
    ] as const)("labels evidence %s days old as %s", (age, expected) => {
      expect(getFreshnessLabel(daysBefore(age), referenceDate)).toBe(expected);
    });

    it("labels missing or invalid dates as Undated", () => {
      expect(getFreshnessLabel(null, referenceDate)).toBe("Undated");
      expect(getFreshnessLabel(undefined, referenceDate)).toBe("Undated");
      expect(getFreshnessLabel(new Date("invalid"), referenceDate)).toBe("Undated");
    });

    it("uses the latest evidence date for freshness", () => {
      expect(
        getEvidenceFreshness(
          {
            sourcePublishedAt: daysBefore(120),
            observedAt: daysBefore(60),
            lastVerifiedAt: daysBefore(5),
          },
          referenceDate,
        ),
      ).toBe("Hot");
    });

    it("uses the newest evidence or manual verification date for an opportunity", () => {
      expect(
        getOpportunityFreshness(
          {
            opportunityLastVerifiedAt: null,
            evidenceDates: [
              {
                sourcePublishedAt: daysBefore(120),
                sourceLastCheckedAt: daysBefore(45),
                observedAt: daysBefore(40),
              },
            ],
          },
          referenceDate,
        ),
      ).toBe("Aging");

      expect(
        getOpportunityFreshness(
          {
            opportunityLastVerifiedAt: daysBefore(2),
            evidenceDates: [{ sourcePublishedAt: daysBefore(120) }],
          },
          referenceDate,
        ),
      ).toBe("Hot");
    });

    it("flags stale, explicitly flagged, and inaccessible opportunities", () => {
      expect(
        needsOpportunityVerification({
          freshnessLabel: "Aging",
          status: "verified",
          allSourcesAccessible: true,
        }),
      ).toBe(true);
      expect(
        needsOpportunityVerification({
          freshnessLabel: "Hot",
          status: "needs-verification",
          allSourcesAccessible: true,
        }),
      ).toBe(true);
      expect(
        needsOpportunityVerification({
          freshnessLabel: "Hot",
          status: "verified",
          allSourcesAccessible: false,
        }),
      ).toBe(true);
      expect(
        needsOpportunityVerification({
          freshnessLabel: "Hot",
          status: "verified",
          allSourcesAccessible: true,
        }),
      ).toBe(false);
    });
  });

  describe("scores and confidence", () => {
    it("calculates and rounds the documented priority score", () => {
      expect(
        calculatePriorityScore({ impact: 4, evidence: 4, solutionFit: 5, reachability: 4 }),
      ).toBe(4.2);
      expect(() =>
        calculatePriorityScore({ impact: 0, evidence: 4, solutionFit: 5, reachability: 4 }),
      ).toThrow();
    });

    it("assigns confidence based on recency, evidence, and manual verification", () => {
      expect(
        getConfidenceLevel({
          evidenceCount: 2,
          independentSourceCount: 2,
          hasRecentEvidence: true,
          manuallyVerified: true,
        }),
      ).toBe("High");
      expect(
        getConfidenceLevel({
          evidenceCount: 1,
          independentSourceCount: 1,
          hasRecentEvidence: true,
          manuallyVerified: false,
        }),
      ).toBe("Medium");
      expect(
        getConfidenceLevel({
          evidenceCount: 1,
          independentSourceCount: 1,
          hasRecentEvidence: false,
          manuallyVerified: false,
        }),
      ).toBe("Low");
    });
  });

  describe("status transitions and outreach eligibility", () => {
    it("allows the intended forward workflow and rejects invalid jumps", () => {
      expect(canTransitionOpportunityStatus("new", "researching")).toBe(true);
      expect(canTransitionOpportunityStatus("solution-ready", "ready-for-outreach")).toBe(true);
      expect(canTransitionOpportunityStatus("ready-for-outreach", "contacted")).toBe(true);
      expect(canTransitionOpportunityStatus("new", "won")).toBe(false);
      expect(canTransitionOpportunityStatus("archived", "researching")).toBe(false);
    });

    it("blocks stale, unresolved, or unreviewed opportunities", () => {
      const baseInput = {
        status: "solution-ready" as const,
        evidenceCount: 1,
        suggestedSolution: "Improve the onboarding flow.",
        lastVerifiedAt: daysBefore(5),
        allSourcesAccessible: true,
        manuallyReviewed: true,
        hasContact: true,
        referenceDate,
      };

      expect(evaluateOutreachEligibility(baseInput)).toEqual({ eligible: true, reasons: [] });

      const stale = evaluateOutreachEligibility({ ...baseInput, lastVerifiedAt: daysBefore(31) });
      expect(stale.eligible).toBe(false);
      expect(stale.reasons).toContain("Evidence is 31–90 days old and must be re-verified.");

      const unresolved = evaluateOutreachEligibility({
        ...baseInput,
        resolvedAt: daysBefore(1),
        contactDoNotContact: true,
      });
      expect(unresolved.eligible).toBe(false);
      expect(unresolved.reasons).toContain("Resolved opportunities cannot be sent for outreach.");
      expect(unresolved.reasons).toContain("This contact is marked do not contact.");
    });

    it("allows a manually re-verified opportunity to become eligible", () => {
      const result = evaluateOutreachEligibility({
        status: "solution-ready",
        evidenceCount: 2,
        suggestedSolution: "Improve the public documentation flow.",
        lastVerifiedAt: daysBefore(2),
        allSourcesAccessible: true,
        manuallyReviewed: true,
        hasContact: true,
        referenceDate,
      });

      expect(result.eligible).toBe(true);
    });
  });
});
