import { prisma } from "@/lib/prisma";

const collections = [
  "companies",
  "sources",
  "collectionCandidates",
  "sourceChecks",
  "issueSignals",
  "issueClusters",
  "issueClusterEvents",
  "serviceCapabilities",
  "solutionMatches",
  "savedSearches",
  "pilots",
  "pilotEntries",
  "evidence",
  "opportunities",
  "opportunityEvidence",
  "contacts",
  "outreach",
  "aiDrafts",
  "aiDraftEvidence",
] as const;

export type BackupData = {
  version: number;
  exportedAt?: string;
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
};

export function validateBackup(input: unknown): {
  valid: boolean;
  errors: string[];
  summary: Record<string, number>;
  data?: BackupData;
} {
  const errors: string[] = [];
  if (!isRecord(input))
    return { valid: false, errors: ["Backup must be a JSON object."], summary: {} };
  if (input.version !== 1) errors.push("Backup version must be 1.");
  for (const collection of collections) {
    const isLegacyCollection =
      [
        "collectionCandidates",
        "sourceChecks",
        "issueSignals",
        "issueClusters",
        "issueClusterEvents",
        "serviceCapabilities",
        "solutionMatches",
        "savedSearches",
        "aiDrafts",
        "aiDraftEvidence",
        "pilots",
        "pilotEntries",
      ].includes(collection) && input[collection] === undefined;
    if (!isLegacyCollection && !Array.isArray(input[collection])) {
      errors.push(`${collection} must be an array.`);
    }
  }
  if (errors.length > 0) return { valid: false, errors, summary: {} };

  const data = {
    ...input,
    collectionCandidates: Array.isArray(input.collectionCandidates)
      ? input.collectionCandidates
      : [],
    sourceChecks: Array.isArray(input.sourceChecks) ? input.sourceChecks : [],
    issueSignals: Array.isArray(input.issueSignals) ? input.issueSignals : [],
    issueClusters: Array.isArray(input.issueClusters) ? input.issueClusters : [],
    issueClusterEvents: Array.isArray(input.issueClusterEvents) ? input.issueClusterEvents : [],
    serviceCapabilities: Array.isArray(input.serviceCapabilities) ? input.serviceCapabilities : [],
    solutionMatches: Array.isArray(input.solutionMatches) ? input.solutionMatches : [],
    savedSearches: Array.isArray(input.savedSearches) ? input.savedSearches : [],
    aiDrafts: Array.isArray(input.aiDrafts) ? input.aiDrafts : [],
    aiDraftEvidence: Array.isArray(input.aiDraftEvidence) ? input.aiDraftEvidence : [],
    pilots: Array.isArray(input.pilots) ? input.pilots : [],
    pilotEntries: Array.isArray(input.pilotEntries) ? input.pilotEntries : [],
  } as unknown as BackupData;
  const summary = Object.fromEntries(
    collections.map((collection) => [collection, data[collection].length]),
  );
  for (const collection of collections) {
    if (["opportunityEvidence", "aiDraftEvidence"].includes(collection)) continue;
    const ids = new Set<string>();
    for (const [index, record] of data[collection].entries()) {
      if (!isRecord(record) || typeof record.id !== "string" || !record.id)
        errors.push(`${collection}[${index}] must have an id.`);
      else if (ids.has(record.id)) errors.push(`${collection} contains duplicate id ${record.id}.`);
      else ids.add(record.id);
    }
  }
  const linkIds = new Set<string>();
  for (const [index, link] of data.opportunityEvidence.entries()) {
    const composite = `${String(link.opportunityId)}:${String(link.evidenceId)}`;
    if (!link.opportunityId || !link.evidenceId)
      errors.push(
        `opportunityEvidence[${index}] must reference an opportunity and evidence record.`,
      );
    else if (linkIds.has(composite))
      errors.push(`opportunityEvidence contains duplicate link ${composite}.`);
    else linkIds.add(composite);
  }

  const companyIds = new Set(data.companies.map((record) => String(record.id)));
  const sourceIds = new Set(data.sources.map((record) => String(record.id)));
  const evidenceIds = new Set(data.evidence.map((record) => String(record.id)));
  const opportunityIds = new Set(data.opportunities.map((record) => String(record.id)));
  const contactIds = new Set(data.contacts.map((record) => String(record.id)));
  const draftIds = new Set(data.aiDrafts.map((record) => String(record.id)));
  const clusterIds = new Set(data.issueClusters.map((record) => String(record.id)));
  const capabilityIds = new Set(data.serviceCapabilities.map((record) => String(record.id)));
  const pilotIds = new Set(data.pilots.map((record) => String(record.id)));
  const outreachIds = new Set(data.outreach.map((record) => String(record.id)));
  for (const source of data.sources)
    if (!companyIds.has(String(source.companyId)))
      errors.push(`Source ${String(source.id)} references a missing company.`);
  for (const candidate of data.collectionCandidates)
    if (!companyIds.has(String(candidate.companyId)))
      errors.push(`Collection candidate ${String(candidate.id)} references a missing company.`);
  for (const signal of data.issueSignals) {
    if (!companyIds.has(String(signal.companyId)))
      errors.push(`Issue signal ${String(signal.id)} references a missing company.`);
    if (!sourceIds.has(String(signal.sourceId)))
      errors.push(`Issue signal ${String(signal.id)} references a missing source.`);
    if (signal.clusterId && !clusterIds.has(String(signal.clusterId)))
      errors.push(`Issue signal ${String(signal.id)} references a missing cluster.`);
  }
  for (const cluster of data.issueClusters)
    if (!companyIds.has(String(cluster.companyId)))
      errors.push(`Issue cluster ${String(cluster.id)} references a missing company.`);
  for (const event of data.issueClusterEvents) {
    if (!clusterIds.has(String(event.clusterId)))
      errors.push("Issue cluster event references a missing cluster.");
    if (
      event.signalId &&
      !new Set(data.issueSignals.map((record) => String(record.id))).has(String(event.signalId))
    )
      errors.push("Issue cluster event references a missing signal.");
  }
  for (const match of data.solutionMatches) {
    if (!clusterIds.has(String(match.clusterId)))
      errors.push("Solution match references a missing cluster.");
    if (!capabilityIds.has(String(match.capabilityId)))
      errors.push("Solution match references a missing capability.");
  }
  for (const search of data.savedSearches)
    if (search.companyId && !companyIds.has(String(search.companyId)))
      errors.push("Saved search references a missing company.");
  for (const check of data.sourceChecks)
    if (!sourceIds.has(String(check.sourceId)))
      errors.push(`Source check ${String(check.id)} references a missing source.`);
  for (const record of data.evidence) {
    if (!companyIds.has(String(record.companyId)))
      errors.push(`Evidence ${String(record.id)} references a missing company.`);
    if (!sourceIds.has(String(record.sourceId)))
      errors.push(`Evidence ${String(record.id)} references a missing source.`);
  }
  for (const opportunity of data.opportunities)
    if (!companyIds.has(String(opportunity.companyId)))
      errors.push(`Opportunity ${String(opportunity.id)} references a missing company.`);
  for (const link of data.opportunityEvidence) {
    if (!opportunityIds.has(String(link.opportunityId)))
      errors.push(`Evidence link references a missing opportunity.`);
    if (!evidenceIds.has(String(link.evidenceId)))
      errors.push(`Evidence link references a missing evidence record.`);
  }
  for (const contact of data.contacts)
    if (!companyIds.has(String(contact.companyId)))
      errors.push(`Contact ${String(contact.id)} references a missing company.`);
  for (const record of data.outreach) {
    if (!opportunityIds.has(String(record.opportunityId)))
      errors.push(`Outreach ${String(record.id)} references a missing opportunity.`);
    if (!contactIds.has(String(record.contactId)))
      errors.push(`Outreach ${String(record.id)} references a missing contact.`);
  }
  for (const entry of data.pilotEntries) {
    if (!pilotIds.has(String(entry.pilotId)))
      errors.push(`Pilot entry ${String(entry.id)} references a missing pilot.`);
    if (!companyIds.has(String(entry.companyId)))
      errors.push(`Pilot entry ${String(entry.id)} references a missing company.`);
    if (entry.opportunityId && !opportunityIds.has(String(entry.opportunityId)))
      errors.push(`Pilot entry ${String(entry.id)} references a missing opportunity.`);
    if (entry.outreachId && !outreachIds.has(String(entry.outreachId)))
      errors.push(`Pilot entry ${String(entry.id)} references a missing outreach record.`);
  }
  for (const draft of data.aiDrafts) {
    if (!opportunityIds.has(String(draft.opportunityId)))
      errors.push(`AI draft ${String(draft.id)} references a missing opportunity.`);
    if (draft.contactId && !contactIds.has(String(draft.contactId)))
      errors.push(`AI draft ${String(draft.id)} references a missing contact.`);
  }
  const draftEvidenceIds = new Set<string>();
  for (const link of data.aiDraftEvidence) {
    const composite = `${String(link.draftId)}:${String(link.evidenceId)}`;
    if (!draftIds.has(String(link.draftId)))
      errors.push("AI draft evidence references a missing draft.");
    if (!evidenceIds.has(String(link.evidenceId)))
      errors.push("AI draft evidence references missing evidence.");
    if (draftEvidenceIds.has(composite))
      errors.push(`aiDraftEvidence contains duplicate link ${composite}.`);
    else draftEvidenceIds.add(composite);
  }
  return {
    valid: errors.length === 0,
    errors,
    summary,
    data: errors.length === 0 ? data : undefined,
  };
}

