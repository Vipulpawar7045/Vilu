import { io } from "next/cache";
import { Suspense } from "react";

import {
  EvidenceWorkspace,
  type EvidenceCompanyView,
  type EvidenceView,
  type SourceView,
} from "@/components/evidence-workspace";
import { WorkspacePage } from "@/components/workspace-page";
import { getEvidenceWorkspaceData } from "@/lib/evidence-service";

export default function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string | string[] }>;
}) {
  return (
    <WorkspacePage
      eyebrow="Public signals"
      title="Evidence"
      description="Preserve what you observed, where you found it, and when it was last verified."
    >
      <Suspense fallback={<EvidenceFallback />}>
        <EvidenceContent searchParams={searchParams} />
      </Suspense>
    </WorkspacePage>
  );
}

async function EvidenceContent({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string | string[] }>;
}) {
  await io();
  const params = await searchParams;
  const companyId = Array.isArray(params.companyId) ? params.companyId[0] : params.companyId;
  const data = await getEvidenceWorkspaceData(companyId);

  const companies: EvidenceCompanyView[] = data.companies;
  const sources: SourceView[] = data.sources.map((source) => ({
    ...source,
    publishedAt: source.publishedAt?.toISOString() ?? null,
    sourceUpdatedAt: source.sourceUpdatedAt?.toISOString() ?? null,
    lastCheckedAt: source.lastCheckedAt?.toISOString() ?? null,
  }));
  const sourceOptions: SourceView[] = data.sourceOptions.map((source) => ({
    ...source,
    publishedAt: source.publishedAt?.toISOString() ?? null,
    sourceUpdatedAt: source.sourceUpdatedAt?.toISOString() ?? null,
    lastCheckedAt: source.lastCheckedAt?.toISOString() ?? null,
  }));
  const evidence: EvidenceView[] = data.evidence.map((record) => ({
    ...record,
    observedAt: record.observedAt.toISOString(),
    lastVerifiedAt: record.lastVerifiedAt?.toISOString() ?? null,
  }));

  return (
    <EvidenceWorkspace
      initialCompanies={companies}
      initialSources={sources}
      initialSourceOptions={sourceOptions}
      initialEvidence={evidence}
      initialCompanyId={companyId}
    />
  );
}

function EvidenceFallback() {
  return (
    <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
      <p className="text-sm text-[#748078]">Loading sources and evidence...</p>
    </section>
  );
}
