import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { validateOutreachRecordInput } from "@/domain/rules";
import { getOutreachWorkspaceData } from "@/lib/outreach-service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId")?.trim() || undefined;
  const status = searchParams.get("status")?.trim() || "all";
  const due = ["all", "due", "overdue", "upcoming"].includes(searchParams.get("due") ?? "")
    ? (searchParams.get("due") as "all" | "due" | "overdue" | "upcoming")
    : "all";
  const data = await getOutreachWorkspaceData({ companyId, status, due });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const validation = validateOutreachRecordInput(parseOutreachInput(body));
  if (!validation.success) return NextResponse.json({ errors: validation.errors }, { status: 400 });

  const [opportunity, contact] = await Promise.all([
    prisma.opportunity.findUnique({
      where: { id: validation.data.opportunityId },
      include: { company: true },
    }),
    prisma.contact.findUnique({
      where: { id: validation.data.contactId },
      include: { company: true },
    }),
  ]);
  const relationError = validateRelations(
    opportunity,
    contact,
    validation.data.confirmClosedOpportunity ?? false,
  );
  if (relationError) return NextResponse.json(relationError.body, { status: relationError.status });

  if (contact?.doNotContact)
    return NextResponse.json({ error: "This contact is marked do not contact." }, { status: 400 });
  if (opportunity?.company.status === "archived")
    return NextResponse.json(
      { error: "Archived companies cannot receive outreach." },
      { status: 400 },
    );

  try {
    const outreach = await prisma.outreach.create({
      data: {
        opportunityId: validation.data.opportunityId,
        contactId: validation.data.contactId,
        channel: validation.data.channel,
        draftMessage: validation.data.draftMessage,
        sentAt: validation.data.sentAt,
        followUpAt: validation.data.followUpAt,
        responseSummary: validation.data.responseSummary,
        nextAction: validation.data.nextAction,
        status: validation.data.status,
      },
      include: { contact: true, opportunity: true },
    });
    return NextResponse.json({ outreach }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
      return NextResponse.json(
        { error: "The selected opportunity or contact no longer exists." },
        { status: 400 },
      );
    return NextResponse.json({ error: "The outreach draft could not be saved." }, { status: 500 });
  }
}

function parseOutreachInput(body: unknown) {
  const value = isRecord(body) ? body : {};
  return {
    opportunityId: stringValue(value.opportunityId),
    contactId: stringValue(value.contactId),
    channel: stringValue(value.channel),
    draftMessage: stringValue(value.draftMessage),
    sentAt: parseDate(value.sentAt),
    followUpAt: parseDate(value.followUpAt),
    responseSummary: nullableString(value.responseSummary),
    nextAction: nullableString(value.nextAction),
    status: typeof value.status === "string" ? value.status : "draft",
    confirmClosedOpportunity: value.confirmClosedOpportunity === true,
  };
}

function validateRelations(
  opportunity: { companyId: string; status: string; company: { id: string } } | null,
  contact: { companyId: string; company: { id: string } } | null,
  confirmed: boolean,
) {
  if (!opportunity)
    return { status: 404, body: { errors: { opportunityId: "Opportunity could not be found." } } };
  if (!contact)
    return { status: 404, body: { errors: { contactId: "Contact could not be found." } } };
  if (opportunity.companyId !== contact.companyId)
    return {
      status: 400,
      body: { errors: { contactId: "Contact and opportunity must belong to the same company." } },
    };
  if ((opportunity.status === "resolved" || opportunity.status === "rejected") && !confirmed)
    return {
      status: 400,
      body: {
        errors: {
          opportunityId:
            "This opportunity is resolved or rejected. Confirm before creating new outreach.",
        },
      },
    };
  return null;
}

function parseDate(value: unknown): Date | null {
  return typeof value === "string" && value.trim() ? new Date(value) : null;
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
