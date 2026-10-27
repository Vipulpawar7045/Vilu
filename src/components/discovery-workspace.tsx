"use client";

import Link from "next/link";
import { useState } from "react";

import {
  DISCOVERY_ADAPTERS,
  DISCOVERY_REVIEW_STATUSES,
  DISCOVERY_SOURCE_TYPES,
  type DiscoveryAdapter,
  type DiscoveryReviewStatus,
  type DiscoverySourceType,
} from "@/domain/discovery";

export type DiscoveryCompanyView = {
  id: string;
  name: string;
  websiteUrl: string;
};

export type DiscoverySignalView = {
  id: string;
  companyId: string;
  sourceId: string;
  sourceUrl: string;
  sourceType: string;
  title: string;
  excerpt: string;
  neutralSummary: string;
  sourcePublishedAt: string | null;
  sourceUpdatedAt: string | null;
  observedAt: string;
  lastVerifiedAt: string | null;
  accessibilityStatus: string;
  responseStatus: number | null;
  fingerprint: string;
  groupKey: string;
  reviewStatus: DiscoveryReviewStatus;
  independentSourceCount: number;
  recencyScore: number;
  specificityScore: number;
  sourceReliabilityScore: number;
  corroborationScore: number;
  impactScore: number;
  solutionFitScore: number;
  rankingScore: number;
  promotedAt: string | null;
  company: { id: string; name: string };
  source: {
    id: string;
    url: string;
    title: string | null;
    sourceType: string;
    publishedAt: string | null;
    sourceUpdatedAt: string | null;
    accessibilityStatus: string;
  };
};

