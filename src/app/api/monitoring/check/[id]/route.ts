import { NextResponse } from "next/server";

import { isMonitoringReviewStatus, MONITORING_REVIEW_STATUSES } from "@/domain/monitoring";
import { updateMonitoringReview } from "@/lib/monitoring-service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const reviewStatus = isRecord(body) ? body.reviewStatus : undefined;
  if (!isMonitoringReviewStatus(reviewStatus)) {
    return NextResponse.json(
      { errors: { reviewStatus: `Choose one of: ${MONITORING_REVIEW_STATUSES.join(", ")}.` } },
      { status: 400 },
    );
  }

  try {
    const check = await updateMonitoringReview(id, reviewStatus);
    return NextResponse.json({ check });
  } catch {
    return NextResponse.json({ error: "Monitoring alert could not be found." }, { status: 404 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
