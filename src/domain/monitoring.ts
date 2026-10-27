export const MONITORING_RESULT_STATUSES = [
  "unchanged",
  "changed",
  "missing",
  "blocked",
  "failed",
] as const;

export type MonitoringResultStatus = (typeof MONITORING_RESULT_STATUSES)[number];

export const MONITORING_REVIEW_STATUSES = ["pending", "acknowledged", "not-needed"] as const;

export type MonitoringReviewStatus = (typeof MONITORING_REVIEW_STATUSES)[number];

export function isMonitoringReviewStatus(value: unknown): value is MonitoringReviewStatus {
  return (
    typeof value === "string" &&
    MONITORING_REVIEW_STATUSES.includes(value as MonitoringReviewStatus)
  );
}

export function isMonitoringResultStatus(value: unknown): value is MonitoringResultStatus {
  return (
    typeof value === "string" &&
    MONITORING_RESULT_STATUSES.includes(value as MonitoringResultStatus)
  );
}
