import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { validateEvidenceInput } from "@/domain/rules";
import { getEvidenceWorkspaceData } from "@/lib/evidence-service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId")?.trim() || undefined;
  const data = await getEvidenceWorkspaceData(companyId);

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const input = parseEvidenceInput(body);
  const validation = validateEvidenceInput(input);

  if (!validation.success) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const [company, source] = await Promise.all([
    prisma.company.findUnique({ where: { id: validation.data.companyId }, select: { id: true } }),
    prisma.source.findUnique({
      where: { id: validation.data.sourceId },
      select: { id: true, companyId: true },
    }),
  ]);

  if (!company) {
    return NextResponse.json(
      { errors: { companyId: "Company could not be found." } },
      { status: 404 },
    );
  }

  if (!source) {
    return NextResponse.json(
      { errors: { sourceId: "Source could not be found." } },
      { status: 404 },
    );
  }

  if (source.companyId !== company.id) {
    return NextResponse.json(
      { errors: { sourceId: "Evidence source must belong to the selected company." } },
      { status: 400 },
    );
  }

  try {
    const evidence = await prisma.evidence.create({
      data: {
        companyId: validation.data.companyId,
        sourceId: validation.data.sourceId,
        excerpt: validation.data.excerpt,
        snapshotPath: validation.data.snapshotPath,
        observedAt: validation.data.observedAt ?? new Date(),
        lastVerifiedAt: validation.data.lastVerifiedAt,
        snapshotHash: validation.data.snapshotHash ?? createEvidenceHash(validation.data),
        confidence: validation.data.confidence ?? 1,
        notes: validation.data.notes,
      },
      include: { source: true, company: true },
    });

    return NextResponse.json({ evidence }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { errors: { snapshotHash: "This evidence snapshot already exists." } },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "The evidence could not be saved." }, { status: 500 });
  }
}

function parseEvidenceInput(body: unknown) {
  const value = isRecord(body) ? body : {};

  return {
    companyId: stringValue(value.companyId),
    sourceId: stringValue(value.sourceId),
    excerpt: stringValue(value.excerpt),
    snapshotHash: optionalString(value.snapshotHash),
    snapshotPath: optionalString(value.snapshotPath),
    observedAt: parseDate(value.observedAt),
    lastVerifiedAt: parseDate(value.lastVerifiedAt),
    confidence:
      typeof value.confidence === "number" ? value.confidence : Number(value.confidence ?? 1),
    notes: optionalString(value.notes),
  };
}

function createEvidenceHash(input: {
  companyId: string;
  sourceId: string;
  excerpt: string;
  observedAt?: Date | null;
}): string {
  return createHash("sha256")
    .update(
      `${input.companyId}|${input.sourceId}|${input.observedAt?.toISOString() ?? ""}|${input.excerpt}`,
    )
    .digest("hex");
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return new Date(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
