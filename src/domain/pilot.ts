import {
  OPPORTUNITY_CATEGORIES,
  SOURCE_TYPES,
  calculatePriorityScore,
  isScore,
  isValidHttpUrl,
  type OpportunityCategory,
  type SourceType,
  type ValidationErrors,
  type ValidationResult,
} from "@/domain/rules";

export const PILOT_STATUSES = ["planned", "active", "completed", "archived"] as const;
export type PilotStatus = (typeof PILOT_STATUSES)[number];

export const PILOT_REPLY_STATUSES = [
  "not-contacted",
  "no-reply",
  "positive",
  "negative",
  "objection",
] as const;
export type PilotReplyStatus = (typeof PILOT_REPLY_STATUSES)[number];

export const PILOT_OUTCOME_STATUSES = [
  "open",
  "no-response",
  "replied",
  "meeting-booked",
  "proposal-sent",
  "won",
  "lost",
  "archived",
] as const;
export type PilotOutcomeStatus = (typeof PILOT_OUTCOME_STATUSES)[number];

export interface PilotInput {
  name: string;
  niche: string;
  targetCompanies: number;
  targetMessages: number;
  status?: PilotStatus;
  startedAt?: Date | null;
  endedAt?: Date | null;
  notes?: string | null;
}

export interface PilotEntryInput {
  pilotId: string;
  companyId: string;
  opportunityId?: string | null;
  outreachId?: string | null;
  sourceCategory: string;
  issueCategory: string;
  issueCluster?: string | null;
  sourceUrl: string;
  evidenceDate?: Date | null;
  observedAt?: Date | null;
  lastVerifiedAt?: Date | null;
  manuallyReviewed: boolean;
  impactScore: number;
  evidenceScore: number;
  solutionFitScore: number;
  reachabilityScore: number;
  priorityScore?: number;
  proposedSolution: string;
  messageSentAt?: Date | null;
  replyStatus?: PilotReplyStatus;
  replySummary?: string | null;
  objection?: string | null;
  meetingAt?: Date | null;
  outcomeStatus?: PilotOutcomeStatus;
  outcomeNotes?: string | null;
}

export interface PilotAnalysisRow {
  label: string;
  entries: number;
  sent: number;
  replies: number;
  meetings: number;
  wins: number;
  replyRate: number | null;
}

export interface PilotAnalysis {
  entries: number;
  researchedCompanies: number;
  sent: number;
  replies: number;
  meetings: number;
  wins: number;
  targetCompanies: number;
  targetMessages: number;
  bySource: PilotAnalysisRow[];
  byIssue: PilotAnalysisRow[];
}

export function validatePilotInput(input: PilotInput): ValidationResult<PilotInput> {
  const errors: ValidationErrors = {};
  const name = input.name.trim();
  const niche = input.niche.trim();
  const status = input.status ?? "planned";
  const notes = input.notes?.trim() || null;

  if (name.length < 3) errors.name = "Pilot name must be at least 3 characters.";
  if (name.length > 120) errors.name = "Pilot name must be 120 characters or fewer.";
  if (niche.length < 2) errors.niche = "Niche must be at least 2 characters.";
  if (niche.length > 160) errors.niche = "Niche must be 160 characters or fewer.";
  if (
    !Number.isInteger(input.targetCompanies) ||
    input.targetCompanies < 1 ||
    input.targetCompanies > 1000
  ) {
    errors.targetCompanies = "Target companies must be an integer from 1 to 1,000.";
  }
  if (
    !Number.isInteger(input.targetMessages) ||
    input.targetMessages < 0 ||
    input.targetMessages > 1000
  ) {
    errors.targetMessages = "Target messages must be an integer from 0 to 1,000.";
  }
  if (!PILOT_STATUSES.includes(status)) errors.status = "Choose a valid pilot status.";
  if (notes !== null && notes.length > 5000)
    errors.notes = "Pilot notes must be 5,000 characters or fewer.";
  validateDate(errors, "startedAt", input.startedAt);
  validateDate(errors, "endedAt", input.endedAt);

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : {
        success: true,
        data: {
          name,
          niche,
          targetCompanies: input.targetCompanies,
          targetMessages: input.targetMessages,
          status,
          startedAt: input.startedAt ?? null,
          endedAt: input.endedAt ?? null,
          notes,
        },
      };
}

