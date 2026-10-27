import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { validatePilotEntryInput, type PilotEntryInput } from "@/domain/pilot";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const validation = validatePilotEntryInput(parseInput(body));
  if (!validation.success) return NextResponse.json({ errors: validation.errors }, { status: 400 });
  const relationError = await validateRelations(validation.data);
  if (relationError) return NextResponse.json(relationError.body, { status: relationError.status });
  try {
    const entry = await prisma.pilotEntry.create({
      data: validation.data,
      include: entryInclude,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "A selected related record no longer exists." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "The pilot entry could not be saved." }, { status: 500 });
  }
}

export const entryInclude = {
  company: { select: { id: true, name: true, websiteUrl: true } },
  opportunity: { select: { id: true, companyId: true, title: true, category: true, status: true } },
  outreach: { select: { id: true, status: true, sentAt: true, responseSummary: true } },
} as const;

export function parseInput(body: unknown, current?: Record<string, unknown>) {
  const value = isRecord(body) ? body : {};
  const getString = (key: string) =>
    typeof value[key] === "string" ? value[key] : String(current?.[key] ?? "");
  const getNullableString = (key: string) =>
    value[key] === null
      ? null
      : typeof value[key] === "string"
        ? value[key]
        : ((current?.[key] as string | null | undefined) ?? null);
  const getDate = (key: string) =>
    value[key] === null
      ? null
      : typeof value[key] === "string"
        ? new Date(value[key])
        : ((current?.[key] as Date | null | undefined) ?? null);
  const getScore = (key: string) =>
    value[key] === undefined ? Number(current?.[key] ?? 1) : Number(value[key]);
  return {
    pilotId: getString("pilotId"),
    companyId: getString("companyId"),
    opportunityId: getNullableString("opportunityId"),
    outreachId: getNullableString("outreachId"),
    sourceCategory: getString("sourceCategory"),
    issueCategory: getString("issueCategory"),
    issueCluster: getNullableString("issueCluster"),
    sourceUrl: getString("sourceUrl"),
    evidenceDate: getDate("evidenceDate"),
    observedAt: getDate("observedAt"),
    lastVerifiedAt: getDate("lastVerifiedAt"),
    manuallyReviewed:
      typeof value.manuallyReviewed === "boolean"
        ? value.manuallyReviewed
        : Boolean(current?.manuallyReviewed),
    impactScore: getScore("impactScore"),
    evidenceScore: getScore("evidenceScore"),
    solutionFitScore: getScore("solutionFitScore"),
    reachabilityScore: getScore("reachabilityScore"),
    proposedSolution: getString("proposedSolution"),
    messageSentAt: getDate("messageSentAt"),
    replyStatus: (typeof value.replyStatus === "string"
      ? value.replyStatus
      : String(current?.replyStatus ?? "not-contacted")) as
      "not-contacted" | "no-reply" | "positive" | "negative" | "objection",
    replySummary: getNullableString("replySummary"),
    objection: getNullableString("objection"),
    meetingAt: getDate("meetingAt"),
    outcomeStatus: (typeof value.outcomeStatus === "string"
      ? value.outcomeStatus
      : String(current?.outcomeStatus ?? "open")) as
      | "open"
      | "no-response"
      | "replied"
      | "meeting-booked"
      | "proposal-sent"
      | "won"
      | "lost"
      | "archived",
    outcomeNotes: getNullableString("outcomeNotes"),
  };
}

async function validateRelations(input: PilotEntryInput) {
  const [pilot, company, opportunity, outreach] = await Promise.all([
    prisma.pilot.findUnique({ where: { id: input.pilotId } }),
    prisma.company.findUnique({
      where: { id: input.companyId },
      select: { id: true, status: true },
    }),
    input.opportunityId
      ? prisma.opportunity.findUnique({
          where: { id: input.opportunityId },
          select: { id: true, companyId: true },
        })
      : null,
    input.outreachId
      ? prisma.outreach.findUnique({
          where: { id: input.outreachId },
          include: {
            opportunity: { select: { id: true, companyId: true } },
            contact: { select: { doNotContact: true } },
          },
        })
      : null,
  ]);
  if (!pilot) return { status: 404, body: { error: "Pilot not found." } };
  if (!company) return { status: 404, body: { errors: { companyId: "Company not found." } } };
  if (company.status === "archived")
    return {
      status: 400,
      body: { errors: { companyId: "Archived companies cannot be added to a pilot." } },
    };
  if (!opportunity && input.opportunityId)
    return { status: 404, body: { errors: { opportunityId: "Opportunity not found." } } };
  if (opportunity && opportunity.companyId !== input.companyId)
    return {
      status: 400,
      body: { errors: { opportunityId: "Opportunity must belong to the selected company." } },
    };
  if (!outreach && input.outreachId)
    return { status: 404, body: { errors: { outreachId: "Outreach record not found." } } };
  if (outreach && input.opportunityId && outreach.opportunity.id !== input.opportunityId)
    return {
      status: 400,
      body: { errors: { outreachId: "Outreach must reference the selected opportunity." } },
    };
  if (outreach && outreach.opportunity.companyId !== input.companyId)
    return {
      status: 400,
      body: { errors: { outreachId: "Outreach must belong to the selected company." } },
    };
  if (outreach?.contact.doNotContact && input.messageSentAt)
    return {
      status: 400,
      body: {
        error: "This contact is marked do not contact; a sent pilot message cannot be recorded.",
      },
    };
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
