import { io } from "next/cache";
import { Suspense } from "react";

import {
  AiWorkspace,
  type AiContactView,
  type AiDraftView,
  type AiOpportunityView,
} from "@/components/ai-workspace";
import { WorkspacePage } from "@/components/workspace-page";
import { isAiDraftKind, isAiDraftStatus } from "@/domain/ai";
import { getAiWorkspaceData } from "@/lib/ai-service";

export default function AiPage() {
  return (
    <WorkspacePage
      eyebrow="Optional assistance"
      title="Assist"
      description="Generate evidence-aware drafts for human review. Nothing here changes your records or sends outreach automatically."
    >
      <Suspense fallback={<AiFallback />}>
        <AiContent />
      </Suspense>
    </WorkspacePage>
  );
}

async function AiContent() {
  await io();
  const data = await getAiWorkspaceData();
  const opportunities: AiOpportunityView[] = data.opportunities.map((opportunity) => ({
    id: opportunity.id,
    title: opportunity.title,
    companyId: opportunity.companyId,
    companyName: opportunity.company.name,
    status: opportunity.status,
    evidenceCount: opportunity.evidenceLinks.length,
  }));
  const contacts: AiContactView[] = data.contacts;
  const drafts: AiDraftView[] = data.drafts.map((draft) => ({
    ...draft,
    kind: isAiDraftKind(draft.kind) ? draft.kind : "summary",
    status: isAiDraftStatus(draft.status) ? draft.status : "draft",
    generatedAt: draft.generatedAt.toISOString(),
    reviewedAt: draft.reviewedAt?.toISOString() ?? null,
    evidenceLinks: draft.evidenceLinks.map(({ evidence }) => ({
      evidence: {
        ...evidence,
        observedAt: evidence.observedAt.toISOString(),
        lastVerifiedAt: evidence.lastVerifiedAt?.toISOString() ?? null,
        source: {
          ...evidence.source,
          publishedAt: evidence.source.publishedAt?.toISOString() ?? null,
          sourceUpdatedAt: evidence.source.sourceUpdatedAt?.toISOString() ?? null,
        },
      },
    })),
  }));
  return (
    <AiWorkspace
      initialOpportunities={opportunities}
      initialContacts={contacts}
      initialDrafts={drafts}
    />
  );
}

function AiFallback() {
  return (
    <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
      <p className="text-sm text-[#748078]">Loading assistant workspace...</p>
    </section>
  );
}