export function validatePilotEntryInput(input: PilotEntryInput): ValidationResult<PilotEntryInput> {
  const errors: ValidationErrors = {};
  const pilotId = input.pilotId.trim();
  const companyId = input.companyId.trim();
  const opportunityId = input.opportunityId?.trim() || null;
  const outreachId = input.outreachId?.trim() || null;
  const sourceCategory = input.sourceCategory.trim();
  const issueCategory = input.issueCategory.trim();
  const issueCluster = input.issueCluster?.trim() || null;
  const sourceUrl = input.sourceUrl.trim();
  const proposedSolution = input.proposedSolution.trim();
  const replyStatus = input.replyStatus ?? "not-contacted";
  const outcomeStatus = input.outcomeStatus ?? "open";
  const replySummary = input.replySummary?.trim() || null;
  const objection = input.objection?.trim() || null;
  const outcomeNotes = input.outcomeNotes?.trim() || null;

  if (!pilotId) errors.pilotId = "Pilot is required.";
  if (!companyId) errors.companyId = "Company is required.";
  if (!SOURCE_TYPES.includes(sourceCategory as SourceType))
    errors.sourceCategory = "Choose a supported source category.";
  if (!OPPORTUNITY_CATEGORIES.includes(issueCategory as OpportunityCategory))
    errors.issueCategory = "Choose a supported issue category.";
  if (!isValidHttpUrl(sourceUrl))
    errors.sourceUrl = "Source URL must be a valid HTTP or HTTPS URL.";
  if (issueCluster !== null && issueCluster.length > 200)
    errors.issueCluster = "Issue cluster must be 200 characters or fewer.";
  if (proposedSolution.length < 10)
    errors.proposedSolution = "Proposed solution must be at least 10 characters.";
  if (proposedSolution.length > 4000)
    errors.proposedSolution = "Proposed solution must be 4,000 characters or fewer.";
  if (!PILOT_REPLY_STATUSES.includes(replyStatus))
    errors.replyStatus = "Choose a valid reply status.";
  if (!PILOT_OUTCOME_STATUSES.includes(outcomeStatus))
    errors.outcomeStatus = "Choose a valid outcome status.";
  if (replySummary !== null && replySummary.length > 5000)
    errors.replySummary = "Reply summary must be 5,000 characters or fewer.";
  if (objection !== null && objection.length > 3000)
    errors.objection = "Objection must be 3,000 characters or fewer.";
  if (outcomeNotes !== null && outcomeNotes.length > 5000)
    errors.outcomeNotes = "Outcome notes must be 5,000 characters or fewer.";

  for (const [field, score] of [
    ["impactScore", input.impactScore],
    ["evidenceScore", input.evidenceScore],
    ["solutionFitScore", input.solutionFitScore],
    ["reachabilityScore", input.reachabilityScore],
  ] as const) {
    if (!isScore(score)) errors[field] = `${field} must be an integer from 1 to 5.`;
  }

  for (const [field, date] of [
    ["evidenceDate", input.evidenceDate],
    ["observedAt", input.observedAt],
    ["lastVerifiedAt", input.lastVerifiedAt],
    ["messageSentAt", input.messageSentAt],
    ["meetingAt", input.meetingAt],
  ] as const)
    validateDate(errors, field, date);

  if (input.messageSentAt) {
    if (!input.manuallyReviewed)
      errors.manuallyReviewed =
        "Confirm the opportunity was manually reviewed before recording a sent message.";
    if (!input.evidenceDate)
      errors.evidenceDate = "Evidence date is required before recording a sent message.";
    if (!input.observedAt)
      errors.observedAt = "Observed date is required before recording a sent message.";
    if (!input.lastVerifiedAt)
      errors.lastVerifiedAt = "Last verification date is required before recording a sent message.";
  }
  if (input.meetingAt && !input.messageSentAt)
    errors.meetingAt = "Record a sent message before recording a meeting.";

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : {
        success: true,
        data: {
          pilotId,
          companyId,
          opportunityId,
          outreachId,
          sourceCategory,
          issueCategory,
          issueCluster,
          sourceUrl,
          evidenceDate: input.evidenceDate ?? null,
          observedAt: input.observedAt ?? null,
          lastVerifiedAt: input.lastVerifiedAt ?? null,
          manuallyReviewed: input.manuallyReviewed,
          impactScore: input.impactScore,
          evidenceScore: input.evidenceScore,
          solutionFitScore: input.solutionFitScore,
          reachabilityScore: input.reachabilityScore,
          priorityScore: calculatePriorityScore({
            impact: input.impactScore,
            evidence: input.evidenceScore,
            solutionFit: input.solutionFitScore,
            reachability: input.reachabilityScore,
          }),
          proposedSolution,
          messageSentAt: input.messageSentAt ?? null,
          replyStatus,
          replySummary,
          objection,
          meetingAt: input.meetingAt ?? null,
          outcomeStatus,
          outcomeNotes,
        },
      };
}

