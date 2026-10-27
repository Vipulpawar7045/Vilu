import { NextResponse } from "next/server";

import {
  calculatePriorityScore,
  canTransitionOpportunityStatus,
  evaluateOutreachEligibility,
  getOpportunityFreshness,
  type OpportunityStatus,
  validateOpportunityRecordInput,
  validateReverificationInput,
} from "@/domain/rules";
import { getOpportunity } from "@/lib/opportunity-service";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const opportunity = await getOpportunity(id);

  if (!opportunity) {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const action = isRecord(body) && typeof body.action === "string" ? body.action : "";

  if (action === "reverify") {
    if (opportunity.status === "resolved") {
      return NextResponse.json(
        { error: "Reopen the resolved opportunity before re-verifying it." },
        { status: 400 },
      );
    }

    if (opportunity.status === "archived") {
      return NextResponse.json(
        { error: "Archived opportunities must be restored before re-verification." },
        { status: 400 },
      );
    }

    const note = isRecord(body) && typeof body.note === "string" ? body.note : "";
    const verifiedAt = new Date();
    const validation = validateReverificationInput({ note, verifiedAt });
    if (!validation.success) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    const evidenceDates = opportunity.evidenceLinks.map(({ evidence }) => ({
      sourcePublishedAt: evidence.source.publishedAt,
      sourceUpdatedAt: evidence.source.sourceUpdatedAt,
      sourceLastCheckedAt: evidence.source.lastCheckedAt,
      observedAt: evidence.observedAt,
      lastVerifiedAt: evidence.lastVerifiedAt,
    }));
    const freshnessLabel = getOpportunityFreshness(
      { opportunityLastVerifiedAt: verifiedAt, evidenceDates },
      verifiedAt,
    );
    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        lastVerifiedAt: verifiedAt,
        verificationNotes: validation.data.note,
        freshnessLabel,
        status: opportunity.status === "needs-verification" ? "researching" : opportunity.status,
      },
      include: { company: true },
    });

    return NextResponse.json({ opportunity: updated });
  }

  if (action === "mark-needs-verification") {
    if (opportunity.status === "resolved" || opportunity.status === "archived") {
      return NextResponse.json(
        { error: "Resolved or archived opportunities must be reopened before verification work." },
        { status: 400 },
      );
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: { status: "needs-verification" },
      include: { company: true },
    });
    return NextResponse.json({ opportunity: updated });
  }

  if (action === "resolve") {
    if (opportunity.status === "archived") {
      return NextResponse.json(
        { error: "Archived opportunities cannot be resolved." },
        { status: 400 },
      );
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: { status: "resolved", resolvedAt: new Date() },
      include: { company: true },
    });
    return NextResponse.json({ opportunity: updated });
  }

  if (action === "reopen") {
    if (opportunity.status !== "resolved") {
      return NextResponse.json(
        { error: "Only resolved opportunities can be reopened." },
        { status: 400 },
      );
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        status: "researching",
        resolvedAt: null,
        lastVerifiedAt: null,
        verificationNotes: null,
      },
      include: { company: true },
    });
    return NextResponse.json({ opportunity: updated });
  }

  if (action.length > 0) {
    return NextResponse.json({ error: "Unknown opportunity action." }, { status: 400 });
  }

  const input = parseOpportunityInput(body, opportunity);
  const validation = validateOpportunityRecordInput(input);
  if (!validation.success) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  if (validation.data.companyId !== opportunity.companyId) {
    return NextResponse.json(
      { errors: { companyId: "An opportunity cannot be moved to another company." } },
      { status: 400 },
    );
  }

  const nextStatus = validation.data.status ?? "new";
  if (opportunity.status === "resolved" && nextStatus !== "resolved") {
    return NextResponse.json(
      { errors: { status: "Reopen a resolved opportunity before editing its workflow status." } },
      { status: 400 },
    );
  }
  if (!canTransitionOpportunityStatus(opportunity.status as OpportunityStatus, nextStatus)) {
    return NextResponse.json(
      {
        errors: {
          status: `Cannot move an opportunity from ${opportunity.status} to ${nextStatus}.`,
        },
      },
      { status: 400 },
    );
  }

  const evidence = await prisma.evidence.findMany({
    where: { id: { in: validation.data.evidenceIds }, companyId: opportunity.companyId },
    include: { source: true },
  });
  if (evidence.length !== validation.data.evidenceIds.length) {
    return NextResponse.json(
      { errors: { evidenceIds: "Every selected evidence record must belong to the company." } },
      { status: 400 },
    );
  }

  if (nextStatus === "verified" && evidence.length === 0) {
    return NextResponse.json(
      { errors: { status: "At least one evidence record is required before verification." } },
      { status: 400 },
    );
  }

  if (nextStatus === "ready-for-outreach") {
    const contacts = await prisma.contact.findMany({
      where: { companyId: opportunity.companyId },
      select: { doNotContact: true },
    });
    const eligibility = evaluateOutreachEligibility({
      status: "ready-for-outreach",
      evidenceCount: evidence.length,
      suggestedSolution: validation.data.suggestedSolution,
      lastVerifiedAt: opportunity.lastVerifiedAt,
      allSourcesAccessible:
        evidence.length > 0 &&
        evidence.every((record) => record.source.accessibilityStatus === "accessible"),
      manuallyReviewed: Boolean(validation.data.verificationNotes),
      hasContact: contacts.length > 0,
      contactDoNotContact: contacts.length > 0 && contacts.every((contact) => contact.doNotContact),
      resolvedAt: opportunity.resolvedAt,
      referenceDate: new Date(),
    });
    if (!eligibility.eligible) {
      return NextResponse.json(
        { errors: { status: eligibility.reasons.join(" ") } },
        { status: 400 },
      );
    }
  }

  const freshnessLabel = getOpportunityFreshness(
    {
      opportunityLastVerifiedAt: opportunity.lastVerifiedAt,
      evidenceDates: evidence.map((record) => ({
        sourcePublishedAt: record.source.publishedAt,
        sourceUpdatedAt: record.source.sourceUpdatedAt,
        sourceLastCheckedAt: record.source.lastCheckedAt,
        observedAt: record.observedAt,
        lastVerifiedAt: record.lastVerifiedAt,
      })),
    },
    new Date(),
  );

  try {
    await prisma.opportunity.update({
      where: { id },
      data: {
        companyId: validation.data.companyId,
        title: validation.data.title,
        category: validation.data.category,
        hypothesis: validation.data.hypothesis,
        impactDescription: validation.data.impactDescription,
        suggestedSolution: validation.data.suggestedSolution,
        expectedOutcome: validation.data.expectedOutcome,
        impactScore: validation.data.impactScore,
        evidenceScore: validation.data.evidenceScore,
        solutionFitScore: validation.data.solutionFitScore,
        reachabilityScore: validation.data.reachabilityScore,
        priorityScore: calculatePriorityScore({
          impact: validation.data.impactScore,
          evidence: validation.data.evidenceScore,
          solutionFit: validation.data.solutionFitScore,
          reachability: validation.data.reachabilityScore,
        }),
        freshnessLabel,
        status: nextStatus,
        resolvedAt:
          nextStatus === "resolved"
            ? (opportunity.resolvedAt ?? new Date())
            : opportunity.resolvedAt,
        verificationNotes: validation.data.verificationNotes,
        companyConfirmed: validation.data.companyConfirmed,
        evidenceLinks: {
          deleteMany: {},
          create: validation.data.evidenceIds.map((evidenceId) => ({ evidenceId })),
        },
      },
    });

    const updated = await getOpportunity(id);
    return NextResponse.json({ opportunity: updated });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        { errors: { title: "An opportunity with this title already exists for the company." } },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "The opportunity could not be updated." }, { status: 500 });
  }

  return NextResponse.json(
    { error: "Supported actions are reverify, mark-needs-verification, resolve, and reopen." },
    { status: 400 },
  );
}

