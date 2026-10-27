import { NextResponse } from "next/server";

import { isSolutionMatchReviewStatus } from "@/domain/intelligence";
import { DiscoveryReviewError, updateSolutionMatchReview } from "@/lib/discovery-service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const status = isRecord(body) ? body.reviewStatus : undefined;
  if (!isSolutionMatchReviewStatus(status))
    return NextResponse.json(
      { errors: { reviewStatus: "Choose a valid match review status." } },
      { status: 400 },
    );
  try {
    const match = await updateSolutionMatchReview(id, status);
    return NextResponse.json({ match });
  } catch (error) {
    if (error instanceof DiscoveryReviewError)
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    return NextResponse.json(
      { error: "The solution match review could not be saved." },
      { status: 500 },
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