export type DiscoveryCapabilityView = {
  id: string;
  name: string;
  description: string;
  category: string | null;
  keywords: string;
  estimatedEffort: string | null;
  expectedOutcome: string | null;
  nextAction: string | null;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type DiscoverySavedSearchView = {
  id: string;
  name: string;
  companyId: string | null;
  reviewStatus: string | null;
  sourceType: string | null;
  minimumScore: number | null;
};

export type DiscoveryClusterView = {
  id: string;
  companyId: string;
  groupKey: string;
  title: string;
  neutralSummary: string;
  category: string | null;
  firstSeenAt: string;
  latestSeenAt: string;
  independentSourceCount: number;
  resolutionState: string;
  recencyScore: number;
  specificityScore: number;
  sourceReliabilityScore: number;
  corroborationScore: number;
  impactScore: number;
  solutionFitScore: number;
  rankingScore: number;
  company: { id: string; name: string };
  timeline: Array<{
    id: string;
    eventType: string;
    title: string | null;
    summary: string;
    sourceUrl: string | null;
    sourcePublishedAt: string | null;
    observedAt: string | null;
    verifiedAt: string | null;
    createdAt: string;
  }>;
  solutionMatches: Array<{
    id: string;
    rationale: string;
    fitScore: number;
    estimatedEffort: string | null;
    expectedOutcome: string | null;
    nextAction: string | null;
    reviewStatus: string;
    createdAt: string;
    updatedAt: string;
    capability: DiscoveryCapabilityView;
  }>;
};

export function DiscoveryWorkspace({
  initialCompanies,
  initialSignals,
  initialClusters,
  initialCapabilities,
  initialSavedSearches,
  initialCompanyId = "",
  initialReviewStatus = "all",
}: {
  initialCompanies: DiscoveryCompanyView[];
  initialSignals: DiscoverySignalView[];
  initialClusters: DiscoveryClusterView[];
  initialCapabilities: DiscoveryCapabilityView[];
  initialSavedSearches: DiscoverySavedSearchView[];
  initialCompanyId?: string;
  initialReviewStatus?: DiscoveryReviewStatus | "all";
}) {
  const [companies] = useState(initialCompanies);
  const [signals, setSignals] = useState(initialSignals);
  const [clusters, setClusters] = useState(initialClusters);
  const [capabilities, setCapabilities] = useState(initialCapabilities);
  const [savedSearches, setSavedSearches] = useState(initialSavedSearches);
  const [companyId, setCompanyId] = useState(initialCompanyId || initialCompanies[0]?.id || "");
  const [sourceType, setSourceType] = useState<DiscoverySourceType>("review");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<DiscoverySourceType | "all">("all");
  const [adapter, setAdapter] = useState<DiscoveryAdapter>("rss");
  const [url, setUrl] = useState("");
  const [minimumScore, setMinimumScore] = useState(0);
  const [reviewStatus, setReviewStatus] = useState<DiscoveryReviewStatus | "all">(
    initialReviewStatus,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureUrl, setCaptureUrl] = useState("");
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureExcerpt, setCaptureExcerpt] = useState("");
  const [captureDate, setCaptureDate] = useState("");
  const [captureSourceType, setCaptureSourceType] = useState<DiscoverySourceType>("forum");
  const [capabilityName, setCapabilityName] = useState("");
  const [capabilityDescription, setCapabilityDescription] = useState("");
  const [capabilityKeywords, setCapabilityKeywords] = useState("");
  const [capabilityEffort, setCapabilityEffort] = useState("");
  const [capabilityOutcome, setCapabilityOutcome] = useState("");
  const [capabilityNextAction, setCapabilityNextAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  type WorkspacePayload = {
    signals?: DiscoverySignalView[];
    clusters?: DiscoveryClusterView[];
    capabilities?: DiscoveryCapabilityView[];
    savedSearches?: DiscoverySavedSearchView[];
    error?: string;
  };

  async function refreshWorkspace(
    overrides: {
      reviewStatus?: DiscoveryReviewStatus | "all";
      sourceType?: DiscoverySourceType | "all";
      minimumScore?: number;
      companyId?: string | null;
    } = {},
  ) {
    const nextReviewStatus = overrides.reviewStatus ?? reviewStatus;
    const nextSourceType = overrides.sourceType ?? sourceTypeFilter;
    const nextMinimumScore = overrides.minimumScore ?? minimumScore;
    const nextCompanyId = Object.prototype.hasOwnProperty.call(overrides, "companyId")
      ? (overrides.companyId ?? "")
      : companyId;
    const params = new URLSearchParams();
    if (nextReviewStatus !== "all") params.set("reviewStatus", nextReviewStatus);
    if (nextSourceType !== "all") params.set("sourceType", nextSourceType);
    if (nextMinimumScore > 0) params.set("minimumScore", String(nextMinimumScore));
    if (nextCompanyId) params.set("companyId", nextCompanyId);
    const response = await fetch(`/api/discovery?${params.toString()}`, { cache: "no-store" });
    const payload = (await response.json()) as WorkspacePayload;
    if (!response.ok) throw new Error(payload.error ?? "Discovery workspace could not be loaded.");
    setSignals(payload.signals ?? []);
    setClusters(payload.clusters ?? []);
    setCapabilities(payload.capabilities ?? []);
    setSavedSearches(payload.savedSearches ?? []);
    setSelectedIds([]);
  }

  async function discover(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, sourceType, adapter, url }),
      });
      const payload = (await response.json()) as {
        signals?: DiscoverySignalView[];
        result?: { items?: unknown[] };
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok) {
        setError(
          payload.errors?.url ??
            payload.errors?.companyId ??
            payload.error ??
            "The source could not be discovered.",
        );
        return;
      }
      const discovered = payload.signals ?? [];
      await refreshWorkspace();
      setNotice(
        discovered.length === 0
          ? "The source was fetched safely, but no issue-shaped entries were found."
          : `${discovered.length} public signal${discovered.length === 1 ? "" : "s"} added or refreshed for human review.`,
      );
    } catch {
      setError("The discovery request could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function filterSignals(
    nextStatus: DiscoveryReviewStatus | "all",
    nextSourceType = sourceTypeFilter,
    nextMinimumScore = minimumScore,
  ) {
    setReviewStatus(nextStatus);
    setSourceTypeFilter(nextSourceType);
    setMinimumScore(nextMinimumScore);
    setError("");
    try {
      await refreshWorkspace({
        reviewStatus: nextStatus,
        sourceType: nextSourceType,
        minimumScore: nextMinimumScore,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signals could not be loaded.");
    }
  }

  async function updateReview(signalId: string, nextStatus: DiscoveryReviewStatus) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/discovery/${signalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: nextStatus }),
      });
      const payload = (await response.json()) as {
        signal?: DiscoverySignalView;
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok || !payload.signal)
        throw new Error(
          payload.errors?.reviewStatus ?? payload.error ?? "The review state could not be saved.",
        );
      await refreshWorkspace();
      setNotice(
        `Signal marked ${formatLabel(nextStatus)}. It remains separate from verified evidence.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The review state could not be saved.");
    }
  }

  async function promote(signalId: string, createOpportunity: boolean) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/discovery/${signalId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createOpportunity }),
      });
      const payload = (await response.json()) as {
        signal?: DiscoverySignalView;
        opportunity?: { title: string } | null;
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok || !payload.signal)
        throw new Error(
          Object.values(payload.errors ?? {})[0] ??
            payload.error ??
            "The signal could not be promoted.",
        );
      await refreshWorkspace();
      setNotice(
        payload.opportunity
          ? `Evidence saved and the draft opportunity “${payload.opportunity.title}” was created. Review it before verification or outreach.`
          : "Evidence saved. The original source and dates were preserved; no outreach was sent.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The signal could not be promoted.");
    }
  }

  async function capture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capture: true,
          companyId,
          url: captureUrl,
          sourceType: captureSourceType,
          title: captureTitle,
          excerpt: captureExcerpt,
          sourcePublishedAt: captureDate || null,
        }),
      });
      const payload = (await response.json()) as {
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          Object.values(payload.errors ?? {})[0] ??
            payload.error ??
            "The capture could not be saved.",
        );
      await refreshWorkspace();
      setNotice(
        "The selected excerpt was captured as a review signal. No background browsing was performed.",
      );
      setCaptureUrl("");
      setCaptureTitle("");
      setCaptureExcerpt("");
      setCaptureDate("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The capture could not be saved.");
    } finally {
      setLoading(false);
    }
  }

  async function bulkReview(nextStatus: DiscoveryReviewStatus) {
    if (selectedIds.length === 0) return setError("Select at least one signal first.");
    if (
      !window.confirm(
        `Mark ${selectedIds.length} selected signal${selectedIds.length === 1 ? "" : "s"} as ${formatLabel(nextStatus)}?`,
      )
    )
      return;
    setError("");
    try {
      const response = await fetch("/api/discovery/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, reviewStatus: nextStatus, confirmed: true }),
      });
      const payload = (await response.json()) as {
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          Object.values(payload.errors ?? {})[0] ??
            payload.error ??
            "The bulk review action could not be saved.",
        );
      await refreshWorkspace();
      setNotice(
        `Bulk review completed for ${selectedIds.length} signal${selectedIds.length === 1 ? "" : "s"}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The bulk review action could not be saved.",
      );
    }
  }

  async function saveSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await fetch("/api/discovery/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: savedSearchName,
          companyId,
          reviewStatus: reviewStatus === "all" ? null : reviewStatus,
          sourceType: sourceTypeFilter === "all" ? null : sourceTypeFilter,
          minimumScore: minimumScore || null,
        }),
      });
      const payload = (await response.json()) as {
        savedSearch?: DiscoverySavedSearchView;
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok || !payload.savedSearch)
        throw new Error(
          Object.values(payload.errors ?? {})[0] ??
            payload.error ??
            "The saved search could not be created.",
        );
      setSavedSearches((current) => [
        ...current.filter((item) => item.id !== payload.savedSearch?.id),
        payload.savedSearch!,
      ]);
      setSavedSearchName("");
      setNotice("Saved search created.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The saved search could not be created.");
    }
  }

  async function applySavedSearch(search: DiscoverySavedSearchView) {
    const nextStatus = (search.reviewStatus || "all") as DiscoveryReviewStatus | "all";
    const nextSource = (search.sourceType || "all") as DiscoverySourceType | "all";
    const nextMinimum = search.minimumScore ?? 0;
    const nextCompanyId = search.companyId ?? companyId;
    setCompanyId(nextCompanyId);
    setReviewStatus(nextStatus);
    setSourceTypeFilter(nextSource);
    setMinimumScore(nextMinimum);
    try {
      await refreshWorkspace({
        companyId: search.companyId,
        reviewStatus: nextStatus,
        sourceType: nextSource,
        minimumScore: nextMinimum,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The saved search could not be applied.");
    }
  }

  async function createCapability(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await fetch("/api/discovery/capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: capabilityName,
          description: capabilityDescription,
          keywords: capabilityKeywords,
          estimatedEffort: capabilityEffort,
          expectedOutcome: capabilityOutcome,
          nextAction: capabilityNextAction,
        }),
      });
      const payload = (await response.json()) as {
        capability?: DiscoveryCapabilityView;
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok || !payload.capability)
        throw new Error(
          Object.values(payload.errors ?? {})[0] ??
            payload.error ??
            "The capability could not be created.",
        );
      setCapabilities((current) =>
        [...current, payload.capability!].sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      );
      setCapabilityName("");
      setCapabilityDescription("");
      setCapabilityKeywords("");
      setCapabilityEffort("");
      setCapabilityOutcome("");
      setCapabilityNextAction("");
      setNotice("Service capability created. Matches will remain reviewable drafts.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The capability could not be created.");
    }
  }

  async function matchCapability(clusterId: string, capabilityId: string) {
    if (!capabilityId) return;
    try {
      const response = await fetch(`/api/discovery/clusters/${clusterId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capabilityId }),
      });
      const payload = (await response.json()) as {
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          Object.values(payload.errors ?? {})[0] ??
            payload.error ??
            "The solution match could not be saved.",
        );
      await refreshWorkspace();
      setNotice(
        "Capability match created for review. It does not change the opportunity or outreach state.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The solution match could not be saved.");
    }
  }

  async function updateCluster(clusterId: string, resolutionState: string) {
    try {
      const response = await fetch(`/api/discovery/clusters/${clusterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionState }),
      });
      const payload = (await response.json()) as {
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          Object.values(payload.errors ?? {})[0] ??
            payload.error ??
            "The cluster state could not be saved.",
        );
      await refreshWorkspace();
      setNotice(`Cluster marked ${formatLabel(resolutionState)}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The cluster state could not be saved.");
    }
  }

  async function updateMatch(matchId: string, reviewStatus: string) {
    try {
      const response = await fetch(`/api/discovery/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus }),
      });
      const payload = (await response.json()) as {
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          Object.values(payload.errors ?? {})[0] ??
            payload.error ??
            "The solution match review could not be saved.",
        );
      await refreshWorkspace();
      setNotice(`Solution match marked ${formatLabel(reviewStatus)}.`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The solution match review could not be saved.",
      );
    }
  }

  if (companies.length === 0) {
    return (
      <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8aa95b]">
          Company first
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
          Add a company before discovering signals
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#748078]">
          Discovery is constrained by a company or permitted public provider allowlist.
        </p>
        <Link href="/companies" className="button-primary mt-6">
          Go to companies
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d4e4c2] bg-[#f5faef] p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
          Bounded discovery
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
          Find public signals for review
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#68766e]">
          Vilu fetches one explicitly submitted public feed or issue endpoint, checks robots.txt,
          applies retry and rate limits, and keeps every result as a review signal. It never creates
          verified evidence or outreach automatically.
        </p>
        <form
          onSubmit={discover}
          className="mt-6 grid gap-4 lg:grid-cols-[0.7fr_0.7fr_0.7fr_1.4fr_auto] lg:items-end"
        >
          <label className="text-sm font-semibold text-[#344239]">
            Company
            <select
              aria-label="Discovery company"
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className="field-control mt-2"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#344239]">
            Source category
            <select
              aria-label="Discovery source type"
              value={sourceType}
              onChange={(event) => {
                const nextType = event.target.value as DiscoverySourceType;
                setSourceType(nextType);
                if (nextType === "github") setAdapter("github-json");
              }}
              className="field-control mt-2"
            >
              {DISCOVERY_SOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#344239]">
            Adapter
            <select
              aria-label="Discovery adapter"
              value={adapter}
              onChange={(event) => setAdapter(event.target.value as DiscoveryAdapter)}
              className="field-control mt-2"
            >
              {DISCOVERY_ADAPTERS.map((value) => (
                <option key={value} value={value}>
                  {formatLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#344239]">
            Public feed or issue URL
            <input
              aria-label="Discovery source URL"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/public-issues.xml"
              className="field-control mt-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !companyId || !url.trim()}
            className="button-primary"
          >
            {loading ? "Discovering..." : "Discover signals"}
          </button>
        </form>
        <p className="mt-4 text-xs leading-5 text-[#748078]">
          Source categories: {DISCOVERY_SOURCE_TYPES.map(formatLabel).join(", ")}. GitHub uses
          public JSON only.
        </p>
        <div className="mt-5 border-t border-[#d4e4c2] pt-5">
          <button
            type="button"
            className="button-secondary"
            onClick={() => setCaptureOpen((open) => !open)}
          >
            {captureOpen ? "Close browser capture" : "Capture a permitted page excerpt"}
          </button>
          <p className="mt-2 text-xs leading-5 text-[#748078]">
            Submit one public URL and a selected excerpt. Vilu does not browse in the background.
          </p>
          {captureOpen && (
            <form
              onSubmit={capture}
              className="mt-4 grid gap-4 rounded-2xl border border-[#dce3da] bg-white/70 p-4 sm:grid-cols-2"
            >
              <label className="text-sm font-semibold text-[#344239]">
                Source category
                <select
                  aria-label="Capture source type"
                  value={captureSourceType}
                  onChange={(event) =>
                    setCaptureSourceType(event.target.value as DiscoverySourceType)
                  }
                  className="field-control mt-2"
                >
                  {DISCOVERY_SOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#344239]">
                Source published date (optional)
                <input
                  aria-label="Capture published date"
                  type="date"
                  value={captureDate}
                  onChange={(event) => setCaptureDate(event.target.value)}
                  className="field-control mt-2"
                />
              </label>
              <label className="text-sm font-semibold text-[#344239] sm:col-span-2">
                Permitted public URL
                <input
                  aria-label="Capture source URL"
                  value={captureUrl}
                  onChange={(event) => setCaptureUrl(event.target.value)}
                  placeholder="https://example.com/public-thread"
                  className="field-control mt-2"
                />
              </label>
              <label className="text-sm font-semibold text-[#344239]">
                Source title
                <input
                  aria-label="Capture title"
                  value={captureTitle}
                  onChange={(event) => setCaptureTitle(event.target.value)}
                  className="field-control mt-2"
                />
              </label>
              <label className="text-sm font-semibold text-[#344239]">
                Selected excerpt
                <textarea
                  aria-label="Capture excerpt"
                  value={captureExcerpt}
                  onChange={(event) => setCaptureExcerpt(event.target.value)}
                  rows={3}
                  className="field-control mt-2"
                  placeholder="Paste only the short relevant excerpt."
                />
              </label>
              <button
                type="submit"
                disabled={
                  loading || !captureUrl.trim() || !captureTitle.trim() || !captureExcerpt.trim()
                }
                className="button-primary sm:col-span-2"
              >
                {loading ? "Saving capture..." : "Save review capture"}
              </button>
            </form>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[#f0cbc6] bg-[#fff7f6] px-3 py-2 text-sm text-[#a3483e]"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-4 rounded-xl border border-[#d4e4c2] bg-white/70 px-3 py-2 text-sm text-[#607a3e]"
          >
            {notice}
          </p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#dce3da] bg-white/65 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
                Research productivity
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#17201b]">Saved review searches</h2>
            </div>
            <span className="text-xs text-[#748078]">{savedSearches.length} saved</span>
          </div>
          <form onSubmit={saveSearch} className="mt-4 flex gap-2">
            <input
              aria-label="Saved search name"
              value={savedSearchName}
              onChange={(event) => setSavedSearchName(event.target.value)}
              placeholder="e.g. Recent support signals"
              className="field-control"
            />
            <button type="submit" disabled={!savedSearchName.trim()} className="button-secondary">
              Save
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {savedSearches.map((search) => (
              <button
                key={search.id}
                type="button"
                onClick={() => void applySavedSearch(search)}
                className="rounded-full border border-[#cfd8ce] bg-white px-3 py-1.5 text-xs font-semibold text-[#536158] hover:border-[#9cac9b]"
              >
                {search.name}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-[#dce3da] bg-white/65 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
            Operator-defined services
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#17201b]">Solution capabilities</h2>
          <form onSubmit={createCapability} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              aria-label="Capability name"
              value={capabilityName}
              onChange={(event) => setCapabilityName(event.target.value)}
              placeholder="Capability name"
              className="field-control"
            />
            <input
              aria-label="Capability keywords"
              value={capabilityKeywords}
              onChange={(event) => setCapabilityKeywords(event.target.value)}
              placeholder="Keywords, comma separated"
              className="field-control"
            />
            <textarea
              aria-label="Capability description"
              value={capabilityDescription}
              onChange={(event) => setCapabilityDescription(event.target.value)}
              rows={2}
              placeholder="What can you deliver?"
              className="field-control sm:col-span-2"
            />
            <input
              aria-label="Capability effort"
              value={capabilityEffort}
              onChange={(event) => setCapabilityEffort(event.target.value)}
              placeholder="Estimated effort"
              className="field-control"
            />
            <input
              aria-label="Capability outcome"
              value={capabilityOutcome}
              onChange={(event) => setCapabilityOutcome(event.target.value)}
              placeholder="Expected outcome"
              className="field-control"
            />
            <input
              aria-label="Capability next action"
              value={capabilityNextAction}
              onChange={(event) => setCapabilityNextAction(event.target.value)}
              placeholder="Next action"
              className="field-control sm:col-span-2"
            />
            <button
              type="submit"
              disabled={
                !capabilityName.trim() ||
                !capabilityDescription.trim() ||
                !capabilityKeywords.trim()
              }
              className="button-secondary sm:col-span-2"
            >
              Add capability
            </button>
          </form>
          {capabilities.length > 0 && (
            <p className="mt-3 text-xs text-[#748078]">
              Configured: {capabilities.map((capability) => capability.name).join(", ")}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="discovery-queue-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
              Human review queue
            </p>
            <h2
              id="discovery-queue-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
            >
              Public issue signals
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm font-semibold text-[#344239]">
              Review state
              <select
                aria-label="Filter discovery review status"
                value={reviewStatus}
                onChange={(event) =>
                  void filterSignals(event.target.value as DiscoveryReviewStatus | "all")
                }
                className="field-control mt-2"
              >
                <option value="all">All states</option>
                {DISCOVERY_REVIEW_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-[#344239]">
              Source type
              <select
                aria-label="Filter discovery source type"
                value={sourceTypeFilter}
                onChange={(event) =>
                  void filterSignals(
                    reviewStatus,
                    event.target.value as DiscoverySourceType | "all",
                    minimumScore,
                  )
                }
                className="field-control mt-2"
              >
                <option value="all">All sources</option>
                {DISCOVERY_SOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {formatLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-[#344239]">
              Minimum rank
              <select
                aria-label="Filter discovery minimum score"
                value={minimumScore}
                onChange={(event) =>
                  void filterSignals(reviewStatus, sourceTypeFilter, Number(event.target.value))
                }
                className="field-control mt-2"
              >
                <option value={0}>Any score</option>
                {[1, 2, 3, 4].map((score) => (
                  <option key={score} value={score}>
                    {score}+ / 5
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#dce3da] bg-white/60 p-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-[#344239]">
            <input
              type="checkbox"
              aria-label="Select all visible signals"
              checked={
                signals.length > 0 && signals.every((signal) => selectedIds.includes(signal.id))
              }
              onChange={(event) =>
                setSelectedIds(event.target.checked ? signals.map((signal) => signal.id) : [])
              }
            />{" "}
            Select all visible
          </label>
          <span className="text-xs text-[#748078]">{selectedIds.length} selected</span>
          <button
            type="button"
            onClick={() => void bulkReview("needs-verification")}
            disabled={selectedIds.length === 0}
            className="button-secondary"
          >
            Review selected
          </button>
          <button
            type="button"
            onClick={() => void bulkReview("rejected")}
            disabled={selectedIds.length === 0}
            className="button-secondary"
          >
            Reject selected
          </button>
        </div>
        {signals.length === 0 ? (
          <div className="mt-5 rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
            <h3 className="text-xl font-semibold text-[#17201b]">No public signals in this view</h3>
            <p className="mt-3 text-sm text-[#748078]">
              Submit a permitted RSS/Atom feed or public GitHub JSON endpoint to start a review
              queue.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {signals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onReview={updateReview}
                onPromote={promote}
                selected={selectedIds.includes(signal.id)}
                onSelect={(selected) =>
                  setSelectedIds((current) =>
                    selected
                      ? [...new Set([...current, signal.id])]
                      : current.filter((id) => id !== signal.id),
                  )
                }
              />
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="cluster-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
              Issue intelligence
            </p>
            <h2
              id="cluster-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
            >
              Issue clusters and timelines
            </h2>
          </div>
          <span className="text-sm text-[#748078]">
            {clusters.length} cluster{clusters.length === 1 ? "" : "s"}
          </span>
        </div>
        {clusters.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-[#cbd8c8] bg-white/50 px-5 py-12 text-center">
            <p className="text-lg font-semibold text-[#17201b]">Clusters appear after discovery</p>
            <p className="mt-2 text-sm text-[#748078]">
              Repeated signals will share a timeline without being counted as independent sources.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {clusters.map((cluster) => (
              <ClusterCard
                key={cluster.id}
                cluster={cluster}
                capabilities={capabilities}
                onMatch={matchCapability}
                onResolve={updateCluster}
                onMatchReview={updateMatch}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SignalCard({
  signal,
  onReview,
  onPromote,
  selected,
  onSelect,
}: {
  signal: DiscoverySignalView;
  onReview: (id: string, status: DiscoveryReviewStatus) => Promise<void>;
  onPromote: (id: string, createOpportunity: boolean) => Promise<void>;
  selected: boolean;
  onSelect: (selected: boolean) => void;
}) {
  const isRejected = signal.reviewStatus === "rejected";
  const isCorroborated = signal.reviewStatus === "corroborated";
  return (
    <article
      tabIndex={0}
      data-signal-card="true"
      onKeyDown={(event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        const cards = [...document.querySelectorAll<HTMLElement>('[data-signal-card="true"]')];
        const currentIndex = cards.indexOf(event.currentTarget);
        const nextIndex = event.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1;
        cards[nextIndex]?.focus();
        event.preventDefault();
      }}
      className={`rounded-3xl border p-5 ${isCorroborated ? "border-[#d4e4c2] bg-[#f8fcf4]" : isRejected ? "border-[#dce3da] bg-white/60" : "border-[#ead9b5] bg-[#fffaf0]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#68766e]">
            <input
              type="checkbox"
              aria-label={`Select ${signal.title}`}
              checked={selected}
              onChange={(event) => onSelect(event.target.checked)}
            />{" "}
            Select for bulk review
          </label>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
            {formatLabel(signal.sourceType)} · {signal.company.name}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#17201b]">{signal.title}</h3>
        </div>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#68766e]">
          {formatLabel(signal.reviewStatus)}
        </span>
      </div>
      <a
        href={signal.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block truncate text-sm text-[#607a3e] underline decoration-[#b8cba2] underline-offset-4"
      >
        {signal.sourceUrl}
      </a>
      <p className="mt-4 text-sm leading-6 text-[#59685f]">
        {signal.excerpt || "No excerpt was provided by the source."}
      </p>
      <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm leading-6 text-[#59685f]">
        <strong className="font-semibold text-[#344239]">Neutral summary:</strong>{" "}
        {signal.neutralSummary}
      </p>
      <div className="mt-4 grid gap-2 text-xs text-[#748078] sm:grid-cols-3">
        <span>Published {formatDate(signal.sourcePublishedAt)}</span>
        <span>Observed {formatDate(signal.observedAt)}</span>
        <span>HTTP {signal.responseStatus ?? "—"}</span>
      </div>
      <div className="mt-4 rounded-2xl border border-[#dce3da] bg-white/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
            Explainable rank
          </p>
          <strong className="text-lg text-[#17201b]">{signal.rankingScore.toFixed(2)} / 5</strong>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#68766e] sm:grid-cols-3">
          <span>Recency {signal.recencyScore}/5</span>
          <span>Specificity {signal.specificityScore}/5</span>
          <span>Reliability {signal.sourceReliabilityScore}/5</span>
          <span>Independent sources {signal.independentSourceCount}</span>
          <span>Corroboration {signal.corroborationScore}/5</span>
          <span>Impact {signal.impactScore}/5</span>
          <span>Solution fit {signal.solutionFitScore}/5</span>
        </div>
      </div>
      {signal.promotedAt && (
        <p className="mt-3 text-xs font-semibold text-[#607a3e]">
          Promoted to evidence {formatDate(signal.promotedAt)}. The source record remains unchanged.
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {!isCorroborated && !isRejected && signal.reviewStatus === "discovered" && (
          <button
            type="button"
            onClick={() => void onReview(signal.id, "needs-verification")}
            className="button-secondary"
          >
            Needs verification
          </button>
        )}
        {!isCorroborated && !isRejected && signal.reviewStatus === "needs-verification" && (
          <button
            type="button"
            onClick={() => void onReview(signal.id, "corroborated")}
            className="button-primary"
          >
            Mark corroborated
          </button>
        )}
        {isCorroborated && !signal.promotedAt && (
          <>
            <button
              type="button"
              onClick={() => void onPromote(signal.id, false)}
              className="button-primary"
            >
              Promote to evidence
            </button>
            <button
              type="button"
              onClick={() => void onPromote(signal.id, true)}
              className="button-secondary"
            >
              Evidence + opportunity
            </button>
          </>
        )}
        {!isRejected && signal.reviewStatus !== "stale" && (
          <button
            type="button"
            onClick={() => void onReview(signal.id, "rejected")}
            className="button-secondary"
          >
            Reject signal
          </button>
        )}
        {(isRejected || signal.reviewStatus === "stale") && (
          <button
            type="button"
            onClick={() => void onReview(signal.id, "discovered")}
            className="button-secondary"
          >
            Reopen review
          </button>
        )}
        {isCorroborated && (
          <Link href={`/evidence?companyId=${signal.companyId}`} className="button-secondary">
            Open evidence
          </Link>
        )}
      </div>
    </article>
  );
}

function ClusterCard({
  cluster,
  capabilities,
  onMatch,
  onResolve,
  onMatchReview,
}: {
  cluster: DiscoveryClusterView;
  capabilities: DiscoveryCapabilityView[];
  onMatch: (clusterId: string, capabilityId: string) => Promise<void>;
  onResolve: (clusterId: string, resolutionState: string) => Promise<void>;
  onMatchReview: (matchId: string, reviewStatus: string) => Promise<void>;
}) {
  const [capabilityId, setCapabilityId] = useState("");
  return (
    <article className="rounded-3xl border border-[#dce3da] bg-white/75 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
            {formatLabel(cluster.resolutionState)} · {cluster.company.name}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#17201b]">{cluster.title}</h3>
        </div>
        <strong className="rounded-full bg-[#e8f2dc] px-3 py-1 text-xs text-[#607a3e]">
          {cluster.rankingScore.toFixed(2)} / 5
        </strong>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#59685f]">{cluster.neutralSummary}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#748078] sm:grid-cols-3">
        <span>First seen {formatDate(cluster.firstSeenAt)}</span>
        <span>Latest seen {formatDate(cluster.latestSeenAt)}</span>
        <span>Independent sources {cluster.independentSourceCount}</span>
        <span>Corroboration {cluster.corroborationScore}/5</span>
        <span>Impact {cluster.impactScore}/5</span>
        <span>Solution fit {cluster.solutionFitScore}/5</span>
      </div>
      <div className="mt-4 rounded-2xl border border-[#dce3da] bg-white/70 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
          Evidence timeline
        </p>
        <div className="mt-3 space-y-3">
          {cluster.timeline.slice(0, 5).map((event) => (
            <div key={event.id} className="border-l-2 border-[#c7d9b0] pl-3">
              <p className="text-xs font-semibold text-[#344239]">
                {formatLabel(event.eventType)} · {formatDate(event.createdAt)}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#748078]">{event.summary}</p>
              {event.sourceUrl && (
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-xs text-[#607a3e] underline"
                >
                  {event.sourceUrl}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onResolve(cluster.id, "open")}
          className="button-secondary"
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => void onResolve(cluster.id, "monitoring")}
          className="button-secondary"
        >
          Monitor
        </button>
        <button
          type="button"
          onClick={() => void onResolve(cluster.id, "resolved")}
          className="button-secondary"
        >
          Mark resolved
        </button>
        <button
          type="button"
          onClick={() => void onResolve(cluster.id, "stale")}
          className="button-secondary"
        >
          Mark stale
        </button>
      </div>
      <div className="mt-4 rounded-2xl border border-[#d4e4c2] bg-[#f5faef] p-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
          Solution matching
        </p>
        <div className="mt-3 flex gap-2">
          <select
            aria-label={`Capability for ${cluster.title}`}
            value={capabilityId}
            onChange={(event) => setCapabilityId(event.target.value)}
            className="field-control"
          >
            <option value="">Choose capability</option>
            {capabilities.map((capability) => (
              <option key={capability.id} value={capability.id}>
                {capability.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!capabilityId}
            onClick={() => void onMatch(cluster.id, capabilityId)}
            className="button-secondary"
          >
            Match
          </button>
        </div>
        {cluster.solutionMatches.length > 0 && (
          <div className="mt-3 space-y-2">
            {cluster.solutionMatches.map((match) => (
              <div key={match.id} className="rounded-xl bg-white/75 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#344239]">{match.capability.name}</p>
                  <span className="text-xs text-[#748078]">
                    Fit {match.fitScore}/5 · {formatLabel(match.reviewStatus)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#68766e]">{match.rationale}</p>
                {match.reviewStatus === "needs-review" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void onMatchReview(match.id, "approved")}
                      className="button-primary"
                    >
                      Approve fit
                    </button>
                    <button
                      type="button"
                      onClick={() => void onMatchReview(match.id, "rejected")}
                      className="button-secondary"
                    >
                      Reject fit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
