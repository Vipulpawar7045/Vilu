import { prisma } from "@/lib/prisma";

export async function buildBackup() {
  const [
    companies,
    sources,
    collectionCandidates,
    sourceChecks,
    issueSignals,
    issueClusters,
    issueClusterEvents,
    serviceCapabilities,
    solutionMatches,
    savedSearches,
    pilots,
    pilotEntries,
    evidence,
    opportunities,
    opportunityEvidence,
    contacts,
    outreach,
    aiDrafts,
    aiDraftEvidence,
  ] = await Promise.all([
    prisma.company.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.source.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.collectionCandidate.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.sourceCheck.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.issueSignal.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.issueCluster.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.issueClusterEvent.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.serviceCapability.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.solutionMatch.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.savedSearch.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.pilot.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.pilotEntry.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.evidence.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.opportunity.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.opportunityEvidence.findMany({ orderBy: { linkedAt: "asc" } }),
    prisma.contact.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.outreach.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.aiDraft.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.aiDraftEvidence.findMany({ orderBy: { draftId: "asc" } }),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    companies,
    sources,
    collectionCandidates,
    sourceChecks,
    issueSignals,
    issueClusters,
    issueClusterEvents,
    serviceCapabilities,
    solutionMatches,
    savedSearches,
    pilots,
    pilotEntries,
    evidence,
    opportunities,
    opportunityEvidence,
    contacts,
    outreach,
    aiDrafts,
    aiDraftEvidence,
  };
}

export async function buildCsv(type: "companies" | "opportunities" | "outreach" | "pilot") {
  if (type === "companies") {
    const rows = await prisma.company.findMany({ orderBy: { name: "asc" } });
    return csv(
      [
        "id",
        "name",
        "websiteUrl",
        "industry",
        "companyType",
        "sizeEstimate",
        "location",
        "priority",
        "status",
        "lastResearchedAt",
        "createdAt",
        "updatedAt",
      ],
      rows.map((row) => [
        row.id,
        row.name,
        row.websiteUrl,
        row.industry,
        row.companyType,
        row.sizeEstimate,
        row.location,
        row.priority,
        row.status,
        row.lastResearchedAt,
        row.createdAt,
        row.updatedAt,
      ]),
    );
  }
  if (type === "opportunities") {
    const rows = await prisma.opportunity.findMany({
      include: { company: { select: { name: true } }, evidenceLinks: true },
      orderBy: { priorityScore: "desc" },
    });
    return csv(
      [
        "id",
        "company",
        "title",
        "category",
        "hypothesis",
        "suggestedSolution",
        "impactScore",
        "evidenceScore",
        "solutionFitScore",
        "reachabilityScore",
        "priorityScore",
        "freshnessLabel",
        "status",
        "evidenceCount",
        "lastVerifiedAt",
        "resolvedAt",
        "createdAt",
        "updatedAt",
      ],
      rows.map((row) => [
        row.id,
        row.company.name,
        row.title,
        row.category,
        row.hypothesis,
        row.suggestedSolution,
        row.impactScore,
        row.evidenceScore,
        row.solutionFitScore,
        row.reachabilityScore,
        row.priorityScore,
        row.freshnessLabel,
        row.status,
        row.evidenceLinks.length,
        row.lastVerifiedAt,
        row.resolvedAt,
        row.createdAt,
        row.updatedAt,
      ]),
    );
  }
  if (type === "pilot") {
    const rows = await prisma.pilotEntry.findMany({
      include: {
        pilot: { select: { name: true } },
        company: { select: { name: true } },
        opportunity: { select: { title: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return csv(
      [
        "id",
        "pilot",
        "company",
        "opportunity",
        "sourceCategory",
        "issueCategory",
        "issueCluster",
        "sourceUrl",
        "evidenceDate",
        "observedAt",
        "lastVerifiedAt",
        "manuallyReviewed",
        "impactScore",
        "evidenceScore",
        "solutionFitScore",
        "reachabilityScore",
        "priorityScore",
        "proposedSolution",
        "messageSentAt",
        "replyStatus",
        "replySummary",
        "objection",
        "meetingAt",
        "outcomeStatus",
        "outcomeNotes",
      ],
      rows.map((row) => [
        row.id,
        row.pilot.name,
        row.company.name,
        row.opportunity?.title,
        row.sourceCategory,
        row.issueCategory,
        row.issueCluster,
        row.sourceUrl,
        row.evidenceDate,
        row.observedAt,
        row.lastVerifiedAt,
        row.manuallyReviewed,
        row.impactScore,
        row.evidenceScore,
        row.solutionFitScore,
        row.reachabilityScore,
        row.priorityScore,
        row.proposedSolution,
        row.messageSentAt,
        row.replyStatus,
        row.replySummary,
        row.objection,
        row.meetingAt,
        row.outcomeStatus,
        row.outcomeNotes,
      ]),
    );
  }
  const rows = await prisma.outreach.findMany({
    include: {
      contact: { select: { name: true } },
      opportunity: { include: { company: { select: { name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return csv(
    [
      "id",
      "company",
      "opportunity",
      "contact",
      "channel",
      "status",
      "draftMessage",
      "sentAt",
      "followUpAt",
      "responseSummary",
      "nextAction",
      "createdAt",
      "updatedAt",
    ],
    rows.map((row) => [
      row.id,
      row.opportunity.company.name,
      row.opportunity.title,
      row.contact.name,
      row.channel,
      row.status,
      row.draftMessage,
      row.sentAt,
      row.followUpAt,
      row.responseSummary,
      row.nextAction,
      row.createdAt,
      row.updatedAt,
    ]),
  );
}

export async function buildOpportunityMarkdown(id: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      company: true,
      evidenceLinks: { include: { evidence: { include: { source: true } } } },
      outreach: { include: { contact: true } },
    },
  });
  if (!opportunity) return null;
  const lines = [
    `# ${opportunity.title}`,
    "",
    `**Company:** ${opportunity.company.name}`,
    `**Website:** ${opportunity.company.websiteUrl}`,
    `**Category:** ${opportunity.category}`,
    `**Status:** ${opportunity.status}`,
    `**Freshness:** ${opportunity.freshnessLabel}`,
    `**Priority:** ${opportunity.priorityScore}`,
    `**Scores:** impact ${opportunity.impactScore}/5 · evidence ${opportunity.evidenceScore}/5 · solution fit ${opportunity.solutionFitScore}/5 · reachability ${opportunity.reachabilityScore}/5`,
    `**Last verified:** ${formatDate(opportunity.lastVerifiedAt)}`,
    "",
    "## Hypothesis",
    opportunity.hypothesis,
    "",
    "## Possible impact",
    opportunity.impactDescription || "Not recorded.",
    "",
    "## Suggested solution",
    opportunity.suggestedSolution || "Not recorded.",
    "",
    "## Expected outcome",
    opportunity.expectedOutcome || "Not recorded.",
    "",
    "## Evidence",
    ...opportunity.evidenceLinks.flatMap(({ evidence }) => [
      `- ${evidence.excerpt}`,
      `  - Source: ${evidence.source.title || evidence.source.url}`,
      `  - Source published: ${formatDate(evidence.source.publishedAt)} · observed: ${formatDate(evidence.observedAt)} · verified: ${formatDate(evidence.lastVerifiedAt)}`,
    ]),
    "",
    "## Outreach",
    ...opportunity.outreach.map(
      (record) =>
        `- ${record.contact.name} · ${record.channel} · ${record.status} · follow-up ${formatDate(record.followUpAt)}`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function csv(headers: string[], rows: unknown[][]) {
  return `${headers.map(escapeCsv).join(",")}\n${rows.map((row) => row.map(escapeCsv).join(",")).join("\n")}\n`;
}
function escapeCsv(value: unknown) {
  const text =
    value instanceof Date
      ? value.toISOString()
      : value === null || value === undefined
        ? ""
        : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString() : "Not recorded";
}
