import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { validateCompanyRecordInput } from "@/domain/rules";
import { listCompanies } from "@/lib/company-service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? "active";
  const status = ["active", "archived", "all"].includes(statusParam)
    ? (statusParam as "active" | "archived" | "all")
    : "active";

  const companies = await listCompanies({
    query: searchParams.get("q") ?? "",
    status,
  });

  return NextResponse.json({ companies }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const input = parseCompanyInput(body);
  const validation = validateCompanyRecordInput(input);

  if (!validation.success) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  try {
    const company = await prisma.company.create({ data: validation.data });
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { errors: { websiteUrl: "A company with this website already exists." } },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "The company could not be saved." }, { status: 500 });
  }
}

function parseCompanyInput(body: unknown) {
  const value = isRecord(body) ? body : {};
  const rawDate = typeof value.lastResearchedAt === "string" ? value.lastResearchedAt : null;

  return {
    name: typeof value.name === "string" ? value.name : "",
    websiteUrl: typeof value.websiteUrl === "string" ? value.websiteUrl : "",
    industry: nullableString(value.industry),
    companyType: nullableString(value.companyType),
    sizeEstimate: nullableString(value.sizeEstimate),
    location: nullableString(value.location),
    priority: typeof value.priority === "number" ? value.priority : Number(value.priority ?? 3),
    status: value.status === "archived" ? ("archived" as const) : ("active" as const),
    notes: nullableString(value.notes),
    lastResearchedAt: rawDate ? new Date(rawDate) : null,
  };
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
