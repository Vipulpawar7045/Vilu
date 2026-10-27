import { io } from "next/cache";
import { Suspense } from "react";

import {
  CollectionWorkspace,
  type CollectionCandidateView,
  type CollectionCompanyView,
} from "@/components/collection-workspace";
import { WorkspacePage } from "@/components/workspace-page";
import { getCollectionWorkspaceData, isCollectionReviewStatus } from "@/lib/collection-service";

export default function CollectionPage() {
  return (
    <WorkspacePage
      eyebrow="Permitted public pages"
      title="Collect"
      description="Reduce repetitive copying with a domain-allowlisted, rate-limited review queue for public company pages."
    >
      <Suspense fallback={<CollectionFallback />}>
        <CollectionContent />
      </Suspense>
    </WorkspacePage>
  );
}

async function CollectionContent() {
  await io();
  const data = await getCollectionWorkspaceData();
  const companies: CollectionCompanyView[] = data.companies;
  const candidates: CollectionCandidateView[] = data.candidates.map((candidate) => ({
    ...candidate,
    fetchedAt: candidate.fetchedAt.toISOString(),
    reviewStatus: isCollectionReviewStatus(candidate.reviewStatus)
      ? candidate.reviewStatus
      : "pending",
  }));
  return <CollectionWorkspace initialCompanies={companies} initialCandidates={candidates} />;
}

function CollectionFallback() {
  return (
    <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
      <p className="text-sm text-[#748078]">Loading collection queue...</p>
    </section>
  );
}
