import { NextResponse } from "next/server";

import { createSavedSearch, DiscoveryInputError } from "@/lib/discovery-service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const savedSearches = await prisma.savedSearch.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(
    { savedSearches },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const value = isRecord(body) ? body : {};
  try {
    const savedSearch = await createSavedSearch({
      name: stringValue(value.name),
      companyId: nullableString(value.companyId),
      reviewStatus: nullableString(value.reviewStatus),
      sourceType: nullableString(value.sourceType),
      minimumScore: numberOrNull(value.minimumScore),
    });
    return NextResponse.json({ savedSearch }, { status: 201 });
  } catch (error) {
    if (error instanceof DiscoveryInputError)
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    return NextResponse.json(
      { error: "The saved search could not be created. Its name may already exist." },
      { status: 409 },
    );
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
function numberOrNull(value: unknown) {
  return value === null || value === undefined || value === "" ? null : Number(value);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