export function summarizePilotEntries(
  entries: Array<
    Pick<
      PilotEntryInput,
      | "sourceCategory"
      | "issueCategory"
      | "messageSentAt"
      | "replyStatus"
      | "meetingAt"
      | "outcomeStatus"
    >
  >,
  targets: Pick<PilotAnalysis, "targetCompanies" | "targetMessages"> & {
    researchedCompanies: number;
  },
): PilotAnalysis {
  const rows = (field: "sourceCategory" | "issueCategory") => {
    const groups = new Map<string, typeof entries>();
    for (const entry of entries) {
      const label = entry[field];
      const group = groups.get(label) ?? [];
      group.push(entry);
      groups.set(label, group);
    }
    return Array.from(groups.entries())
      .map(([label, group]) => summarizeRow(label, group))
      .sort((a, b) => b.entries - a.entries || a.label.localeCompare(b.label));
  };
  const sent = entries.filter((entry) => entry.messageSentAt).length;
  const replies = entries.filter((entry) =>
    ["positive", "negative", "objection"].includes(entry.replyStatus ?? ""),
  ).length;
  return {
    entries: entries.length,
    researchedCompanies: targets.researchedCompanies,
    sent,
    replies,
    meetings: entries.filter((entry) => entry.meetingAt).length,
    wins: entries.filter((entry) => entry.outcomeStatus === "won").length,
    targetCompanies: targets.targetCompanies,
    targetMessages: targets.targetMessages,
    bySource: rows("sourceCategory"),
    byIssue: rows("issueCategory"),
  };
}

function summarizeRow(
  label: string,
  entries: Array<
    Pick<PilotEntryInput, "messageSentAt" | "replyStatus" | "meetingAt" | "outcomeStatus">
  >,
): PilotAnalysisRow {
  const sent = entries.filter((entry) => entry.messageSentAt).length;
  const replies = entries.filter((entry) =>
    ["positive", "negative", "objection"].includes(entry.replyStatus ?? ""),
  ).length;
  return {
    label,
    entries: entries.length,
    sent,
    replies,
    meetings: entries.filter((entry) => entry.meetingAt).length,
    wins: entries.filter((entry) => entry.outcomeStatus === "won").length,
    replyRate: sent > 0 ? Math.round((replies / sent) * 100) : null,
  };
}

function validateDate(errors: ValidationErrors, field: string, value: Date | null | undefined) {
  if (value !== null && value !== undefined && !isValidDate(value))
    errors[field] = "Date must be valid.";
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
