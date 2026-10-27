import { NextResponse } from "next/server";

import { validatePilotInput } from "@/domain/pilot";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await prisma.pilot.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Pilot not found." }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const value = isRecord(body) ? body : {};
  const validation = validatePilotInput({
    name: typeof value.name === "string" ? value.name : current.name,
    niche: typeof value.niche === "string" ? value.niche : current.niche,
    targetCompanies:
      value.targetCompanies === undefined
        ? current.targetCompanies
        : numberValue(value.targetCompanies, current.targetCompanies),
    targetMessages:
      value.targetMessages === undefined
        ? current.targetMessages
        : numberValue(value.targetMessages, current.targetMessages),
    status:
      typeof value.status === "string"
        ? (value.status as "planned" | "active" | "completed" | "archived")
        : (current.status as "planned" | "active" | "completed" | "archived"),
    startedAt:
      value.startedAt === null
        ? null
        : typeof value.startedAt === "string"
          ? new Date(value.startedAt)
          : current.startedAt,
    endedAt:
      value.endedAt === null
        ? null
        : typeof value.endedAt === "string"
          ? new Date(value.endedAt)
          : current.endedAt,
    notes:
      value.notes === null ? null : typeof value.notes === "string" ? value.notes : current.notes,
  });
  if (!validation.success) return NextResponse.json({ errors: validation.errors }, { status: 400 });
  const pilot = await prisma.pilot.update({ where: { id }, data: validation.data });
  return NextResponse.json({ pilot });
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : Number(value ?? fallback);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