export async function importBackup(input: unknown) {
  const validation = validateBackup(input);
  if (!validation.valid || !validation.data) throw new Error(validation.errors.join(" "));
  const data = validation.data;
  await prisma.$transaction(async (tx) => {
    for (const company of data.companies)
      await tx.company.upsert({
        where: { id: String(company.id) },
        update: companyData(company),
        create: { id: String(company.id), ...companyData(company) },
      });
    for (const pilot of data.pilots)
      await tx.pilot.upsert({
        where: { id: String(pilot.id) },
        update: pilotData(pilot),
        create: { id: String(pilot.id), ...pilotData(pilot) },
      });
    for (const source of data.sources)
      await tx.source.upsert({
        where: { id: String(source.id) },
        update: sourceData(source),
        create: { id: String(source.id), ...sourceData(source) },
      });
    for (const capability of data.serviceCapabilities)
      await tx.serviceCapability.upsert({
        where: { id: String(capability.id) },
        update: serviceCapabilityData(capability),
        create: { id: String(capability.id), ...serviceCapabilityData(capability) },
      });
    for (const cluster of data.issueClusters)
      await tx.issueCluster.upsert({
        where: { id: String(cluster.id) },
        update: issueClusterData(cluster),
        create: { id: String(cluster.id), ...issueClusterData(cluster) },
      });
    for (const candidate of data.collectionCandidates)
      await tx.collectionCandidate.upsert({
        where: { id: String(candidate.id) },
        update: collectionCandidateData(candidate),
        create: { id: String(candidate.id), ...collectionCandidateData(candidate) },
      });
    for (const signal of data.issueSignals)
      await tx.issueSignal.upsert({
        where: { id: String(signal.id) },
        update: issueSignalData(signal),
        create: { id: String(signal.id), ...issueSignalData(signal) },
      });
    for (const event of data.issueClusterEvents)
      await tx.issueClusterEvent.upsert({
        where: { id: String(event.id) },
        update: issueClusterEventData(event),
        create: { id: String(event.id), ...issueClusterEventData(event) },
      });
    for (const match of data.solutionMatches)
      await tx.solutionMatch.upsert({
        where: { id: String(match.id) },
        update: solutionMatchData(match),
        create: { id: String(match.id), ...solutionMatchData(match) },
      });
    for (const search of data.savedSearches)
      await tx.savedSearch.upsert({
        where: { id: String(search.id) },
        update: savedSearchData(search),
        create: { id: String(search.id), ...savedSearchData(search) },
      });
    for (const check of data.sourceChecks)
      await tx.sourceCheck.upsert({
        where: { id: String(check.id) },
        update: sourceCheckData(check),
        create: { id: String(check.id), ...sourceCheckData(check) },
      });
    for (const record of data.evidence)
      await tx.evidence.upsert({
        where: { id: String(record.id) },
        update: evidenceData(record),
        create: { id: String(record.id), ...evidenceData(record) },
      });
    for (const opportunity of data.opportunities)
      await tx.opportunity.upsert({
        where: { id: String(opportunity.id) },
        update: opportunityData(opportunity),
        create: { id: String(opportunity.id), ...opportunityData(opportunity) },
      });
    for (const link of data.opportunityEvidence)
      await tx.opportunityEvidence.upsert({
        where: {
          opportunityId_evidenceId: {
            opportunityId: String(link.opportunityId),
            evidenceId: String(link.evidenceId),
          },
        },
        update: { linkedAt: date(link.linkedAt) ?? new Date() },
        create: {
          opportunityId: String(link.opportunityId),
          evidenceId: String(link.evidenceId),
          linkedAt: date(link.linkedAt) ?? new Date(),
        },
      });
    for (const contact of data.contacts)
      await tx.contact.upsert({
        where: { id: String(contact.id) },
        update: contactData(contact),
        create: { id: String(contact.id), ...contactData(contact) },
      });
    for (const record of data.outreach)
      await tx.outreach.upsert({
        where: { id: String(record.id) },
        update: outreachData(record),
        create: { id: String(record.id), ...outreachData(record) },
      });
    for (const entry of data.pilotEntries)
      await tx.pilotEntry.upsert({
        where: { id: String(entry.id) },
        update: pilotEntryData(entry),
        create: { id: String(entry.id), ...pilotEntryData(entry) },
      });
    for (const draft of data.aiDrafts)
      await tx.aiDraft.upsert({
        where: { id: String(draft.id) },
        update: aiDraftData(draft),
        create: { id: String(draft.id), ...aiDraftData(draft) },
      });
    for (const link of data.aiDraftEvidence)
      await tx.aiDraftEvidence.upsert({
        where: {
          draftId_evidenceId: {
            draftId: String(link.draftId),
            evidenceId: String(link.evidenceId),
          },
        },
        update: {},
        create: { draftId: String(link.draftId), evidenceId: String(link.evidenceId) },
      });
  });
  return validation.summary;
}

