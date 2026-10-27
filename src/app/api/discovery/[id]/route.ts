import { NextResponse } from "next/server";

import {
  DiscoveryReviewError,
  isDiscoveryReviewStatus,
  updateIssueSignalReview,
} from "@/lib/discovery-service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const reviewStatus = isRecord(body) ? body.reviewStatus : undefined;
  if (!isDiscoveryReviewStatus(reviewStatus)) {
    return NextResponse.json(
      { errors: { reviewStatus: "Choose a valid discovery review status." } },
      { status: 400 },
    );
  }

  try {
    const signal = await updateIssueSignalReview(id, reviewStatus);
    return NextResponse.json({ signal });
  } catch (error) {
    if (error instanceof DiscoveryReviewError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "The discovery review status could not be saved." },
      { status: 500 },
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
