export const FRESHNESS_LABELS = ["Hot", "Recent", "Aging", "Historical", "Undated"] as const;

export type FreshnessLabel = (typeof FRESHNESS_LABELS)[number];

export const CONFIDENCE_LEVELS = ["Low", "Medium", "High"] as const;

export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const OPPORTUNITY_STATUSES = [
  "new",
  "researching",
  "needs-verification",
  "verified",
  "solution-ready",
  "ready-for-outreach",
  "contacted",
  "replied",
  "meeting-booked",
  "proposal-sent",
  "won",
  "rejected",
  "resolved",
  "archived",
] as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const OUTREACH_CHANNELS = [
  "email",
  "linkedin",
  "contact-form",
  "referral",
  "other",
] as const;

export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number];

export const OUTREACH_STATUSES = [
  "draft",
  "approved",
  "contacted",
  "follow-up-due",
  "replied",
  "meeting-booked",
  "proposal-sent",
  "won",
  "rejected",
  "closed",
] as const;

export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export type ValidationErrors = Record<string, string>;

export type ValidationResult<T> =
  { success: true; data: T } | { success: false; errors: ValidationErrors };

export interface CompanyInput {
  name: string;
  websiteUrl: string;
}

export const COMPANY_STATUSES = ["active", "archived"] as const;

export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const SOURCE_ACCESSIBILITY_STATUSES = [
  "accessible",
  "inaccessible",
  "changed",
  "deleted",
  "unknown",
] as const;

export type SourceAccessibilityStatus = (typeof SOURCE_ACCESSIBILITY_STATUSES)[number];

export const SOURCE_TYPES = [
  "website",
  "pricing",
  "product",
  "documentation",
  "review",
  "forum",
  "github",
  "job-posting",
  "status",
  "changelog",
  "competitor",
  "other",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const OPPORTUNITY_CATEGORIES = [
  "website-conversion",
  "product-onboarding",
  "customer-support",
  "documentation",
  "product-gap",
  "reliability",
  "hiring-operations",
  "other",
] as const;

export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number];

export interface CompanyRecordInput extends CompanyInput {
  industry?: string | null;
  companyType?: string | null;
  sizeEstimate?: string | null;
  location?: string | null;
  priority?: number;
  status?: CompanyStatus;
  notes?: string | null;
  lastResearchedAt?: Date | null;
}

export interface EvidenceInput {
  companyId: string;
  sourceId: string;
  excerpt: string;
  snapshotHash?: string | null;
  snapshotPath?: string | null;
  observedAt?: Date | null;
  lastVerifiedAt?: Date | null;
  confidence?: number;
  notes?: string | null;
}

export interface SourceInput {
  companyId: string;
  url: string;
  sourceType: string;
  title?: string | null;
  publishedAt?: Date | null;
  sourceUpdatedAt?: Date | null;
  lastCheckedAt?: Date | null;
  accessibilityStatus?: SourceAccessibilityStatus;
}

export interface OpportunityInput {
  companyId: string;
  title: string;
  category: string;
  hypothesis: string;
  evidenceCount: number;
  suggestedSolution?: string | null;
}

export interface OpportunityRecordInput {
  companyId: string;
  title: string;
  category: string;
  hypothesis: string;
  evidenceIds: string[];
  impactDescription?: string | null;
  suggestedSolution?: string | null;
  expectedOutcome?: string | null;
  impactScore: number;
  evidenceScore: number;
  solutionFitScore: number;
  reachabilityScore: number;
  status?: OpportunityStatus;
  verificationNotes?: string | null;
  companyConfirmed?: boolean;
}

export interface ContactInput {
  companyId: string;
  name: string;
  profileUrl?: string | null;
}

export interface ContactRecordInput {
  companyId: string;
  name: string;
  role?: string | null;
  profileUrl?: string | null;
  contactMethod?: string | null;
  relevanceNotes?: string | null;
  doNotContact?: boolean;
}

export interface OutreachInput {
  opportunityId: string;
  contactId: string;
  channel: string;
  draftMessage: string;
}

export interface OutreachRecordInput {
  opportunityId: string;
  contactId: string;
  channel: string;
  draftMessage: string;
  sentAt?: Date | null;
  followUpAt?: Date | null;
  responseSummary?: string | null;
  nextAction?: string | null;
  status?: string;
  confirmClosedOpportunity?: boolean;
}