function companyData(record: Record<string, unknown>) {
  return {
    name: String(record.name ?? ""),
    websiteUrl: String(record.websiteUrl ?? ""),
    industry: nullable(record.industry),
    companyType: nullable(record.companyType),
    sizeEstimate: nullable(record.sizeEstimate),
    location: nullable(record.location),
    priority: number(record.priority, 3),
    status: String(record.status ?? "active"),
    notes: nullable(record.notes),
    lastResearchedAt: date(record.lastResearchedAt),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function pilotData(record: Record<string, unknown>) {
  return {
    name: String(record.name ?? ""),
    niche: String(record.niche ?? ""),
    targetCompanies: Math.max(1, Math.floor(number(record.targetCompanies, 25))),
    targetMessages: Math.max(0, Math.floor(number(record.targetMessages, 10))),
    status: String(record.status ?? "planned"),
    startedAt: date(record.startedAt),
    endedAt: date(record.endedAt),
    notes: nullable(record.notes),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function sourceData(record: Record<string, unknown>) {
  return {
    companyId: String(record.companyId),
    url: String(record.url),
    sourceType: String(record.sourceType),
    title: nullable(record.title),
    publishedAt: date(record.publishedAt),
    sourceUpdatedAt: date(record.sourceUpdatedAt),
    lastCheckedAt: date(record.lastCheckedAt),
    accessibilityStatus: String(record.accessibilityStatus ?? "accessible"),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function collectionCandidateData(record: Record<string, unknown>) {
  return {
    companyId: String(record.companyId),
    url: String(record.url),
    pageType: String(record.pageType ?? "other"),
    title: nullable(record.title),
    fetchedAt: date(record.fetchedAt) ?? new Date(),
    responseStatus: integerOrNull(record.responseStatus),
    contentHash: nullable(record.contentHash),
    previousHash: nullable(record.previousHash),
    normalizedText: nullable(record.normalizedText),
    changeStatus: String(record.changeStatus ?? "new"),
    reviewStatus: String(record.reviewStatus ?? "pending"),
    errorMessage: nullable(record.errorMessage),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function sourceCheckData(record: Record<string, unknown>) {
  return {
    sourceId: String(record.sourceId),
    checkedAt: date(record.checkedAt) ?? new Date(),
    responseStatus: integerOrNull(record.responseStatus),
    finalUrl: nullable(record.finalUrl),
    previousHash: nullable(record.previousHash),
    contentHash: nullable(record.contentHash),
    normalizedText: nullable(record.normalizedText),
    resultStatus: String(record.resultStatus ?? "failed"),
    reviewStatus: String(record.reviewStatus ?? "not-needed"),
    errorMessage: nullable(record.errorMessage),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function issueSignalData(record: Record<string, unknown>) {
  return {
    companyId: String(record.companyId),
    sourceId: String(record.sourceId),
    sourceUrl: String(record.sourceUrl ?? ""),
    sourceType: String(record.sourceType ?? "other"),
    title: String(record.title ?? ""),
    excerpt: String(record.excerpt ?? ""),
    neutralSummary: String(record.neutralSummary ?? ""),
    sourcePublishedAt: date(record.sourcePublishedAt),
    sourceUpdatedAt: date(record.sourceUpdatedAt),
    observedAt: date(record.observedAt) ?? new Date(),
    lastVerifiedAt: date(record.lastVerifiedAt),
    accessibilityStatus: String(record.accessibilityStatus ?? "accessible"),
    responseStatus: integerOrNull(record.responseStatus),
    fingerprint: String(record.fingerprint ?? record.id),
    groupKey: String(record.groupKey ?? record.fingerprint ?? record.id),
    reviewStatus: String(record.reviewStatus ?? "discovered"),
    independentSourceCount: number(record.independentSourceCount, 1),
    recencyScore: number(record.recencyScore, 1),
    specificityScore: number(record.specificityScore, 1),
    sourceReliabilityScore: number(record.sourceReliabilityScore, 1),
    corroborationScore: number(record.corroborationScore, 1),
    impactScore: number(record.impactScore, 1),
    solutionFitScore: number(record.solutionFitScore, 1),
    rankingScore: number(record.rankingScore, 1),
    promotedAt: date(record.promotedAt),
    clusterId: nullable(record.clusterId),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function issueClusterData(record: Record<string, unknown>) {
  return {
    companyId: String(record.companyId),
    groupKey: String(record.groupKey ?? record.id),
    title: String(record.title ?? "Unresolved public issue signal"),
    neutralSummary: String(record.neutralSummary ?? ""),
    category: nullable(record.category),
    firstSeenAt: date(record.firstSeenAt) ?? new Date(),
    latestSeenAt: date(record.latestSeenAt) ?? new Date(),
    independentSourceCount: number(record.independentSourceCount, 1),
    resolutionState: String(record.resolutionState ?? "open"),
    recencyScore: number(record.recencyScore, 1),
    specificityScore: number(record.specificityScore, 1),
    sourceReliabilityScore: number(record.sourceReliabilityScore, 1),
    corroborationScore: number(record.corroborationScore, 1),
    impactScore: number(record.impactScore, 1),
    solutionFitScore: number(record.solutionFitScore, 1),
    rankingScore: number(record.rankingScore, 1),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function issueClusterEventData(record: Record<string, unknown>) {
  return {
    clusterId: String(record.clusterId),
    signalId: nullable(record.signalId),
    eventType: String(record.eventType ?? "note"),
    title: nullable(record.title),
    summary: String(record.summary ?? ""),
    sourceUrl: nullable(record.sourceUrl),
    sourcePublishedAt: date(record.sourcePublishedAt),
    observedAt: date(record.observedAt),
    verifiedAt: date(record.verifiedAt),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function serviceCapabilityData(record: Record<string, unknown>) {
  return {
    name: String(record.name ?? ""),
    description: String(record.description ?? ""),
    category: nullable(record.category),
    keywords: String(record.keywords ?? ""),
    estimatedEffort: nullable(record.estimatedEffort),
    expectedOutcome: nullable(record.expectedOutcome),
    nextAction: nullable(record.nextAction),
    active: record.active !== false,
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function solutionMatchData(record: Record<string, unknown>) {
  return {
    clusterId: String(record.clusterId),
    capabilityId: String(record.capabilityId),
    rationale: String(record.rationale ?? ""),
    fitScore: number(record.fitScore, 1),
    estimatedEffort: nullable(record.estimatedEffort),
    expectedOutcome: nullable(record.expectedOutcome),
    nextAction: nullable(record.nextAction),
    reviewStatus: String(record.reviewStatus ?? "needs-review"),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function savedSearchData(record: Record<string, unknown>) {
  return {
    name: String(record.name ?? ""),
    companyId: nullable(record.companyId),
    reviewStatus: nullable(record.reviewStatus),
    sourceType: nullable(record.sourceType),
    minimumScore:
      record.minimumScore === null || record.minimumScore === undefined
        ? null
        : number(record.minimumScore, 1),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function evidenceData(record: Record<string, unknown>) {
  return {
    sourceId: String(record.sourceId),
    companyId: String(record.companyId),
    excerpt: String(record.excerpt ?? ""),
    snapshotPath: nullable(record.snapshotPath),
    observedAt: date(record.observedAt) ?? new Date(),
    lastVerifiedAt: date(record.lastVerifiedAt),
    snapshotHash: String(record.snapshotHash),
    confidence: number(record.confidence, 1),
    notes: nullable(record.notes),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function opportunityData(record: Record<string, unknown>) {
  return {
    companyId: String(record.companyId),
    title: String(record.title ?? ""),
    category: String(record.category ?? "other"),
    hypothesis: String(record.hypothesis ?? ""),
    impactDescription: nullable(record.impactDescription),
    suggestedSolution: nullable(record.suggestedSolution),
    expectedOutcome: nullable(record.expectedOutcome),
    impactScore: number(record.impactScore, 1),
    evidenceScore: number(record.evidenceScore, 1),
    solutionFitScore: number(record.solutionFitScore, 1),
    reachabilityScore: number(record.reachabilityScore, 1),
    priorityScore: number(record.priorityScore, 1),
    freshnessLabel: String(record.freshnessLabel ?? "Undated"),
    status: String(record.status ?? "new"),
    companyConfirmed: Boolean(record.companyConfirmed),
    lastVerifiedAt: date(record.lastVerifiedAt),
    verificationNotes: nullable(record.verificationNotes),
    resolvedAt: date(record.resolvedAt),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function contactData(record: Record<string, unknown>) {
  return {
    companyId: String(record.companyId),
    name: String(record.name ?? ""),
    role: nullable(record.role),
    profileUrl: nullable(record.profileUrl),
    contactMethod: nullable(record.contactMethod),
    relevanceNotes: nullable(record.relevanceNotes),
    doNotContact: Boolean(record.doNotContact),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function outreachData(record: Record<string, unknown>) {
  return {
    opportunityId: String(record.opportunityId),
    contactId: String(record.contactId),
    channel: String(record.channel ?? "other"),
    draftMessage: String(record.draftMessage ?? ""),
    sentAt: date(record.sentAt),
    followUpAt: date(record.followUpAt),
    responseSummary: nullable(record.responseSummary),
    nextAction: nullable(record.nextAction),
    status: String(record.status ?? "draft"),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function pilotEntryData(record: Record<string, unknown>) {
  return {
    pilotId: String(record.pilotId),
    companyId: String(record.companyId),
    opportunityId: nullable(record.opportunityId),
    outreachId: nullable(record.outreachId),
    sourceCategory: String(record.sourceCategory ?? "other"),
    issueCategory: String(record.issueCategory ?? "other"),
    issueCluster: nullable(record.issueCluster),
    sourceUrl: String(record.sourceUrl ?? ""),
    evidenceDate: date(record.evidenceDate),
    observedAt: date(record.observedAt),
    lastVerifiedAt: date(record.lastVerifiedAt),
    manuallyReviewed: record.manuallyReviewed === true,
    impactScore: number(record.impactScore, 1),
    evidenceScore: number(record.evidenceScore, 1),
    solutionFitScore: number(record.solutionFitScore, 1),
    reachabilityScore: number(record.reachabilityScore, 1),
    priorityScore: number(record.priorityScore, 1),
    proposedSolution: String(record.proposedSolution ?? ""),
    messageSentAt: date(record.messageSentAt),
    replyStatus: String(record.replyStatus ?? "not-contacted"),
    replySummary: nullable(record.replySummary),
    objection: nullable(record.objection),
    meetingAt: date(record.meetingAt),
    outcomeStatus: String(record.outcomeStatus ?? "open"),
    outcomeNotes: nullable(record.outcomeNotes),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function aiDraftData(record: Record<string, unknown>) {
  return {
    opportunityId: String(record.opportunityId),
    contactId: nullable(record.contactId),
    kind: String(record.kind ?? "summary"),
    provider: String(record.provider ?? "local-template"),
    model: nullable(record.model),
    promptContext: String(record.promptContext ?? ""),
    originalText: String(record.originalText ?? ""),
    draftText: String(record.draftText ?? ""),
    status: String(record.status ?? "draft"),
    generatedAt: date(record.generatedAt) ?? new Date(),
    reviewedAt: date(record.reviewedAt),
    createdAt: date(record.createdAt) ?? new Date(),
  };
}
function date(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function number(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function integerOrNull(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}
function nullable(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
