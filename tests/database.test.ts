import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, afterEach, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "file:./test.db";

const prisma = new PrismaClient();

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      resolve(process.cwd(), "node_modules/prisma/build/index.js"),
      "db",
      "push",
      "--force-reset",
      "--skip-generate",
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: "file:./test.db" },
      stdio: "pipe",
    },
  );
}, 30_000);

afterEach(async () => {
  await prisma.outreach.deleteMany();
  await prisma.sourceCheck.deleteMany();
  await prisma.opportunityEvidence.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.source.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Vilu database foundation", () => {
  it("persists a company research workflow across related records", async () => {
    const company = await prisma.company.create({
      data: {
        name: "Test Orbit",
        websiteUrl: "https://test-orbit.example",
        industry: "SaaS",
        companyType: "Startup",
      },
    });

    const source = await prisma.source.create({
      data: {
        companyId: company.id,
        url: "https://test-orbit.example/docs",
        sourceType: "documentation",
        title: "Test Orbit docs",
      },
    });

    const evidence = await prisma.evidence.create({
      data: {
        companyId: company.id,
        sourceId: source.id,
        excerpt: "The setup guide does not explain how to rotate an API key.",
        snapshotHash: "test-orbit-docs-rotation-gap",
        confidence: 3,
      },
    });

    await prisma.evidence.create({
      data: {
        sourceId: source.id,
        companyId: company.id,
        excerpt: "A second observation confirms the same documentation gap.",
        snapshotHash: "test-orbit-docs-second-observation",
        observedAt: new Date("2026-10-25T12:00:00.000Z"),
        confidence: 4,
      },
    });

    const opportunity = await prisma.opportunity.create({
      data: {
        companyId: company.id,
        title: "API key rotation documentation gap",
        category: "documentation",
        hypothesis: "New users may need support to complete a routine key rotation workflow.",
        freshnessLabel: "Recent",
        status: "verified",
      },
    });

    await prisma.opportunityEvidence.create({
      data: {
        opportunityId: opportunity.id,
        evidenceId: evidence.id,
      },
    });

    const contact = await prisma.contact.create({
      data: {
        companyId: company.id,
        name: "Jordan Lee",
        role: "Head of Product",
        contactMethod: "email",
      },
    });

    await prisma.outreach.create({
      data: {
        opportunityId: opportunity.id,
        contactId: contact.id,
        channel: "email",
        draftMessage: "I noticed a possible documentation improvement opportunity.",
      },
    });

    const saved = await prisma.company.findUnique({
      where: { id: company.id },
      include: {
        sources: { include: { evidence: true } },
        evidence: { include: { opportunityLinks: true } },
        opportunities: { include: { outreach: true, evidenceLinks: true } },
        contacts: { include: { outreach: true } },
      },
    });

    expect(saved?.sources).toHaveLength(1);
    expect(saved?.sources[0]?.evidence).toHaveLength(2);
    expect(saved?.evidence).toHaveLength(2);
    expect(saved?.evidence.some((record) => record.opportunityLinks.length === 1)).toBe(true);
    expect(saved?.opportunities[0]?.evidenceLinks).toHaveLength(1);
    expect(saved?.opportunities[0]?.outreach).toHaveLength(1);
    expect(saved?.contacts[0]?.outreach).toHaveLength(1);
  });

  it("enforces unique company websites and source URLs per company", async () => {
    const company = await prisma.company.create({
      data: {
        name: "Unique Orbit",
        websiteUrl: "https://unique-orbit.example",
      },
    });

    await prisma.source.create({
      data: {
        companyId: company.id,
        url: "https://unique-orbit.example/pricing",
        sourceType: "website",
      },
    });

    await expect(
      prisma.source.create({
        data: {
          companyId: company.id,
          url: "https://unique-orbit.example/pricing",
          sourceType: "website",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("archives a company without deleting its research relationships", async () => {
    const company = await prisma.company.create({
      data: {
        name: "Archive Orbit",
        websiteUrl: "https://archive-orbit.example",
      },
    });

    await prisma.source.create({
      data: {
        companyId: company.id,
        url: "https://archive-orbit.example/docs",
        sourceType: "documentation",
      },
    });

    await prisma.company.update({
      where: { id: company.id },
      data: { status: "archived" },
    });

    const archived = await prisma.company.findUnique({
      where: { id: company.id },
      include: { sources: true },
    });

    expect(archived?.status).toBe("archived");
    expect(archived?.sources).toHaveLength(1);
  });

  it("refreshes an opportunity without rewriting its original source dates", async () => {
    const company = await prisma.company.create({
      data: {
        name: "Freshness Orbit",
        websiteUrl: "https://freshness-orbit.example",
      },
    });
    const sourcePublishedAt = new Date("2026-06-01T12:00:00.000Z");
    const source = await prisma.source.create({
      data: {
        companyId: company.id,
        url: "https://freshness-orbit.example/status",
        sourceType: "status",
        publishedAt: sourcePublishedAt,
        accessibilityStatus: "accessible",
      },
    });
    const evidence = await prisma.evidence.create({
      data: {
        companyId: company.id,
        sourceId: source.id,
        excerpt: "The status page shows a recurring incident pattern.",
        snapshotHash: "freshness-orbit-status-incident",
        observedAt: new Date("2026-06-02T12:00:00.000Z"),
      },
    });
    const opportunity = await prisma.opportunity.create({
      data: {
        companyId: company.id,
        title: "Recurring status incident pattern",
        category: "reliability",
        hypothesis:
          "The public incident pattern may indicate an opportunity to improve reliability communication.",
        freshnessLabel: "Historical",
        status: "needs-verification",
        lastVerifiedAt: new Date("2026-06-02T12:00:00.000Z"),
      },
    });
    await prisma.opportunityEvidence.create({
      data: { opportunityId: opportunity.id, evidenceId: evidence.id },
    });

    const verifiedAt = new Date("2026-10-26T12:00:00.000Z");
    await prisma.opportunity.update({
      where: { id: opportunity.id },
      data: {
        status: "researching",
        lastVerifiedAt: verifiedAt,
        verificationNotes: "The current status page still shows the same pattern.",
        freshnessLabel: "Hot",
      },
    });

    const saved = await prisma.opportunity.findUnique({
      where: { id: opportunity.id },
      include: { evidenceLinks: { include: { evidence: { include: { source: true } } } } },
    });
    expect(saved?.freshnessLabel).toBe("Hot");
    expect(saved?.verificationNotes).toContain("current status page");
    expect(saved?.evidenceLinks[0]?.evidence.source.publishedAt).toEqual(sourcePublishedAt);
  });

  it("records monitoring history, deduplicates alerts, downgrades opportunities, and preserves evidence", async () => {
    const { runMonitoring } = await import("@/lib/monitoring-service");
    const company = await prisma.company.create({
      data: {
        name: "Monitor Orbit",
        websiteUrl: "https://monitor-orbit.example",
        priority: 5,
      },
    });
    const source = await prisma.source.create({
      data: {
        companyId: company.id,
        url: "https://monitor-orbit.example/pricing",
        sourceType: "pricing",
        title: "Monitor Orbit pricing",
      },
    });
    const evidence = await prisma.evidence.create({
      data: {
        companyId: company.id,
        sourceId: source.id,
        excerpt: "The pricing page describes the current plans.",
        snapshotHash: "monitor-orbit-pricing-evidence",
        observedAt: new Date("2026-10-26T12:00:00.000Z"),
      },
    });
    const opportunity = await prisma.opportunity.create({
      data: {
        companyId: company.id,
        title: "Pricing clarity opportunity",
        category: "website-conversion",
        hypothesis: "The pricing page may benefit from clearer plan comparison guidance.",
        status: "verified",
        freshnessLabel: "Recent",
      },
    });
    await prisma.opportunityEvidence.create({
      data: { opportunityId: opportunity.id, evidenceId: evidence.id },
    });

    const pageResult = (contentHash: string | null, responseStatus = 200) => ({
      ok: responseStatus >= 200 && responseStatus < 300,
      finalUrl: source.url,
      responseStatus,
      normalizedText: contentHash ? `Snapshot ${contentHash}` : null,
      contentHash,
      errorMessage: responseStatus === 200 ? null : `The page returned HTTP ${responseStatus}.`,
      blockedByRobots: false,
    });

    const firstRun = await runMonitoring({
      referenceDate: new Date("2026-10-27T12:00:00.000Z"),
      checkSource: async () => pageResult("hash-1"),
    });
    expect(firstRun.alertCount).toBe(0);

    const changedRun = await runMonitoring({
      referenceDate: new Date("2026-10-28T12:00:00.000Z"),
      checkSource: async () => pageResult("hash-2"),
    });
    expect(changedRun.results[0]?.resultStatus).toBe("changed");
    expect(changedRun.alertCount).toBe(1);
    expect(changedRun.downgradedCount).toBe(1);

    const changedOpportunity = await prisma.opportunity.findUnique({
      where: { id: opportunity.id },
    });
    expect(changedOpportunity?.status).toBe("needs-verification");
    expect(changedOpportunity?.hypothesis).toBe(opportunity.hypothesis);

    const duplicateRun = await runMonitoring({
      referenceDate: new Date("2026-10-29T12:00:00.000Z"),
      checkSource: async () => pageResult("hash-2"),
    });
    expect(duplicateRun.results[0]?.duplicateAlert).toBe(true);
    expect(duplicateRun.results[0]?.reviewStatus).toBe("not-needed");
    expect(duplicateRun.alertCount).toBe(0);
    expect(
      await prisma.sourceCheck.count({ where: { sourceId: source.id, reviewStatus: "pending" } }),
    ).toBe(1);

    const missingRun = await runMonitoring({
      referenceDate: new Date("2026-10-30T12:00:00.000Z"),
      checkSource: async () => pageResult(null, 404),
    });
    expect(missingRun.results[0]?.resultStatus).toBe("missing");
    expect(await prisma.evidence.count({ where: { id: evidence.id } })).toBe(1);
  });
});
