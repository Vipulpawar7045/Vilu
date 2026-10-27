import { NextResponse } from "next/server";

import {
  bulkUpdateIssueSignalReview,
  DiscoveryReviewError,
  isDiscoveryReviewStatus,
} from "@/lib/discovery-service";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const value = isRecord(body) ? body : {};
  const ids = Array.isArray(value.ids)
    ? value.ids.filter((id): id is string => typeof id === "string")
    : [];
  const reviewStatus = value.reviewStatus;
  if (!isDiscoveryReviewStatus(reviewStatus)) {
    return NextResponse.json(
      { errors: { reviewStatus: "Choose a valid discovery review status." } },
      { status: 400 },
    );
  }
  try {
    const signals = await bulkUpdateIssueSignalReview(ids, reviewStatus, value.confirmed === true);
    return NextResponse.json({ signals });
  } catch (error) {
    if (error instanceof DiscoveryReviewError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "The bulk review action could not be saved." },
      { status: 500 },
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
