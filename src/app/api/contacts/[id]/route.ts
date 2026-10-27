import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { validateContactRecordInput } from "@/domain/rules";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await prisma.contact.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Contact not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const value = isRecord(body) ? body : {};
  const validation = validateContactRecordInput({
    companyId: typeof value.companyId === "string" ? value.companyId : current.companyId,
    name: typeof value.name === "string" ? value.name : current.name,
    role: value.role === null ? null : typeof value.role === "string" ? value.role : current.role,
    profileUrl:
      value.profileUrl === null
        ? null
        : typeof value.profileUrl === "string"
          ? value.profileUrl
          : current.profileUrl,
    contactMethod:
      value.contactMethod === null
        ? null
        : typeof value.contactMethod === "string"
          ? value.contactMethod
          : current.contactMethod,
    relevanceNotes:
      value.relevanceNotes === null
        ? null
        : typeof value.relevanceNotes === "string"
          ? value.relevanceNotes
          : current.relevanceNotes,
    doNotContact:
      typeof value.doNotContact === "boolean" ? value.doNotContact : current.doNotContact,
  });
  if (!validation.success) return NextResponse.json({ errors: validation.errors }, { status: 400 });

  const company = await prisma.company.findUnique({
    where: { id: validation.data.companyId },
    select: { id: true },
  });
  if (!company)
    return NextResponse.json(
      { errors: { companyId: "Company could not be found." } },
      { status: 404 },
    );

  try {
    const contact = await prisma.contact.update({
      where: { id },
      data: validation.data,
      include: { company: true },
    });
    return NextResponse.json({ contact });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { errors: { name: "This contact already exists for the company." } },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "The contact could not be updated." }, { status: 500 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
