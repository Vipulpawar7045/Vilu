"use client";

import Link from "next/link";
import { useState } from "react";

import type { MonitoringReviewStatus } from "@/domain/monitoring";

export type MonitoringSourceView = {
  id: string;
  url: string;
  title: string | null;
  lastCheckedAt: string | null;
  accessibilityStatus: string;
  company: { id: string; name: string; priority: number };
  _count: { evidence: number; checks: number };
};

export type MonitoringCheckView = {
  id: string;
  sourceId: string;
  checkedAt: string;
  responseStatus: number | null;
  finalUrl: string | null;
  previousHash: string | null;
  contentHash: string | null;
  normalizedText: string | null;
  resultStatus: string;
  reviewStatus: MonitoringReviewStatus;
  errorMessage: string | null;
  source: {
    id: string;
    url: string;
    title: string | null;
    company: { id: string; name: string };
  };
};

export function MonitoringWorkspace({
  initialSources,
  initialChecks,
}: {
  initialSources: MonitoringSourceView[];
  initialChecks: MonitoringCheckView[];
}) {
  const [sources, setSources] = useState(initialSources);
  const [checks, setChecks] = useState(initialChecks);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const alerts = checks.filter((check) => check.reviewStatus === "pending");

  async function refresh() {
    const response = await fetch("/api/monitoring", { cache: "no-store" });
    const payload = (await response.json()) as {
      sources?: MonitoringSourceView[];
      checks?: MonitoringCheckView[];
    };
    if (!response.ok) throw new Error("Monitoring data could not be refreshed.");
    setSources(payload.sources ?? []);
    setChecks(payload.checks ?? []);
  }

  async function run() {
    setRunning(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/monitoring", { method: "POST" });
      const payload = (await response.json()) as {
        checkedCount?: number;
        alertCount?: number;
        downgradedCount?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Monitoring could not be completed.");
      await refresh();
      setNotice(
        `Checked ${payload.checkedCount ?? 0} source${payload.checkedCount === 1 ? "" : "s"}; ${payload.alertCount ?? 0} new alert${payload.alertCount === 1 ? "" : "s"}; ${payload.downgradedCount ?? 0} opportunity${payload.downgradedCount === 1 ? "" : "ies"} flagged for verification.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Monitoring could not be completed.");
    } finally {
      setRunning(false);
    }
  }

  async function updateReview(id: string, reviewStatus: MonitoringReviewStatus) {
    setError("");
    const response = await fetch(`/api/monitoring/check/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus }),
    });
    const payload = (await response.json()) as { check?: MonitoringCheckView; error?: string };
    if (!response.ok || !payload.check) {
      setError(payload.error ?? "The monitoring alert could not be updated.");
      return;
    }
    setChecks((current) => current.map((check) => (check.id === id ? payload.check! : check)));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d4e4c2] bg-[#f5faef] p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
              Replaceable local job
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
              Re-check important sources
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#68766e]">
              Vilu checks sources belonging to active companies with priority 4 or 5. Changes,
              missing pages, blocked pages, and failures become review alerts. Historical evidence
              stays intact and opportunity hypotheses are never rewritten.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running}
            className="button-primary shrink-0"
          >
            {running ? "Checking sources..." : "Run re-verification"}
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-[#f0cbc6] bg-[#fff7f6] px-3 py-2 text-sm text-[#a3483e]"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-[#d4e4c2] bg-white/70 px-3 py-2 text-sm text-[#607a3e]"
          >
            {notice}
          </p>
        )}
        <p className="mt-5 text-xs leading-5 text-[#748078]">
          For a scheduler or command-line job, run{" "}
          <code className="rounded bg-white/80 px-1.5 py-0.5">npm run monitor</code>.
        </p>
      </section>

      <section aria-labelledby="monitoring-sources-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
              High-priority sources
            </p>
            <h2
              id="monitoring-sources-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
            >
              Scheduled targets
            </h2>
          </div>
          <span className="text-sm text-[#748078]">
            {sources.length} source{sources.length === 1 ? "" : "s"}
          </span>
        </div>
        {sources.length === 0 ? (
          <EmptyMonitoringState />
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {sources.map((source) => (
              <article
                key={source.id}
                className="rounded-3xl border border-[#dce3da] bg-white/75 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
                      Priority {source.company.priority} · {source.company.name}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[#17201b]">
                      {source.title || source.url}
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#edf2eb] px-3 py-1 text-xs font-semibold text-[#607a3e]">
                    {formatLabel(source.accessibilityStatus)}
                  </span>
                </div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block truncate text-sm text-[#607a3e] underline decoration-[#b8cba2] underline-offset-4"
                >
                  {source.url}
                </a>
                <p className="mt-4 text-xs text-[#748078]">
                  Last checked {formatDate(source.lastCheckedAt)} · {source._count.checks}{" "}
                  historical check{source._count.checks === 1 ? "" : "s"} · {source._count.evidence}{" "}
                  evidence record{source._count.evidence === 1 ? "" : "s"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="monitoring-alerts-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b08432]">
              Human review required
            </p>
            <h2
              id="monitoring-alerts-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
            >
              Monitoring alerts
            </h2>
          </div>
          <span className="text-sm text-[#748078]">{alerts.length} pending</span>
        </div>
        {alerts.length === 0 ? (
          <div className="mt-5 rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-14 text-center">
            <h3 className="text-xl font-semibold text-[#17201b]">No pending monitoring alerts</h3>
            <p className="mt-3 text-sm text-[#748078]">
              Run a re-verification check when a high-priority source needs attention.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {alerts.map((check) => (
              <AlertCard key={check.id} check={check} onReview={updateReview} />
            ))}
          </div>
        )}
      </section>

      <section
        aria-labelledby="monitoring-history-heading"
        className="rounded-3xl border border-[#dce3da] bg-white/65 p-5"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
              Preserved history
            </p>
            <h2
              id="monitoring-history-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
            >
              Recent checks
            </h2>
          </div>
          <Link href="/dashboard" className="button-secondary">
            Open dashboard
          </Link>
        </div>
        <div className="mt-4 divide-y divide-[#edf0eb]">
          {checks.slice(0, 12).map((check) => (
            <div
              key={check.id}
              className="flex flex-col gap-2 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-[#344239]">
                  {check.source.company.name} · {check.source.title || check.source.url}
                </p>
                <p className="mt-1 text-xs text-[#748078]">
                  {formatDate(check.checkedAt)} · HTTP {check.responseStatus ?? "—"} ·{" "}
                  {formatLabel(check.resultStatus)}
                </p>
              </div>
              <span className="text-xs font-semibold text-[#8a9890]">
                {formatLabel(check.reviewStatus)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AlertCard({
  check,
  onReview,
}: {
  check: MonitoringCheckView;
  onReview: (id: string, status: MonitoringReviewStatus) => Promise<void>;
}) {
  return (
    <article className="rounded-3xl border border-[#ead9b5] bg-[#fffaf0] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#b08432]">
            {formatLabel(check.resultStatus)} · {check.source.company.name}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#17201b]">
            {check.source.title || check.source.url}
          </h3>
        </div>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#9a762c]">
          Pending
        </span>
      </div>
      <a
        href={check.source.url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block truncate text-sm text-[#607a3e] underline decoration-[#b8cba2] underline-offset-4"
      >
        {check.source.url}
      </a>
      <p className="mt-4 text-sm leading-6 text-[#59685f]">
        {check.errorMessage ||
          check.normalizedText ||
          "The source content changed and needs review."}
      </p>
      <p className="mt-4 text-xs text-[#8a9890]">
        Checked {formatDate(check.checkedAt)} · HTTP {check.responseStatus ?? "—"}
      </p>
      {check.previousHash && check.contentHash && (
        <p className="mt-3 break-all text-[11px] text-[#8a9890]">
          Previous {check.previousHash} · current {check.contentHash}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onReview(check.id, "acknowledged")}
          className="button-primary"
        >
          Acknowledge review
        </button>
        <Link href="/evidence" className="button-secondary">
          Open evidence
        </Link>
      </div>
    </article>
  );
}

function EmptyMonitoringState() {
  return (
    <div className="mt-5 rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-14 text-center">
      <h3 className="text-xl font-semibold text-[#17201b]">No high-priority sources selected</h3>
      <p className="mt-3 text-sm text-[#748078]">
        Set a company priority to 4 or 5, then add a public source to make it eligible for
        monitoring.
      </p>
      <Link href="/companies" className="button-primary mt-6">
        Open companies
      </Link>
    </div>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "Not checked yet";
}
