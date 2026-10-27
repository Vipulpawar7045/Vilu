import { NextResponse } from "next/server";

import { validatePilotInput } from "@/domain/pilot";
import { getPilotWorkspaceData } from "@/lib/pilot-service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const pilotId = new URL(request.url).searchParams.get("pilotId")?.trim() || undefined;
  const data = await getPilotWorkspaceData(pilotId);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const value = isRecord(body) ? body : {};
  const validation = validatePilotInput({
    name: stringValue(value.name),
    niche: stringValue(value.niche),
    targetCompanies: numberValue(value.targetCompanies, 25),
    targetMessages: numberValue(value.targetMessages, 10),
    status:
      value.status === "active" || value.status === "completed" || value.status === "archived"
        ? value.status
        : "planned",
    startedAt: parseDate(value.startedAt),
    endedAt: parseDate(value.endedAt),
    notes: nullableString(value.notes),
  });
  if (!validation.success) return NextResponse.json({ errors: validation.errors }, { status: 400 });

  const pilot = await prisma.pilot.create({ data: validation.data });
  return NextResponse.json({ pilot }, { status: 201 });
}

function parseDate(value: unknown): Date | null {
  return typeof value === "string" && value.trim() ? new Date(value) : null;
}
function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : Number(value ?? fallback);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
