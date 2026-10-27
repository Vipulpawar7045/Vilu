import { NextResponse } from "next/server";

import { DiscoveryReviewError, promoteIssueSignal } from "@/lib/discovery-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // An empty body is valid: it promotes the reviewed signal to evidence only.
  }
  const value = isRecord(body) ? body : {};

  try {
    const result = await promoteIssueSignal(id, {
      createOpportunity: value.createOpportunity === true,
      title: nullableString(value.title),
      category: nullableString(value.category),
      hypothesis: nullableString(value.hypothesis),
      suggestedSolution: nullableString(value.suggestedSolution),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DiscoveryReviewError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "The reviewed signal could not be promoted." },
      { status: 500 },
    );
  }
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
