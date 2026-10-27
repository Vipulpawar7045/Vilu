import { NextResponse } from "next/server";

import { DiscoveryReviewError, createSolutionMatch } from "@/lib/discovery-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const value = isRecord(body) ? body : {};
  if (typeof value.capabilityId !== "string" || !value.capabilityId) {
    return NextResponse.json(
      { errors: { capabilityId: "Choose a service capability." } },
      { status: 400 },
    );
  }
  try {
    const match = await createSolutionMatch(id, value.capabilityId, {
      rationale: nullableString(value.rationale),
      expectedOutcome: nullableString(value.expectedOutcome),
      nextAction: nullableString(value.nextAction),
    });
    return NextResponse.json({ match }, { status: 201 });
  } catch (error) {
    if (error instanceof DiscoveryReviewError)
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    return NextResponse.json({ error: "The solution match could not be saved." }, { status: 409 });
  }
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
