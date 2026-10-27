import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { validateContactRecordInput } from "@/domain/rules";
import { getContactWorkspaceData } from "@/lib/contact-service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId")?.trim() || undefined;
  const data = await getContactWorkspaceData(companyId);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const validation = validateContactRecordInput(parseContactInput(body));
  if (!validation.success) return NextResponse.json({ errors: validation.errors }, { status: 400 });

  const company = await prisma.company.findUnique({
    where: { id: validation.data.companyId },
    select: { id: true, status: true },
  });
  if (!company)
    return NextResponse.json(
      { errors: { companyId: "Company could not be found." } },
      { status: 404 },
    );
  if (company.status === "archived") {
    return NextResponse.json(
      { errors: { companyId: "Archived companies cannot receive new contacts." } },
      { status: 400 },
    );
  }

  try {
    const contact = await prisma.contact.create({
      data: validation.data,
      include: { company: true },
    });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { errors: { name: "This contact already exists for the company." } },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "The contact could not be saved." }, { status: 500 });
  }
}

function parseContactInput(body: unknown) {
  const value = isRecord(body) ? body : {};
  return {
    companyId: stringValue(value.companyId),
    name: stringValue(value.name),
    role: nullableString(value.role),
    profileUrl: nullableString(value.profileUrl),
    contactMethod: nullableString(value.contactMethod),
    relevanceNotes: nullableString(value.relevanceNotes),
    doNotContact: value.doNotContact === true,
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
