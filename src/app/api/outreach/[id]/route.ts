import { NextResponse } from "next/server";

import { validateOutreachRecordInput } from "@/domain/rules";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await prisma.outreach.findUnique({
    where: { id },
    include: { opportunity: true, contact: true },
  });
  if (!current) return NextResponse.json({ error: "Outreach record not found." }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const value = isRecord(body) ? body : {};
  const validation = validateOutreachRecordInput({
    opportunityId:
      typeof value.opportunityId === "string" ? value.opportunityId : current.opportunityId,
    contactId: typeof value.contactId === "string" ? value.contactId : current.contactId,
    channel: typeof value.channel === "string" ? value.channel : current.channel,
    draftMessage:
      typeof value.draftMessage === "string" ? value.draftMessage : current.draftMessage,
    sentAt:
      value.sentAt === null
        ? null
        : typeof value.sentAt === "string"
          ? new Date(value.sentAt)
          : current.sentAt,
    followUpAt:
      value.followUpAt === null
        ? null
        : typeof value.followUpAt === "string"
          ? new Date(value.followUpAt)
          : current.followUpAt,
    responseSummary:
      value.responseSummary === null
        ? null
        : typeof value.responseSummary === "string"
          ? value.responseSummary
          : current.responseSummary,
    nextAction:
      value.nextAction === null
        ? null
        : typeof value.nextAction === "string"
          ? value.nextAction
          : current.nextAction,
    status: typeof value.status === "string" ? value.status : current.status,
    confirmClosedOpportunity: value.confirmClosedOpportunity === true,
  });
  if (!validation.success) return NextResponse.json({ errors: validation.errors }, { status: 400 });

  const [opportunity, contact] = await Promise.all([
    prisma.opportunity.findUnique({ where: { id: validation.data.opportunityId } }),
    prisma.contact.findUnique({ where: { id: validation.data.contactId } }),
  ]);
  if (!opportunity || !contact)
    return NextResponse.json(
      { error: "The selected opportunity or contact no longer exists." },
      { status: 400 },
    );
  if (opportunity.companyId !== contact.companyId)
    return NextResponse.json(
      { errors: { contactId: "Contact and opportunity must belong to the same company." } },
      { status: 400 },
    );
  const nextStatus = validation.data.status ?? "draft";
  if (
    contact.doNotContact &&
    (validation.data.sentAt || ["contacted", "follow-up-due", "replied"].includes(nextStatus))
  )
    return NextResponse.json(
      {
        error: "This contact is marked do not contact; sending and follow-up updates are blocked.",
      },
      { status: 400 },
    );

  const outreach = await prisma.outreach.update({
    where: { id },
    data: {
      opportunityId: validation.data.opportunityId,
      contactId: validation.data.contactId,
      channel: validation.data.channel,
      draftMessage: validation.data.draftMessage,
      sentAt: validation.data.sentAt,
      followUpAt: validation.data.followUpAt,
      responseSummary: validation.data.responseSummary,
      nextAction: validation.data.nextAction,
      status: nextStatus,
    },
    include: { contact: true, opportunity: true },
  });
  return NextResponse.json({ outreach });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
