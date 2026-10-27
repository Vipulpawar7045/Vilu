export const AI_DRAFT_KINDS = [
  "summary",
  "hypothesis",
  "classification",
  "scores",
  "solution",
  "outreach",
  "missing-information",
] as const;

export type AiDraftKind = (typeof AI_DRAFT_KINDS)[number];

export const AI_DRAFT_STATUSES = ["draft", "approved", "rejected"] as const;

export type AiDraftStatus = (typeof AI_DRAFT_STATUSES)[number];

export function isAiDraftKind(value: unknown): value is AiDraftKind {
  return typeof value === "string" && AI_DRAFT_KINDS.includes(value as AiDraftKind);
}

export function isAiDraftStatus(value: unknown): value is AiDraftStatus {
  return typeof value === "string" && AI_DRAFT_STATUSES.includes(value as AiDraftStatus);
}
