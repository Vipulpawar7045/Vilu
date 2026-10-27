import { NextResponse } from "next/server";

import { createServiceCapability, DiscoveryInputError } from "@/lib/discovery-service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const capabilities = await prisma.serviceCapability.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(
    { capabilities },
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
    const capability = await createServiceCapability({
      name: stringValue(value.name),
      description: stringValue(value.description),
      category: nullableString(value.category),
      keywords: stringValue(value.keywords),
      estimatedEffort: nullableString(value.estimatedEffort),
      expectedOutcome: nullableString(value.expectedOutcome),
      nextAction: nullableString(value.nextAction),
    });
    return NextResponse.json({ capability }, { status: 201 });
  } catch (error) {
    if (error instanceof DiscoveryInputError)
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    return NextResponse.json(
      { error: "The service capability could not be created. Its name may already exist." },
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
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
