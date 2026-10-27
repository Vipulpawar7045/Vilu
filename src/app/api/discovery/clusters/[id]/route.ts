import { NextResponse } from "next/server";

import { isClusterResolutionState } from "@/domain/intelligence";
import { DiscoveryReviewError, updateClusterResolution } from "@/lib/discovery-service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const value = isRecord(body) ? body : {};
  if (!isClusterResolutionState(value.resolutionState)) {
    return NextResponse.json(
      { errors: { resolutionState: "Choose a valid cluster resolution state." } },
      { status: 400 },
    );
  }
  try {
    const cluster = await updateClusterResolution(id, value.resolutionState);
    return NextResponse.json({ cluster });
  } catch (error) {
    if (error instanceof DiscoveryReviewError)
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    return NextResponse.json({ error: "The cluster state could not be saved." }, { status: 500 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
