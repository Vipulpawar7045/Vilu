import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { validateEvidenceInput } from "@/domain/rules";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await prisma.evidence.findUnique({ where: { id } });

  if (!current) {
    return NextResponse.json({ error: "Evidence not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const value = isRecord(body) ? body : {};
  const input = {
    companyId: typeof value.companyId === "string" ? value.companyId : current.companyId,
    sourceId: typeof value.sourceId === "string" ? value.sourceId : current.sourceId,
    excerpt: typeof value.excerpt === "string" ? value.excerpt : current.excerpt,
    snapshotHash:
      typeof value.snapshotHash === "string" ? value.snapshotHash : current.snapshotHash,
    snapshotPath:
      value.snapshotPath === null
        ? null
        : typeof value.snapshotPath === "string"
          ? value.snapshotPath
          : current.snapshotPath,
    observedAt:
      typeof value.observedAt === "string" ? new Date(value.observedAt) : current.observedAt,
    lastVerifiedAt:
      value.lastVerifiedAt === null
        ? null
        : typeof value.lastVerifiedAt === "string"
          ? new Date(value.lastVerifiedAt)
          : current.lastVerifiedAt,
    confidence: typeof value.confidence === "number" ? value.confidence : current.confidence,
    notes:
      value.notes === null ? null : typeof value.notes === "string" ? value.notes : current.notes,
  };
  const validation = validateEvidenceInput(input);

  if (!validation.success) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  if (validation.data.companyId !== current.companyId) {
    return NextResponse.json(
      { errors: { companyId: "An evidence record cannot be moved to another company." } },
      { status: 400 },
    );
  }

  const source = await prisma.source.findUnique({
    where: { id: validation.data.sourceId },
    select: { companyId: true },
  });
  if (!source || source.companyId !== validation.data.companyId) {
    return NextResponse.json(
      { errors: { sourceId: "Evidence source must belong to the selected company." } },
      { status: 400 },
    );
  }

  try {
    const evidence = await prisma.evidence.update({
      where: { id },
      data: {
        companyId: validation.data.companyId,
        sourceId: validation.data.sourceId,
        excerpt: validation.data.excerpt,
        snapshotPath: validation.data.snapshotPath,
        observedAt: validation.data.observedAt ?? current.observedAt,
        lastVerifiedAt: validation.data.lastVerifiedAt,
        snapshotHash: validation.data.snapshotHash ?? createEvidenceHash(validation.data),
        confidence: validation.data.confidence ?? current.confidence,
        notes: validation.data.notes,
      },
      include: { source: true, company: true },
    });

    return NextResponse.json({ evidence });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { errors: { snapshotHash: "This evidence snapshot already exists." } },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "The evidence could not be updated." }, { status: 500 });
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
