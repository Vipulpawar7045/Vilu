import { io } from "next/cache";
import { Suspense } from "react";

import {
  DiscoveryWorkspace,
  type DiscoveryCompanyView,
  type DiscoveryClusterView,
  type DiscoveryCapabilityView,
  type DiscoverySavedSearchView,
  type DiscoverySignalView,
} from "@/components/discovery-workspace";
import { WorkspacePage } from "@/components/workspace-page";
import {
  getDiscoveryWorkspaceData,
  isDiscoveryReviewStatus,
  type DiscoveryReviewStatus,
} from "@/lib/discovery-service";

export default function DiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string | string[]; reviewStatus?: string }>;
}) {
  return (
    <WorkspacePage
      eyebrow="Public issue signals"
      title="Discover"
      description="Find bounded, dated public signals and review them before they become evidence or opportunity hypotheses."
    >
      <Suspense fallback={<DiscoveryFallback />}>
        <DiscoveryContent searchParams={searchParams} />
      </Suspense>
    </WorkspacePage>
  );
}

async function DiscoveryContent({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string | string[]; reviewStatus?: string }>;
}) {
  await io();
  const params = await searchParams;
  const companyId = firstParam(params.companyId);
  const reviewStatus = isDiscoveryReviewStatus(params.reviewStatus) ? params.reviewStatus : "all";
  const data = await getDiscoveryWorkspaceData({
    companyId,
    reviewStatus: reviewStatus as DiscoveryReviewStatus | "all",
  });
  const companies: DiscoveryCompanyView[] = data.companies;
  const signals: DiscoverySignalView[] = data.signals.map((signal) => ({
    ...signal,
    reviewStatus: isDiscoveryReviewStatus(signal.reviewStatus) ? signal.reviewStatus : "discovered",
    sourcePublishedAt: signal.sourcePublishedAt?.toISOString() ?? null,
    sourceUpdatedAt: signal.sourceUpdatedAt?.toISOString() ?? null,
    observedAt: signal.observedAt.toISOString(),
    lastVerifiedAt: signal.lastVerifiedAt?.toISOString() ?? null,
    promotedAt: signal.promotedAt?.toISOString() ?? null,
    source: {
      ...signal.source,
      publishedAt: signal.source.publishedAt?.toISOString() ?? null,
      sourceUpdatedAt: signal.source.sourceUpdatedAt?.toISOString() ?? null,
    },
  }));
  const clusters: DiscoveryClusterView[] = data.clusters.map((cluster) => ({
    ...cluster,
    firstSeenAt: cluster.firstSeenAt.toISOString(),
    latestSeenAt: cluster.latestSeenAt.toISOString(),
    timeline: cluster.timeline.map((event) => ({
      ...event,
      sourcePublishedAt: event.sourcePublishedAt?.toISOString() ?? null,
      observedAt: event.observedAt?.toISOString() ?? null,
      verifiedAt: event.verifiedAt?.toISOString() ?? null,
      createdAt: event.createdAt.toISOString(),
    })),
    solutionMatches: cluster.solutionMatches.map((match) => ({
      ...match,
      createdAt: match.createdAt.toISOString(),
      updatedAt: match.updatedAt.toISOString(),
    })),
  }));
  const capabilities: DiscoveryCapabilityView[] = data.capabilities.map((capability) => ({
    ...capability,
    createdAt: capability.createdAt.toISOString(),
    updatedAt: capability.updatedAt.toISOString(),
  }));
  const savedSearches: DiscoverySavedSearchView[] = data.savedSearches;
  return (
    <DiscoveryWorkspace
      initialCompanies={companies}
      initialSignals={signals}
      initialClusters={clusters}
      initialCapabilities={capabilities}
      initialSavedSearches={savedSearches}
      initialCompanyId={companyId ?? ""}
      initialReviewStatus={reviewStatus}
    />
  );
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function DiscoveryFallback() {
  return (
    <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
      <p className="text-sm text-[#748078]">Loading public issue signals...</p>
    </section>
  );
}
