import { NextResponse } from "next/server";

import {
  calculatePriorityScore,
  FRESHNESS_LABELS,
  getOpportunityFreshness,
  type FreshnessLabel,
  type OpportunityStatus,
  validateOpportunityRecordInput,
} from "@/domain/rules";
import { getOpportunityQueue } from "@/lib/opportunity-service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? "active";
  const freshnessParam = searchParams.get("freshness") ?? "all";
  const status = ["active", "needs-verification", "resolved", "all"].includes(statusParam)
    ? (statusParam as "active" | "needs-verification" | "resolved" | "all")
    : "active";
  const freshness = FRESHNESS_LABELS.includes(freshnessParam as FreshnessLabel)
    ? (freshnessParam as FreshnessLabel)
    : "all";
  const companyId = searchParams.get("companyId")?.trim() || undefined;

  const opportunities = await getOpportunityQueue({ status, freshness, companyId });
  return NextResponse.json(
    { opportunities },
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

  const validation = validateOpportunityRecordInput(parseOpportunityInput(body));
  if (!validation.success) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  if (validation.data.status !== "new") {
    return NextResponse.json(
      { errors: { status: "New opportunities must start in the New status." } },
      { status: 400 },
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: validation.data.companyId },
    select: { id: true, status: true },
  });
  if (!company) {
    return NextResponse.json(
      { errors: { companyId: "Company could not be found." } },
      { status: 404 },
    );
  }
  if (company.status === "archived") {
    return NextResponse.json(
      { errors: { companyId: "Archived companies cannot receive new opportunities." } },
      { status: 400 },
    );
  }

  const evidence = await prisma.evidence.findMany({
    where: { id: { in: validation.data.evidenceIds }, companyId: company.id },
    include: { source: true },
  });
  if (evidence.length !== validation.data.evidenceIds.length) {
    return NextResponse.json(
      { errors: { evidenceIds: "Every selected evidence record must belong to the company." } },
      { status: 400 },
    );
  }

  const now = new Date();
  const freshnessLabel = getOpportunityFreshness(
    { opportunityLastVerifiedAt: null, evidenceDates: toEvidenceDates(evidence) },
    now,
  );

  try {
    const opportunity = await prisma.opportunity.create({
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
        status: "new",
        verificationNotes: validation.data.verificationNotes,
        companyConfirmed: validation.data.companyConfirmed,
        evidenceLinks: {
          create: validation.data.evidenceIds.map((evidenceId) => ({ evidenceId })),
        },
      },
      include: { company: true },
    });

    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        { errors: { title: "An opportunity with this title already exists for the company." } },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "The opportunity could not be saved." }, { status: 500 });
  }
}

function parseOpportunityInput(body: unknown) {
  const value = isRecord(body) ? body : {};
  return {
    companyId: stringValue(value.companyId),
    title: stringValue(value.title),
    category: stringValue(value.category),
    hypothesis: stringValue(value.hypothesis),
    evidenceIds: Array.isArray(value.evidenceIds)
      ? value.evidenceIds.filter((id): id is string => typeof id === "string")
      : [],
    impactDescription: nullableString(value.impactDescription),
    suggestedSolution: nullableString(value.suggestedSolution),
    expectedOutcome: nullableString(value.expectedOutcome),
    impactScore: numberValue(value.impactScore, 3),
    evidenceScore: numberValue(value.evidenceScore, 3),
    solutionFitScore: numberValue(value.solutionFitScore, 3),
    reachabilityScore: numberValue(value.reachabilityScore, 3),
    status: (typeof value.status === "string" ? value.status : "new") as OpportunityStatus,
    verificationNotes: nullableString(value.verificationNotes),
    companyConfirmed: value.companyConfirmed === true,
  };
}

function toEvidenceDates(
  evidence: Array<{
    observedAt: Date;
    lastVerifiedAt: Date | null;
    source: { publishedAt: Date | null; sourceUpdatedAt: Date | null; lastCheckedAt: Date | null };
  }>,
) {
  return evidence.map((record) => ({
    sourcePublishedAt: record.source.publishedAt,
    sourceUpdatedAt: record.source.sourceUpdatedAt,
    sourceLastCheckedAt: record.source.lastCheckedAt,
    observedAt: record.observedAt,
    lastVerifiedAt: record.lastVerifiedAt,
  }));
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : Number(value ?? fallback);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPrismaUniqueError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
