import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { type SourceAccessibilityStatus, validateSourceInput } from "@/domain/rules";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await prisma.source.findUnique({
    where: { id },
    include: { _count: { select: { evidence: true } } },
  });

  if (!current) return NextResponse.json({ error: "Source not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const value = isRecord(body) ? body : {};
  const accessibilityStatus =
    typeof value.accessibilityStatus === "string"
      ? (value.accessibilityStatus as SourceAccessibilityStatus)
      : (current.accessibilityStatus as SourceAccessibilityStatus);
  const validation = validateSourceInput({
    companyId: typeof value.companyId === "string" ? value.companyId : current.companyId,
    url: typeof value.url === "string" ? value.url : current.url,
    sourceType: typeof value.sourceType === "string" ? value.sourceType : current.sourceType,
    title:
      value.title === null ? null : typeof value.title === "string" ? value.title : current.title,
    publishedAt:
      typeof value.publishedAt === "string" ? new Date(value.publishedAt) : current.publishedAt,
    sourceUpdatedAt:
      typeof value.sourceUpdatedAt === "string"
        ? new Date(value.sourceUpdatedAt)
        : current.sourceUpdatedAt,
    lastCheckedAt:
      typeof value.lastCheckedAt === "string"
        ? new Date(value.lastCheckedAt)
        : current.lastCheckedAt,
    accessibilityStatus,
  });

  if (!validation.success) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  if (validation.data.companyId !== current.companyId && current._count.evidence > 0) {
    return NextResponse.json(
      { errors: { companyId: "A source with evidence cannot be moved to another company." } },
      { status: 400 },
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: validation.data.companyId },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json(
      { errors: { companyId: "Company could not be found." } },
      { status: 404 },
    );
  }

  try {
    const source = await prisma.source.update({
      where: { id },
      data: validation.data,
      include: { company: true },
    });
    return NextResponse.json({ source });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { errors: { url: "This source URL already exists for the company." } },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "The source could not be updated." }, { status: 500 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