export const OUTREACH_TEMPLATE_VARIABLES = [
  "company",
  "contact",
  "opportunity",
  "evidence",
  "solution",
] as const;

export type OutreachTemplateVariable = (typeof OUTREACH_TEMPLATE_VARIABLES)[number];

export interface PriorityScores {
  impact: number;
  evidence: number;
  solutionFit: number;
  reachability: number;
}

export interface EvidenceDates {
  sourcePublishedAt?: Date | null;
  sourceUpdatedAt?: Date | null;
  sourceLastCheckedAt?: Date | null;
  observedAt?: Date | null;
  lastVerifiedAt?: Date | null;
}

export interface OpportunityFreshnessInput {
  opportunityLastVerifiedAt?: Date | null;
  evidenceDates: EvidenceDates[];
}

export interface ReverificationInput {
  note: string;
  verifiedAt?: Date | null;
}

export interface OutreachEligibilityInput {
  status: OpportunityStatus;
  evidenceCount: number;
  suggestedSolution?: string | null;
  lastVerifiedAt?: Date | null;
  allSourcesAccessible: boolean;
  manuallyReviewed: boolean;
  hasContact: boolean;
  contactDoNotContact?: boolean;
  resolvedAt?: Date | null;
  referenceDate: Date;
}

export interface OutreachEligibilityResult {
  eligible: boolean;
  reasons: string[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const STATUS_TRANSITIONS: Record<OpportunityStatus, readonly OpportunityStatus[]> = {
  new: ["researching", "archived"],
  researching: ["needs-verification", "verified", "archived"],
  "needs-verification": ["researching", "verified", "archived"],
  verified: ["needs-verification", "solution-ready", "resolved", "archived"],
  "solution-ready": ["needs-verification", "ready-for-outreach", "archived"],
  "ready-for-outreach": ["needs-verification", "contacted", "archived"],
  contacted: ["needs-verification", "replied", "meeting-booked", "rejected", "archived"],
  replied: ["meeting-booked", "rejected", "archived"],
  "meeting-booked": ["proposal-sent", "rejected", "archived"],
  "proposal-sent": ["won", "rejected", "archived"],
  won: ["archived"],
  rejected: ["archived"],
  resolved: ["researching", "archived"],
  archived: [],
};

export function isValidHttpUrl(value: string): boolean {
  return normalizeWebsiteUrl(value) !== null;
}

export function normalizeWebsiteUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.hostname.length === 0 ||
      url.username.length > 0 ||
      url.password.length > 0
    ) {
      return null;
    }

    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";

