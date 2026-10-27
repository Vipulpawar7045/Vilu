import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const seedDates = {
  sourcePublishedAt: new Date("2026-10-20T12:00:00.000Z"),
  observedAt: new Date("2026-10-23T12:00:00.000Z"),
  lastVerifiedAt: new Date("2026-10-24T12:00:00.000Z"),
};

async function main() {
  const northstar = await prisma.company.upsert({
    where: { websiteUrl: "https://northstar-labs.example" },
    update: {
      name: "Northstar Labs",
      industry: "SaaS",
      companyType: "Startup",
      sizeEstimate: "11–50",
      location: "Austin, TX",
      priority: 5,
      status: "active",
      lastResearchedAt: seedDates.lastVerifiedAt,
    },
    create: {
      name: "Northstar Labs",
      websiteUrl: "https://northstar-labs.example",
      industry: "SaaS",
      companyType: "Startup",
      sizeEstimate: "11–50",
      location: "Austin, TX",
      priority: 5,
      lastResearchedAt: seedDates.lastVerifiedAt,
      notes: "Fictional seed company for local development.",
    },
  });

  const source = await prisma.source.upsert({
    where: {
      companyId_url: {
        companyId: northstar.id,
        url: "https://northstar-labs.example/pricing",
      },
    },
    update: {
      title: "Northstar Labs pricing page",
      sourceType: "website",
      publishedAt: seedDates.sourcePublishedAt,
      lastCheckedAt: seedDates.lastVerifiedAt,
      accessibilityStatus: "accessible",
    },
    create: {
      companyId: northstar.id,
      url: "https://northstar-labs.example/pricing",
      title: "Northstar Labs pricing page",
      sourceType: "website",
      publishedAt: seedDates.sourcePublishedAt,
      lastCheckedAt: seedDates.lastVerifiedAt,
    },
  });

  const evidence = await prisma.evidence.upsert({
    where: { snapshotHash: "seed-northstar-pricing-2026-10-24" },
    update: {
      excerpt:
        "The mobile pricing flow requires horizontal scrolling before the primary signup action is visible.",
      observedAt: seedDates.observedAt,
      lastVerifiedAt: seedDates.lastVerifiedAt,
      confidence: 4,
    },
    create: {
      sourceId: source.id,
      companyId: northstar.id,
      excerpt:
        "The mobile pricing flow requires horizontal scrolling before the primary signup action is visible.",
      observedAt: seedDates.observedAt,
      lastVerifiedAt: seedDates.lastVerifiedAt,
      snapshotHash: "seed-northstar-pricing-2026-10-24",
      confidence: 4,
      notes: "Fictional evidence for local development and tests.",
    },
  });

  const opportunity = await prisma.opportunity.upsert({
    where: {
      companyId_title: {
        companyId: northstar.id,
        title: "Mobile pricing signup friction",
      },
    },
    update: {
      hypothesis:
        "The mobile pricing experience may be losing qualified signup intent before the main action is visible.",
      suggestedSolution:
        "Redesign the mobile pricing hierarchy and move the primary signup action above the fold.",
      impactDescription:
        "Potentially improve mobile conversion and reduce abandoned pricing visits.",
      impactScore: 4,
      evidenceScore: 4,
      solutionFitScore: 5,
      reachabilityScore: 4,
      priorityScore: 4.2,
      freshnessLabel: "Hot",
      status: "verified",
      lastVerifiedAt: seedDates.lastVerifiedAt,
    },
    create: {
      companyId: northstar.id,
      title: "Mobile pricing signup friction",
      category: "website-conversion",
      hypothesis:
        "The mobile pricing experience may be losing qualified signup intent before the main action is visible.",
      suggestedSolution:
        "Redesign the mobile pricing hierarchy and move the primary signup action above the fold.",
      impactDescription:
        "Potentially improve mobile conversion and reduce abandoned pricing visits.",
      expectedOutcome: "A shorter path from pricing evaluation to signup.",
      impactScore: 4,
      evidenceScore: 4,
      solutionFitScore: 5,
      reachabilityScore: 4,
      priorityScore: 4.2,
      freshnessLabel: "Hot",
      status: "verified",
      lastVerifiedAt: seedDates.lastVerifiedAt,
    },
  });

  await prisma.opportunityEvidence.upsert({
    where: {
      opportunityId_evidenceId: {
        opportunityId: opportunity.id,
        evidenceId: evidence.id,
      },
    },
    update: {},
    create: {
      opportunityId: opportunity.id,
      evidenceId: evidence.id,
    },
  });

  const contact = await prisma.contact.findFirst({
    where: { companyId: northstar.id, name: "Maya Chen" },
  });

  const savedContact =
    contact ??
    (await prisma.contact.create({
      data: {
        companyId: northstar.id,
        name: "Maya Chen",
        role: "Head of Growth",
        profileUrl: "https://northstar-labs.example/team/maya-chen",
        contactMethod: "LinkedIn",
        relevanceNotes: "Fictional contact for local development.",
      },
    }));

  const existingOutreach = await prisma.outreach.findFirst({
    where: { opportunityId: opportunity.id, contactId: savedContact.id },
  });

  if (!existingOutreach) {
    await prisma.outreach.create({
      data: {
        opportunityId: opportunity.id,
        contactId: savedContact.id,
        channel: "LinkedIn",
        draftMessage:
          "Hi Maya — I noticed a possible mobile pricing improvement opportunity at Northstar Labs and prepared a short idea to share.",
        followUpAt: new Date("2026-10-28T14:30:00.000Z"),
        status: "draft",
      },
    });
  }

  console.log("Vilu database seeded with fictional research data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
