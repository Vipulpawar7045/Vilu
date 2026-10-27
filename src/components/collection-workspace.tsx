"use client";

import Link from "next/link";
import { useState } from "react";

import { COLLECTION_PAGE_TYPES, type CollectionReviewStatus } from "@/domain/collection";

export type CollectionCompanyView = {
  id: string;
  name: string;
  websiteUrl: string;
};

export type CollectionCandidateView = {
  id: string;
  companyId: string;
  url: string;
  pageType: string;
  title: string | null;
  fetchedAt: string;
  responseStatus: number | null;
  contentHash: string | null;
  previousHash: string | null;
  normalizedText: string | null;
  changeStatus: string;
  reviewStatus: CollectionReviewStatus;
  errorMessage: string | null;
  company: { id: string; name: string };
};

export function CollectionWorkspace({
  initialCompanies,
  initialCandidates,
}: {
  initialCompanies: CollectionCompanyView[];
  initialCandidates: CollectionCandidateView[];
}) {
  const [companies] = useState(initialCompanies);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [companyId, setCompanyId] = useState(initialCompanies[0]?.id ?? "");
  const [url, setUrl] = useState(initialCompanies[0]?.websiteUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function selectCompany(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    setUrl(companies.find((company) => company.id === nextCompanyId)?.websiteUrl ?? "");
  }

  async function collect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, url }),
      });
      const payload = (await response.json()) as {
        candidate?: CollectionCandidateView;
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok || !payload.candidate) {
        setError(
          payload.errors?.url ??
            payload.errors?.companyId ??
            payload.error ??
            "The page could not be collected.",
        );
        return;
      }
      setCandidates((current) => [
        payload.candidate!,
        ...current.filter((candidate) => candidate.id !== payload.candidate?.id),
      ]);
      setNotice(
        payload.candidate.changeStatus === "unchanged"
          ? "The page is unchanged; no new review is required."
          : "A review candidate was added to the queue.",
      );
    } catch {
      setError("The collection request could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function updateReview(candidateId: string, reviewStatus: CollectionReviewStatus) {
    setError("");
    const response = await fetch(`/api/collection/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus }),
    });
    const payload = (await response.json()) as {
      candidate?: CollectionCandidateView;
      error?: string;
    };
    if (!response.ok || !payload.candidate) {
      setError(payload.error ?? "The review status could not be saved.");
      return;
    }
    setCandidates((current) =>
      current.map((candidate) => (candidate.id === candidateId ? payload.candidate! : candidate)),
    );
  }

  if (companies.length === 0) {
    return (
      <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8aa95b]">
          Company first
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
          Add a company before collecting pages
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#748078]">
          Collection is restricted to the website domain recorded for a company.
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
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
            Permitted collection
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
            Fetch one public page for review
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#68766e]">
            Vilu checks the company-domain allowlist and robots.txt, uses a rate-limited controlled
            browser fetch, and stores the result as a candidate. It never creates evidence or
            outreach automatically.
          </p>
        </div>
        <form
          onSubmit={collect}
          className="mt-6 grid gap-4 lg:grid-cols-[0.7fr_1fr_auto] lg:items-end"
        >
          <label className="text-sm font-semibold text-[#344239]">
            Company
            <select
              aria-label="Collection company"
              value={companyId}
              onChange={(event) => selectCompany(event.target.value)}
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
            Public page URL
            <input
              aria-label="Collection page URL"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/pricing"
              className="field-control mt-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !companyId || !url.trim()}
            className="button-primary"
          >
            {loading ? "Collecting..." : "Collect page"}
          </button>
        </form>
        <p className="mt-4 text-xs leading-5 text-[#748078]">
          Allowlisted page types: {COLLECTION_PAGE_TYPES.map(formatLabel).join(", ")}.
        </p>
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

      <section aria-labelledby="collection-queue-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
              Review queue
            </p>
            <h2
              id="collection-queue-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
            >
              Collected page candidates
            </h2>
          </div>
          <span className="text-sm text-[#748078]">
            {candidates.filter((candidate) => candidate.reviewStatus === "pending").length} pending
          </span>
        </div>
        {candidates.length === 0 ? (
          <div className="mt-5 rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
            <h3 className="text-xl font-semibold text-[#17201b]">No collected pages yet</h3>
            <p className="mt-3 text-sm text-[#748078]">
              Start with a homepage, pricing, product, documentation, careers, changelog, or status
              page.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {candidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} onReview={updateReview} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CandidateCard({
  candidate,
  onReview,
}: {
  candidate: CollectionCandidateView;
  onReview: (id: string, status: CollectionReviewStatus) => Promise<void>;
}) {
  const needsReview = candidate.reviewStatus === "pending";
  return (
    <article
      className={`rounded-3xl border p-5 ${needsReview ? "border-[#ead9b5] bg-[#fffaf0]" : "border-[#dce3da] bg-white/75"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
            {formatLabel(candidate.pageType)} · {candidate.company.name}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#17201b]">
            {candidate.title || candidate.url}
          </h3>
        </div>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#68766e]">
          {formatLabel(candidate.reviewStatus)}
        </span>
      </div>
      <a
        href={candidate.url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block truncate text-sm text-[#607a3e] underline decoration-[#b8cba2] underline-offset-4"
      >
        {candidate.url}
      </a>
      <div className="mt-4 grid gap-2 text-xs text-[#748078] sm:grid-cols-3">
        <span>Fetched {formatDate(candidate.fetchedAt)}</span>
        <span>HTTP {candidate.responseStatus ?? "—"}</span>
        <span>{formatLabel(candidate.changeStatus)}</span>
      </div>
      {candidate.errorMessage ? (
        <p className="mt-4 rounded-xl bg-[#fff7f6] px-3 py-2 text-sm text-[#a3483e]">
          {candidate.errorMessage}
        </p>
      ) : (
        <p className="mt-4 line-clamp-4 text-sm leading-6 text-[#59685f]">
          {candidate.normalizedText || "No readable text was found."}
        </p>
      )}
      {candidate.contentHash && (
        <p className="mt-4 break-all text-[11px] text-[#8a9890]">SHA-256 {candidate.contentHash}</p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {needsReview && (
          <>
            <button
              type="button"
              onClick={() => void onReview(candidate.id, "accepted")}
              className="button-primary"
            >
              Mark reviewed
            </button>
            <button
              type="button"
              onClick={() => void onReview(candidate.id, "rejected")}
              className="button-secondary"
            >
              Reject candidate
            </button>
          </>
        )}
        {candidate.reviewStatus !== "pending" && (
          <button
            type="button"
            onClick={() => void onReview(candidate.id, "pending")}
            className="button-secondary"
          >
            Reopen review
          </button>
        )}
        {candidate.reviewStatus === "accepted" && (
          <Link href={`/evidence?companyId=${candidate.companyId}`} className="button-secondary">
            Review evidence
          </Link>
        )}
      </div>
    </article>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