function parseOpportunityInput(
  body: unknown,
  current?: {
    companyId: string;
    title: string;
    category: string;
    hypothesis: string;
    impactDescription: string | null;
    suggestedSolution: string | null;
    expectedOutcome: string | null;
    impactScore: number;
    evidenceScore: number;
    solutionFitScore: number;
    reachabilityScore: number;
    status: string;
    verificationNotes: string | null;
    companyConfirmed: boolean;
    evidenceLinks: Array<{ evidenceId: string }>;
  },
) {
  const value = isRecord(body) ? body : {};
  const stringOr = (field: string, fallback: string) =>
    typeof value[field] === "string" ? value[field] : fallback;
  const nullableOr = (field: string, fallback: string | null) =>
    value[field] === null ? null : typeof value[field] === "string" ? value[field] : fallback;
  const numberOr = (field: string, fallback: number) =>
    typeof value[field] === "number" ? value[field] : Number(value[field] ?? fallback);

  return {
    companyId: stringOr("companyId", current?.companyId ?? ""),
    title: stringOr("title", current?.title ?? ""),
    category: stringOr("category", current?.category ?? ""),
    hypothesis: stringOr("hypothesis", current?.hypothesis ?? ""),
    evidenceIds: Array.isArray(value.evidenceIds)
      ? value.evidenceIds.filter(
          (evidenceId): evidenceId is string => typeof evidenceId === "string",
        )
      : (current?.evidenceLinks.map(({ evidenceId }) => evidenceId) ?? []),
    impactDescription: nullableOr("impactDescription", current?.impactDescription ?? null),
    suggestedSolution: nullableOr("suggestedSolution", current?.suggestedSolution ?? null),
    expectedOutcome: nullableOr("expectedOutcome", current?.expectedOutcome ?? null),
    impactScore: numberOr("impactScore", current?.impactScore ?? 3),
    evidenceScore: numberOr("evidenceScore", current?.evidenceScore ?? 3),
    solutionFitScore: numberOr("solutionFitScore", current?.solutionFitScore ?? 3),
    reachabilityScore: numberOr("reachabilityScore", current?.reachabilityScore ?? 3),
    status: stringOr("status", current?.status ?? "new") as OpportunityStatus,
    verificationNotes: nullableOr("verificationNotes", current?.verificationNotes ?? null),
    companyConfirmed:
      typeof value.companyConfirmed === "boolean"
        ? value.companyConfirmed
        : (current?.companyConfirmed ?? false),
  };
}

function isPrismaUniqueError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