    const pathname = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${pathname}`;
  } catch {
    return null;
  }
}

export function validateCompanyInput(input: CompanyInput): ValidationResult<CompanyInput> {
  const errors: ValidationErrors = {};
  const name = input.name.trim();
  const websiteUrl = normalizeWebsiteUrl(input.websiteUrl);

  if (name.length < 2) {
    errors.name = "Company name must be at least 2 characters.";
  }

  if (name.length > 120) {
    errors.name = "Company name must be 120 characters or fewer.";
  }

  if (!websiteUrl) {
    errors.websiteUrl = "Website URL must be a valid HTTP or HTTPS URL.";
  }

  if (Object.keys(errors).length > 0 || !websiteUrl) {
    return { success: false, errors };
  }

  return { success: true, data: { name, websiteUrl } };
}

export function validateCompanyRecordInput(
  input: CompanyRecordInput,
): ValidationResult<CompanyRecordInput> {
  const base = validateCompanyInput(input);
  const errors: ValidationErrors = base.success ? {} : { ...base.errors };
  const optionalTextFields = [
    ["industry", input.industry],
    ["companyType", input.companyType],
    ["sizeEstimate", input.sizeEstimate],
    ["location", input.location],
  ] as const;

  for (const [field, value] of optionalTextFields) {
    if (value !== null && value !== undefined && value.trim().length > 120) {
      errors[field] = `${field} must be 120 characters or fewer.`;
    }
  }

  if (input.priority !== undefined && !isScore(input.priority)) {
    errors.priority = "Priority must be an integer from 1 to 5.";
  }

  if (input.status !== undefined && !COMPANY_STATUSES.includes(input.status)) {
    errors.status = "Company status must be active or archived.";
  }

  if (input.notes !== null && input.notes !== undefined && input.notes.trim().length > 5000) {
    errors.notes = "Notes must be 5,000 characters or fewer.";
  }

  if (
    input.lastResearchedAt !== null &&
    input.lastResearchedAt !== undefined &&
    !isValidDate(input.lastResearchedAt)
  ) {
    errors.lastResearchedAt = "Last researched date must be valid.";
  }

  if (Object.keys(errors).length > 0 || !base.success) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: base.data.name,
      websiteUrl: base.data.websiteUrl,
      industry: input.industry?.trim() || null,
      companyType: input.companyType?.trim() || null,
      sizeEstimate: input.sizeEstimate?.trim() || null,
      location: input.location?.trim() || null,
      priority: input.priority ?? 3,
      status: input.status ?? "active",
      notes: input.notes?.trim() || null,
      lastResearchedAt: input.lastResearchedAt ?? null,
    },
  };
}

export function validateEvidenceInput(input: EvidenceInput): ValidationResult<EvidenceInput> {
  const errors: ValidationErrors = {};
  const companyId = input.companyId.trim();
  const sourceId = input.sourceId.trim();
  const excerpt = input.excerpt.trim();
  const snapshotHash = input.snapshotHash?.trim() || null;
  const snapshotPath = input.snapshotPath?.trim() || null;
  const notes = input.notes?.trim() || null;

  if (companyId.length === 0) {
    errors.companyId = "Evidence must belong to a company.";
  }

  if (sourceId.length === 0) {
    errors.sourceId = "Evidence must reference a source.";
  }

  if (excerpt.length < 10) {
    errors.excerpt = "Evidence excerpt must be at least 10 characters.";
  }

  if (snapshotHash !== null && snapshotHash.length < 8) {
    errors.snapshotHash = "Evidence snapshot hash must be at least 8 characters.";
  }

  if (input.confidence !== undefined && !isScore(input.confidence)) {
    errors.confidence = "Confidence must be an integer from 1 to 5.";
  }

  if (excerpt.length > 4000) {
    errors.excerpt = "Evidence excerpt must be 4,000 characters or fewer.";
  }

  if (snapshotPath !== null && snapshotPath.length > 500) {
    errors.snapshotPath = "Snapshot path must be 500 characters or fewer.";
  }

  if (notes !== null && notes.length > 5000) {
    errors.notes = "Evidence notes must be 5,000 characters or fewer.";
  }

  for (const [field, date] of [
    ["observedAt", input.observedAt],
    ["lastVerifiedAt", input.lastVerifiedAt],
  ] as const) {
    if (date !== null && date !== undefined && !isValidDate(date)) {
      errors[field] = "Date must be valid.";
    }
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : {
        success: true,
        data: {
          companyId,
          sourceId,
          excerpt,
          snapshotHash: snapshotHash ?? undefined,
          snapshotPath,
          observedAt: input.observedAt ?? null,
          lastVerifiedAt: input.lastVerifiedAt ?? null,
          confidence: input.confidence,
          notes,
        },
      };
}

export function validateSourceInput(input: SourceInput): ValidationResult<SourceInput> {
  const errors: ValidationErrors = {};
  const companyId = input.companyId.trim();
  const url = input.url.trim();
  const sourceType = input.sourceType.trim();
  const title = input.title?.trim() || null;
  const accessibilityStatus = input.accessibilityStatus ?? "accessible";

  if (companyId.length === 0) {
    errors.companyId = "Source must belong to a company.";
  }

  if (!isValidHttpUrl(url)) {
    errors.url = "Source URL must be a valid HTTP or HTTPS URL.";
  }

  if (sourceType.length === 0) {
    errors.sourceType = "Source type is required.";
  } else if (!SOURCE_TYPES.some((type) => type === sourceType)) {
    errors.sourceType = "Choose a supported source type.";
  }

  if (title !== null && title.length > 200) {
    errors.title = "Source title must be 200 characters or fewer.";
  }

  if (!SOURCE_ACCESSIBILITY_STATUSES.includes(accessibilityStatus)) {
    errors.accessibilityStatus = "Choose a valid source accessibility state.";
  }

  for (const [field, date] of [
    ["publishedAt", input.publishedAt],
    ["sourceUpdatedAt", input.sourceUpdatedAt],
    ["lastCheckedAt", input.lastCheckedAt],
  ] as const) {
    if (date !== null && date !== undefined && !isValidDate(date)) {
      errors[field] = "Date must be valid.";
    }
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : {
        success: true,
        data: {
          companyId,
          url,
          sourceType,
          title,
          publishedAt: input.publishedAt ?? null,
          sourceUpdatedAt: input.sourceUpdatedAt ?? null,
          lastCheckedAt: input.lastCheckedAt ?? null,
          accessibilityStatus,
        },
      };
}

export function validateOpportunityInput(
  input: OpportunityInput,
): ValidationResult<OpportunityInput> {
  const errors: ValidationErrors = {};
  const companyId = input.companyId.trim();
  const title = input.title.trim();
  const category = input.category.trim();
  const hypothesis = input.hypothesis.trim();
  const suggestedSolution = input.suggestedSolution?.trim() || null;

  if (companyId.length === 0) {
    errors.companyId = "Opportunity must belong to a company.";
  }

  if (title.length < 5) {
    errors.title = "Opportunity title must be at least 5 characters.";
  }

  if (category.length === 0) {
    errors.category = "Opportunity category is required.";
  }

  if (hypothesis.length < 20) {
    errors.hypothesis = "Opportunity hypothesis must be at least 20 characters.";
  }

  if (!Number.isInteger(input.evidenceCount) || input.evidenceCount < 0) {
    errors.evidenceCount = "Evidence count must be a non-negative integer.";
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : {
        success: true,
        data: {
          companyId,
          title,
          category,
          hypothesis,
          evidenceCount: input.evidenceCount,
          suggestedSolution,
        },
      };
}

const UNSUPPORTED_CLAIM_PATTERN =
  /\b(confirmed failure|proven failure|definitely broken|is broken|company failed|certainly fails)\b/i;

export function containsUnsupportedOpportunityClaim(value: string): boolean {
  return UNSUPPORTED_CLAIM_PATTERN.test(value);
}

export function validateOpportunityRecordInput(
  input: OpportunityRecordInput,
): ValidationResult<OpportunityRecordInput> {
  const errors: ValidationErrors = {};
  const companyId = input.companyId.trim();
  const title = input.title.trim();
  const category = input.category.trim();
  const hypothesis = input.hypothesis.trim();
  const evidenceIds = Array.from(new Set(input.evidenceIds.map((id) => id.trim()).filter(Boolean)));
  const impactDescription = input.impactDescription?.trim() || null;
  const suggestedSolution = input.suggestedSolution?.trim() || null;
  const expectedOutcome = input.expectedOutcome?.trim() || null;
  const verificationNotes = input.verificationNotes?.trim() || null;
  const status = input.status ?? "new";
  const companyConfirmed = input.companyConfirmed ?? false;

  if (companyId.length === 0) errors.companyId = "Opportunity must belong to a company.";
  if (title.length < 5) errors.title = "Opportunity title must be at least 5 characters.";
  if (title.length > 160) errors.title = "Opportunity title must be 160 characters or fewer.";
  if (category.length === 0) errors.category = "Opportunity category is required.";
  if (!OPPORTUNITY_CATEGORIES.includes(category as OpportunityCategory)) {
    errors.category = "Choose a supported opportunity category.";
  }
  if (hypothesis.length < 20) errors.hypothesis = "Hypothesis must be at least 20 characters.";
  if (hypothesis.length > 4000) errors.hypothesis = "Hypothesis must be 4,000 characters or fewer.";
  if (evidenceIds.length > 50) errors.evidenceIds = "Link 50 or fewer evidence records.";
  if (!OPPORTUNITY_STATUSES.includes(status)) errors.status = "Choose a valid opportunity status.";

  for (const [field, value] of [
    ["impactDescription", impactDescription],
    ["suggestedSolution", suggestedSolution],
    ["expectedOutcome", expectedOutcome],
  ] as const) {
    if (value !== null && value.length > 4000)
      errors[field] = `${field} must be 4,000 characters or fewer.`;
  }

  if (verificationNotes !== null && verificationNotes.length > 2000) {
    errors.verificationNotes = "Verification notes must be 2,000 characters or fewer.";
  }

  for (const [field, score] of [
    ["impactScore", input.impactScore],
    ["evidenceScore", input.evidenceScore],
    ["solutionFitScore", input.solutionFitScore],
    ["reachabilityScore", input.reachabilityScore],
  ] as const) {
    if (!isScore(score)) errors[field] = `${field} must be an integer from 1 to 5.`;
  }

  const claimText = [title, hypothesis, impactDescription ?? ""].join(" ");
  if (containsUnsupportedOpportunityClaim(claimText) && !companyConfirmed) {
    errors.hypothesis = "Use hypothesis wording unless the company explicitly confirmed the claim.";
  }
  if (companyConfirmed && !verificationNotes) {
    errors.verificationNotes = "Record how the company explicitly confirmed this claim.";
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : {
        success: true,
        data: {
          companyId,
          title,
          category,
          hypothesis,
          evidenceIds,
          impactDescription,
          suggestedSolution,
          expectedOutcome,
          impactScore: input.impactScore,
          evidenceScore: input.evidenceScore,
          solutionFitScore: input.solutionFitScore,
          reachabilityScore: input.reachabilityScore,
          status,
          verificationNotes,
          companyConfirmed,
        },
      };
}

export function validateContactInput(input: ContactInput): ValidationResult<ContactInput> {
  const errors: ValidationErrors = {};
  const companyId = input.companyId.trim();
  const name = input.name.trim();
  const profileUrl = input.profileUrl?.trim() || null;

  if (companyId.length === 0) {
    errors.companyId = "Contact must belong to a company.";
  }

  if (name.length < 2) {
    errors.name = "Contact name must be at least 2 characters.";
  }

  if (profileUrl !== null && !isValidHttpUrl(profileUrl)) {
    errors.profileUrl = "Profile URL must be a valid HTTP or HTTPS URL.";
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : { success: true, data: { companyId, name, profileUrl } };
}

export function validateContactRecordInput(
  input: ContactRecordInput,
): ValidationResult<ContactRecordInput> {
  const errors: ValidationErrors = {};
  const companyId = input.companyId.trim();
  const name = input.name.trim();
  const role = input.role?.trim() || null;
  const profileUrl = input.profileUrl?.trim() || null;
  const contactMethod = input.contactMethod?.trim() || null;
  const relevanceNotes = input.relevanceNotes?.trim() || null;

  if (companyId.length === 0) errors.companyId = "Contact must belong to a company.";
  if (name.length < 2) errors.name = "Contact name must be at least 2 characters.";
  if (name.length > 120) errors.name = "Contact name must be 120 characters or fewer.";
  if (profileUrl !== null && !isValidHttpUrl(profileUrl)) {
    errors.profileUrl = "Profile URL must be a valid HTTP or HTTPS URL.";
  }
  if (role !== null && role.length > 120) errors.role = "Role must be 120 characters or fewer.";
  if (contactMethod !== null && contactMethod.length > 120) {
    errors.contactMethod = "Contact method must be 120 characters or fewer.";
  }
  if (relevanceNotes !== null && relevanceNotes.length > 2000) {
    errors.relevanceNotes = "Relevance notes must be 2,000 characters or fewer.";
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : {
        success: true,
        data: {
          companyId,
          name,
          role,
          profileUrl,
          contactMethod,
          relevanceNotes,
          doNotContact: input.doNotContact ?? false,
        },
      };
}

export function validateOutreachInput(input: OutreachInput): ValidationResult<OutreachInput> {
  const errors: ValidationErrors = {};
  const opportunityId = input.opportunityId.trim();
  const contactId = input.contactId.trim();
  const channel = input.channel.trim();
  const draftMessage = input.draftMessage.trim();

  if (opportunityId.length === 0) {
    errors.opportunityId = "Outreach must reference an opportunity.";
  }

  if (contactId.length === 0) {
    errors.contactId = "Outreach must reference a contact.";
  }

  if (channel.length === 0) {
    errors.channel = "Outreach channel is required.";
  }

  if (draftMessage.length < 20) {
    errors.draftMessage = "Outreach draft must be at least 20 characters.";
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : {
        success: true,
        data: { opportunityId, contactId, channel, draftMessage },
      };
}

export function validateOutreachRecordInput(
  input: OutreachRecordInput,
): ValidationResult<OutreachRecordInput> {
  const errors: ValidationErrors = {};
  const opportunityId = input.opportunityId.trim();
  const contactId = input.contactId.trim();
  const channel = input.channel.trim();
  const draftMessage = input.draftMessage.trim();
  const responseSummary = input.responseSummary?.trim() || null;
  const nextAction = input.nextAction?.trim() || null;
  const status = input.status ?? "draft";

  if (opportunityId.length === 0) errors.opportunityId = "Outreach must reference an opportunity.";
  if (contactId.length === 0) errors.contactId = "Outreach must reference a contact.";
  if (!OUTREACH_CHANNELS.includes(channel as OutreachChannel)) {
    errors.channel = "Choose a supported outreach channel.";
  }
  if (draftMessage.length < 20)
    errors.draftMessage = "Outreach draft must be at least 20 characters.";
  if (draftMessage.length > 10000)
    errors.draftMessage = "Outreach draft must be 10,000 characters or fewer.";
  if (!OUTREACH_STATUSES.includes(status as OutreachStatus)) {
    errors.status = "Choose a supported outreach status.";
  }
  if (responseSummary !== null && responseSummary.length > 5000) {
    errors.responseSummary = "Response summary must be 5,000 characters or fewer.";
  }
  if (nextAction !== null && nextAction.length > 2000) {
    errors.nextAction = "Next action must be 2,000 characters or fewer.";
  }

  for (const [field, date] of [
    ["sentAt", input.sentAt],
    ["followUpAt", input.followUpAt],
  ] as const) {
    if (date !== null && date !== undefined && !isValidDate(date)) {
      errors[field] = "Date must be valid.";
    }
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : {
        success: true,
        data: {
          opportunityId,
          contactId,
          channel,
          draftMessage,
          sentAt: input.sentAt ?? null,
          followUpAt: input.followUpAt ?? null,
          responseSummary,
          nextAction,
          status,
          confirmClosedOpportunity: input.confirmClosedOpportunity ?? false,
        },
      };
}

export function renderOutreachTemplate(
  template: string,
  values: Partial<Record<OutreachTemplateVariable, string | null | undefined>>,
): { message: string; missingVariables: OutreachTemplateVariable[] } {
  const missingVariables = new Set<OutreachTemplateVariable>();
  const message = template.replace(/\{\{\s*([a-z-]+)\s*\}\}/gi, (match, variable: string) => {
    const normalized = variable.toLowerCase() as OutreachTemplateVariable;
    if (!OUTREACH_TEMPLATE_VARIABLES.includes(normalized)) return match;
    const value = values[normalized]?.trim();
    if (!value) {
      missingVariables.add(normalized);
      return match;
    }
    return value;
  });

  return { message, missingVariables: Array.from(missingVariables) };
}

export function isScore(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function calculatePriorityScore(scores: PriorityScores): number {
  const values = Object.values(scores);

  if (!values.every(isScore)) {
    throw new Error("Priority scores must be integers from 1 to 5.");
  }

  const rawScore =
    scores.impact * 0.35 +
    scores.evidence * 0.3 +
    scores.solutionFit * 0.2 +
    scores.reachability * 0.15;

  return Math.round(rawScore * 100) / 100;
}

export function getFreshnessLabel(
  activityDate: Date | null | undefined,
  referenceDate: Date,
): FreshnessLabel {
  if (!activityDate || !isValidDate(activityDate) || !isValidDate(referenceDate)) {
    return "Undated";
  }

  const ageInDays = Math.max(
    0,
    Math.floor((referenceDate.getTime() - activityDate.getTime()) / MS_PER_DAY),
  );

  if (ageInDays <= 7) {
    return "Hot";
  }

  if (ageInDays <= 30) {
    return "Recent";
  }

  if (ageInDays <= 90) {
    return "Aging";
  }

  return "Historical";
}

export function getLatestEvidenceDate(dates: EvidenceDates): Date | null {
  const validDates = [
    dates.sourcePublishedAt,
    dates.sourceUpdatedAt,
    dates.sourceLastCheckedAt,
    dates.observedAt,
    dates.lastVerifiedAt,
  ].filter((date): date is Date => date instanceof Date && isValidDate(date));

  if (validDates.length === 0) {
    return null;
  }

  return new Date(Math.max(...validDates.map((date) => date.getTime())));
}

export function getEvidenceFreshness(dates: EvidenceDates, referenceDate: Date): FreshnessLabel {
  return getFreshnessLabel(getLatestEvidenceDate(dates), referenceDate);
}

export function getOpportunityFreshness(
  input: OpportunityFreshnessInput,
  referenceDate: Date,
): FreshnessLabel {
  const dates = input.evidenceDates
    .map((evidenceDates) => getLatestEvidenceDate(evidenceDates))
    .filter((date): date is Date => date instanceof Date && isValidDate(date));

  if (input.opportunityLastVerifiedAt && isValidDate(input.opportunityLastVerifiedAt)) {
    dates.push(input.opportunityLastVerifiedAt);
  }

  return getFreshnessLabel(
    dates.length > 0 ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null,
    referenceDate,
  );
}

export function needsOpportunityVerification(input: {
  freshnessLabel: FreshnessLabel;
  status: string;
  allSourcesAccessible: boolean;
}): boolean {
  return (
    input.status === "needs-verification" ||
    input.freshnessLabel === "Aging" ||
    input.freshnessLabel === "Historical" ||
    input.freshnessLabel === "Undated" ||
    !input.allSourcesAccessible
  );
}

export function validateReverificationInput(
  input: ReverificationInput,
): ValidationResult<ReverificationInput> {
  const note = input.note.trim();
  const errors: ValidationErrors = {};

  if (note.length < 5) {
    errors.note = "Add a short note describing what you re-verified.";
  }

  if (note.length > 2000) {
    errors.note = "Re-verification notes must be 2,000 characters or fewer.";
  }

  if (
    input.verifiedAt !== null &&
    input.verifiedAt !== undefined &&
    !isValidDate(input.verifiedAt)
  ) {
    errors.verifiedAt = "Verification date must be valid.";
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : { success: true, data: { note, verifiedAt: input.verifiedAt ?? null } };
}

export function getConfidenceLevel(input: {
  evidenceCount: number;
  independentSourceCount: number;
  hasRecentEvidence: boolean;
  manuallyVerified: boolean;
}): ConfidenceLevel {
  if (
    input.manuallyVerified &&
    input.hasRecentEvidence &&
    (input.evidenceCount >= 2 || input.independentSourceCount >= 2)
  ) {
    return "High";
  }

  if (input.hasRecentEvidence || input.evidenceCount >= 2 || input.independentSourceCount >= 2) {
    return "Medium";
  }

  return "Low";
}

export function canTransitionOpportunityStatus(
  from: OpportunityStatus,
  to: OpportunityStatus,
): boolean {
  if (from === to) {
    return true;
  }

  return STATUS_TRANSITIONS[from].includes(to);
}

export function evaluateOutreachEligibility(
  input: OutreachEligibilityInput,
): OutreachEligibilityResult {
  const reasons: string[] = [];

  if (input.status !== "solution-ready" && input.status !== "ready-for-outreach") {
    reasons.push("Opportunity must have a prepared solution before outreach.");
  }

  if (input.evidenceCount < 1) {
    reasons.push("At least one evidence record is required.");
  }

  if (!input.suggestedSolution?.trim()) {
    reasons.push("A suggested solution is required.");
  }

  if (!input.lastVerifiedAt) {
    reasons.push("Evidence must be manually verified before outreach.");
  } else if (getFreshnessLabel(input.lastVerifiedAt, input.referenceDate) === "Historical") {
    reasons.push("Evidence is more than 90 days old and must be re-verified.");
  } else if (getFreshnessLabel(input.lastVerifiedAt, input.referenceDate) === "Aging") {
    reasons.push("Evidence is 31–90 days old and must be re-verified.");
  }

  if (!input.allSourcesAccessible) {
    reasons.push("Every supporting source must still be accessible.");
  }

  if (!input.manuallyReviewed) {
    reasons.push("The opportunity and message must be manually reviewed.");
  }

  if (!input.hasContact) {
    reasons.push("A relevant contact is required before outreach.");
  }

  if (input.contactDoNotContact) {
    reasons.push("This contact is marked do not contact.");
  }

  if (input.resolvedAt) {
    reasons.push("Resolved opportunities cannot be sent for outreach.");
  }

  return { eligible: reasons.length === 0, reasons };
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}
