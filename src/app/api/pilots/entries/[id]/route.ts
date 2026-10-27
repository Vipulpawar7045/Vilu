import { NextResponse } from "next/server";

import { validatePilotEntryInput } from "@/domain/pilot";
import { prisma } from "@/lib/prisma";
import { entryInclude, parseInput } from "@/app/api/pilots/entries/route";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await prisma.pilotEntry.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Pilot entry not found." }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = validateInput(body, current);
  parsed.pilotId = current.pilotId;
  const validation = validatePilotEntryInput(parsed);
  if (!validation.success) return NextResponse.json({ errors: validation.errors }, { status: 400 });
  const [company, opportunity, outreach] = await Promise.all([
    prisma.company.findUnique({
      where: { id: validation.data.companyId },
      select: { id: true, status: true },
    }),
    validation.data.opportunityId
      ? prisma.opportunity.findUnique({
          where: { id: validation.data.opportunityId },
          select: { id: true, companyId: true },
        })
      : null,
    validation.data.outreachId
      ? prisma.outreach.findUnique({
          where: { id: validation.data.outreachId },
          include: {
            opportunity: { select: { id: true, companyId: true } },
            contact: { select: { doNotContact: true } },
          },
        })
      : null,
  ]);
  if (!company)
    return NextResponse.json({ errors: { companyId: "Company not found." } }, { status: 404 });
  if (company.status === "archived")
    return NextResponse.json(
      { errors: { companyId: "Archived companies cannot be used in a pilot." } },
      { status: 400 },
    );
  if (opportunity && opportunity.companyId !== validation.data.companyId)
    return NextResponse.json(
      { errors: { opportunityId: "Opportunity must belong to the selected company." } },
      { status: 400 },
    );
  if (validation.data.opportunityId && !opportunity)
    return NextResponse.json(
      { errors: { opportunityId: "Opportunity not found." } },
      { status: 404 },
    );
  if (validation.data.outreachId && !outreach)
    return NextResponse.json(
      { errors: { outreachId: "Outreach record not found." } },
      { status: 404 },
    );
  if (outreach?.contact.doNotContact && validation.data.messageSentAt)
    return NextResponse.json(
      { error: "This contact is marked do not contact; a sent pilot message cannot be recorded." },
      { status: 400 },
    );
  const entry = await prisma.pilotEntry.update({
    where: { id },
    data: validation.data,
    include: entryInclude,
  });
  return NextResponse.json({ entry });
}

function validateInput(body: unknown, current: Record<string, unknown>) {
  return parseInput(body, current);
}
