import { NextResponse } from "next/server";

import {
  CollectionInputError,
  collectCompanyPage,
  getCollectionWorkspaceData,
} from "@/lib/collection-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim();
  const companyId = searchParams.get("companyId")?.trim();
  const data = await getCollectionWorkspaceData();
  const candidates = data.candidates.filter((candidate) => {
    const matchesStatus = !status || candidate.reviewStatus === status;
    const matchesCompany = !companyId || candidate.companyId === companyId;
    return matchesStatus && matchesCompany;
  });
  return NextResponse.json(
    { companies: data.companies, candidates },
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
  const companyId = typeof value.companyId === "string" ? value.companyId : "";
  const url = typeof value.url === "string" ? value.url : "";

  try {
    const result = await collectCompanyPage(companyId, url);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof CollectionInputError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The page could not be collected." },
      { status: 500 },
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
