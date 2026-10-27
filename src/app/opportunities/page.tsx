import { io } from "next/cache";
import { Suspense } from "react";

import { OpportunityWorkspace, type OpportunityView } from "@/components/opportunity-workspace";
import type {
  OpportunityCompanyOption,
  OpportunityEvidenceOption,
} from "@/components/opportunity-form";
import { WorkspacePage } from "@/components/workspace-page";
import {
  getOpportunityEditorData,
  getOpportunityQueue,
  getVerificationReason,
} from "@/lib/opportunity-service";

export default function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    evidenceId?: string | string[];
    status?: string;
    freshness?: string;
  }>;
}) {
  return (
    <WorkspacePage
      eyebrow="Opportunity hypotheses"
      title="Opportunities"
      description="Turn evidence into carefully worded hypotheses, solutions, scores, and next actions."
    >
      <Suspense fallback={<OpportunityFallback />}>
        <OpportunityContent searchParams={searchParams} />
      </Suspense>
    </WorkspacePage>
  );
}

async function OpportunityContent({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    evidenceId?: string | string[];
    status?: string;
    freshness?: string;
  }>;
}) {
  await io();
  const params = await searchParams;
  const companyId = firstParam(params.companyId);
  const status = ["active", "needs-verification", "resolved", "all"].includes(params.status ?? "")
    ? (params.status as "active" | "needs-verification" | "resolved" | "all")
    : "active";
  const freshness = ["Hot", "Recent", "Aging", "Historical", "Undated"].includes(
    params.freshness ?? "",
  )
    ? (params.freshness as "Hot" | "Recent" | "Aging" | "Historical" | "Undated")
    : "all";
  const [opportunities, editorData] = await Promise.all([
    getOpportunityQueue({ status, freshness, companyId }),
    getOpportunityEditorData(companyId),
  ]);

  const initialOpportunities: OpportunityView[] = opportunities.map((opportunity) => ({
    ...opportunity,
    lastVerifiedAt: opportunity.lastVerifiedAt?.toISOString() ?? null,
    resolvedAt: opportunity.resolvedAt?.toISOString() ?? null,
    createdAt: opportunity.createdAt.toISOString(),
    updatedAt: opportunity.updatedAt.toISOString(),
    verificationReason: getVerificationReason(opportunity),
    evidenceLinks: opportunity.evidenceLinks.map(({ evidence }) => ({
      evidence: {
        ...evidence,
        observedAt: evidence.observedAt.toISOString(),
        lastVerifiedAt: evidence.lastVerifiedAt?.toISOString() ?? null,
        source: {
          ...evidence.source,
          publishedAt: evidence.source.publishedAt?.toISOString() ?? null,
          sourceUpdatedAt: evidence.source.sourceUpdatedAt?.toISOString() ?? null,
          lastCheckedAt: evidence.source.lastCheckedAt?.toISOString() ?? null,
        },
      },
    })),
  }));

  const editorCompanies: OpportunityCompanyOption[] = editorData.companies;
  const editorEvidence: OpportunityEvidenceOption[] = editorData.evidence.map((evidence) => ({
    ...evidence,
    observedAt: evidence.observedAt.toISOString(),
  }));

  return (
    <OpportunityWorkspace
      initialOpportunities={initialOpportunities}
      initialStatus={status}
      initialFreshness={freshness}
      initialCompanyId={companyId ?? ""}
      initialEvidenceId={firstParam(params.evidenceId)}
      editorCompanies={editorCompanies}
      editorEvidence={editorEvidence}
    />
  );
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function OpportunityFallback() {
  return (
    <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
      <p className="text-sm text-[#748078]">Loading opportunity queue...</p>
    </section>
  );
}
