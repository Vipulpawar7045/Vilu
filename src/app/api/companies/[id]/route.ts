import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { validateCompanyRecordInput } from "@/domain/rules";
import { getCompany } from "@/lib/company-service";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const company = await getCompany(id);

  if (!company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  return NextResponse.json({ company });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const current = await prisma.company.findUnique({ where: { id } });

  if (!current) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const input = parseCompanyInput(body, current);
  const validation = validateCompanyRecordInput(input);

  if (!validation.success) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  try {
    const company = await prisma.company.update({
      where: { id },
      data: validation.data,
    });
    return NextResponse.json({ company });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { errors: { websiteUrl: "A company with this website already exists." } },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "The company could not be updated." }, { status: 500 });
  }
}

function parseCompanyInput(
  body: unknown,
  current: {
    name: string;
    websiteUrl: string;
    industry: string | null;
    companyType: string | null;
    sizeEstimate: string | null;
    location: string | null;
    priority: number;
    status: string;
    notes: string | null;
    lastResearchedAt: Date | null;
  },
) {
  const value = isRecord(body) ? body : {};
  const dateValue = value.lastResearchedAt;
  const lastResearchedAt =
    typeof dateValue === "string"
      ? new Date(dateValue)
      : dateValue === null
        ? null
        : current.lastResearchedAt;

  return {
    name: stringOr(value.name, current.name),
    websiteUrl: stringOr(value.websiteUrl, current.websiteUrl),
    industry: nullableString(value.industry, current.industry),
    companyType: nullableString(value.companyType, current.companyType),
    sizeEstimate: nullableString(value.sizeEstimate, current.sizeEstimate),
    location: nullableString(value.location, current.location),
    priority:
      typeof value.priority === "number"
        ? value.priority
        : Number(value.priority ?? current.priority),
    status:
      value.status === "archived"
        ? ("archived" as const)
        : value.status === "active"
          ? ("active" as const)
          : current.status === "archived"
            ? ("archived" as const)
            : ("active" as const),
    notes: nullableString(value.notes, current.notes),
    lastResearchedAt,
  };
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown, fallback: string | null = null): string | null {
  return value === null ? null : typeof value === "string" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
