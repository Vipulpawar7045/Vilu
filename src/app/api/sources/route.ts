import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { type SourceAccessibilityStatus, validateSourceInput } from "@/domain/rules";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId")?.trim() || undefined;
  const sources = await prisma.source.findMany({
    where: companyId ? { companyId } : undefined,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      company: { select: { id: true, name: true } },
      _count: { select: { evidence: true } },
    },
  });

  return NextResponse.json({ sources }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const validation = validateSourceInput(parseSourceInput(body));
  if (!validation.success) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
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
    const source = await prisma.source.create({
      data: validation.data,
      include: { company: true },
    });
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { errors: { url: "This source URL already exists for the company." } },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "The source could not be saved." }, { status: 500 });
  }
}

function parseSourceInput(body: unknown) {
  const value = isRecord(body) ? body : {};
  const accessibilityStatus =
    typeof value.accessibilityStatus === "string"
      ? (value.accessibilityStatus as SourceAccessibilityStatus)
      : "accessible";

  return {
    companyId: stringValue(value.companyId),
    url: stringValue(value.url),
    sourceType: stringValue(value.sourceType),
    title: optionalString(value.title),
    publishedAt: parseDate(value.publishedAt),
    sourceUpdatedAt: parseDate(value.sourceUpdatedAt),
    lastCheckedAt: parseDate(value.lastCheckedAt),
    accessibilityStatus,
  };
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
