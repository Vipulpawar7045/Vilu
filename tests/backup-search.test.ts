import { describe, expect, it } from "vitest";

import { validateBackup } from "@/lib/backup-service";

function emptyBackup(): {
  version: number;
  companies: Array<Record<string, unknown>>;
  sources: Array<Record<string, unknown>>;
  collectionCandidates: Array<Record<string, unknown>>;
  sourceChecks: Array<Record<string, unknown>>;
  issueSignals: Array<Record<string, unknown>>;
  issueClusters: Array<Record<string, unknown>>;
  issueClusterEvents: Array<Record<string, unknown>>;
  serviceCapabilities: Array<Record<string, unknown>>;
  solutionMatches: Array<Record<string, unknown>>;
  savedSearches: Array<Record<string, unknown>>;
  pilots: Array<Record<string, unknown>>;
  pilotEntries: Array<Record<string, unknown>>;
  evidence: Array<Record<string, unknown>>;
  opportunities: Array<Record<string, unknown>>;
  opportunityEvidence: Array<Record<string, unknown>>;
  contacts: Array<Record<string, unknown>>;
  outreach: Array<Record<string, unknown>>;
  aiDrafts: Array<Record<string, unknown>>;
  aiDraftEvidence: Array<Record<string, unknown>>;
} {
  return {
    version: 1,
    companies: [],
    sources: [],
    collectionCandidates: [],
    sourceChecks: [],
    issueSignals: [],
    issueClusters: [],
    issueClusterEvents: [],
    serviceCapabilities: [],
    solutionMatches: [],
    savedSearches: [],
    pilots: [],
    pilotEntries: [],
    evidence: [],
    opportunities: [],
    opportunityEvidence: [],
    contacts: [],
    outreach: [],
    aiDrafts: [],
    aiDraftEvidence: [],
  };
}

describe("backup validation", () => {
  it("previews a valid empty backup with collection counts", () => {
    expect(validateBackup(emptyBackup())).toEqual({
      valid: true,
      errors: [],
      summary: {
        companies: 0,
        sources: 0,
        collectionCandidates: 0,
        sourceChecks: 0,
        issueSignals: 0,
        issueClusters: 0,
        issueClusterEvents: 0,
        serviceCapabilities: 0,
        solutionMatches: 0,
        savedSearches: 0,
        pilots: 0,
        pilotEntries: 0,
        evidence: 0,
        opportunities: 0,
        opportunityEvidence: 0,
        contacts: 0,
        outreach: 0,
        aiDrafts: 0,
        aiDraftEvidence: 0,
      },
      data: emptyBackup(),
    });
  });

  it("accepts a Step 11 backup without collection candidates", () => {
    const legacy = emptyBackup();
    delete (legacy as Record<string, unknown>).collectionCandidates;
    delete (legacy as Record<string, unknown>).sourceChecks;
    const result = validateBackup(legacy);
    expect(result.valid).toBe(true);
    expect(result.summary.collectionCandidates).toBe(0);
    expect(result.summary.sourceChecks).toBe(0);
  });

  it("rejects backups with duplicate ids and broken relationships", () => {
    const backup = emptyBackup();
    backup.companies = [
      { id: "company-1", name: "Orbit", websiteUrl: "https://orbit.example" },
      { id: "company-1", name: "Duplicate", websiteUrl: "https://duplicate.example" },
    ];
    backup.sources = [
      { id: "source-1", companyId: "missing-company", url: "https://orbit.example/docs" },
    ];
    const result = validateBackup(backup);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "companies contains duplicate id company-1.",
        "Source source-1 references a missing company.",
      ]),
    );
  });

  it("accepts intelligence records and validates their relationships", () => {
    const backup = emptyBackup();
    backup.companies = [{ id: "company-1", name: "Orbit", websiteUrl: "https://orbit.example" }];
    backup.sources = [
      { id: "source-1", companyId: "company-1", url: "https://orbit.example/issues.xml" },
    ];
    backup.issueClusters = [{ id: "cluster-1", companyId: "company-1", groupKey: "group-1" }];
    backup.issueSignals = [
      { id: "signal-1", companyId: "company-1", sourceId: "source-1", clusterId: "cluster-1" },
    ];
    backup.issueClusterEvents = [{ id: "event-1", clusterId: "cluster-1", signalId: "signal-1" }];
    backup.serviceCapabilities = [
      { id: "capability-1", name: "Docs", description: "Documentation" },
    ];
    backup.solutionMatches = [
      { id: "match-1", clusterId: "cluster-1", capabilityId: "capability-1" },
    ];
    backup.savedSearches = [{ id: "search-1", name: "Recent", companyId: "company-1" }];
    expect(validateBackup(backup).valid).toBe(true);
  });
});
