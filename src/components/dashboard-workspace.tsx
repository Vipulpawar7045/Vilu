"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { filterAndSortDashboardOpportunities, type DashboardOpportunity } from "@/domain/dashboard";
import { FRESHNESS_LABELS, type ConfidenceLevel, type FreshnessLabel } from "@/domain/rules";
import { MetricCard } from "@/components/workspace-page";

export type DashboardOpportunityView = Omit<
  DashboardOpportunity,
  "lastVerifiedAt" | "updatedAt"
> & { lastVerifiedAt: string | null; updatedAt: string };
export type DashboardFollowUpView = {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  companyName: string;
  contactName: string;
  status: string;
  followUpAt: string | null;
  overdue: boolean;
};
export type DashboardCompanyView = {
  id: string;
  name: string;
  status: string;
  lastResearchedAt: string | null;
};
export type DashboardMonitoringAlertView = {
  id: string;
  sourceId: string;
  sourceTitle: string | null;
  sourceUrl: string;
  companyName: string;
  resultStatus: string;
  checkedAt: string;
};

type DashboardPayload = {
  opportunities: DashboardOpportunityView[];
  followUps: DashboardFollowUpView[];
  companies: DashboardCompanyView[];
  metrics: {
    hotRecent: number;
    needsVerification: number;
    staleSoon: number;
    readyForOutreach: number;
    followUpsToday: number;
    overdueFollowUps: number;
    companiesResearched: number;
    monitoringAlerts: number;
  };
  sections: {
    hotRecent: DashboardOpportunityView[];
    needsVerification: DashboardOpportunityView[];
    staleSoon: DashboardOpportunityView[];
    readyForOutreach: DashboardOpportunityView[];
    recentlyChanged: DashboardOpportunityView[];
    monitoringAlerts: DashboardMonitoringAlertView[];
  };
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
};

export function DashboardWorkspace({ initialData }: { initialData: DashboardPayload }) {
  const [freshness, setFreshness] = useState<FreshnessLabel | "all">("all");
  const [confidence, setConfidence] = useState<ConfidenceLevel | "all">("all");
  const [category, setCategory] = useState("all");
  const [companyId, setCompanyId] = useState("all");
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState<"freshness" | "priority" | "confidence" | "last-verified">(
    "freshness",
  );

  const filtered = useMemo(
    () =>
      filterAndSortDashboardOpportunities(initialData.opportunities, {
        freshness,
        confidence,
        category,
        companyId,
        status,
        sort,
      }),
    [initialData.opportunities, freshness, confidence, category, companyId, status, sort],
  );
  const filteredIds = new Set(filtered.map((opportunity) => opportunity.id));
  const section = (items: DashboardOpportunityView[]) =>
    items.filter((item) => filteredIds.has(item.id));
  const categories = Object.keys(initialData.categoryCounts).sort();

  return (
    <div className="space-y-6">
      <section aria-label="Workspace metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Hot and recent"
          value={String(initialData.metrics.hotRecent)}
          detail="Current research queue"
        />
        <MetricCard
          label="Needs verification"
          value={String(initialData.metrics.needsVerification)}
          detail="Aging or changed evidence"
        />
        <MetricCard
          label="Ready for outreach"
          value={String(initialData.metrics.readyForOutreach)}
          detail="Passed freshness gates"
        />
        <MetricCard
          label="Follow-ups due"
          value={String(initialData.metrics.followUpsToday)}
          detail={`${initialData.metrics.overdueFollowUps} overdue`}
        />
        <MetricCard
          label="Companies researched"
          value={String(initialData.metrics.companiesResearched)}
          detail="With a research date"
        />
        <MetricCard
          label="Monitoring alerts"
          value={String(initialData.metrics.monitoringAlerts)}
          detail="Changed sources to review"
        />
      </section>

      <section
        aria-labelledby="dashboard-filters-heading"
        className="rounded-3xl border border-[#dce3da] bg-white/65 p-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
              Research controls
            </p>
            <h2
              id="dashboard-filters-heading"
              className="mt-2 text-xl font-semibold tracking-[-0.035em] text-[#17201b]"
            >
              Focus the queue
            </h2>
          </div>
          <p className="text-sm text-[#748078]">
            {filtered.length} matching {filtered.length === 1 ? "opportunity" : "opportunities"}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Filter
            label="Freshness"
            value={freshness}
            onChange={(value) => setFreshness(value as FreshnessLabel | "all")}
            options={["all", ...FRESHNESS_LABELS]}
          />
          <Filter
            label="Confidence"
            value={confidence}
            onChange={(value) => setConfidence(value as ConfidenceLevel | "all")}
            options={["all", "High", "Medium", "Low"]}
          />
          <Filter
            label="Category"
            value={category}
            onChange={setCategory}
            options={["all", ...categories]}
          />
          <Filter
            label="Company"
            value={companyId}
            onChange={setCompanyId}
            options={["all", ...initialData.companies.map((company) => company.id)]}
            labels={Object.fromEntries(
              initialData.companies.map((company) => [company.id, company.name]),
            )}
          />
          <Filter
            label="Status"
            value={status}
            onChange={setStatus}
            options={["active", "needs-verification", "resolved", "all"]}
          />
          <Filter
            label="Sort"
            value={sort}
            onChange={(value) => setSort(value as typeof sort)}
            options={["freshness", "priority", "confidence", "last-verified"]}
          />
        </div>
      </section>

      <section
        aria-labelledby="priority-queue-heading"
        className="rounded-3xl border border-[#dce3da] bg-white/65 p-5"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
              Filtered queue
            </p>
            <h2
              id="priority-queue-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
            >
              What needs attention
            </h2>
          </div>
          <Link href="/opportunities" className="button-secondary">
            Open opportunities
          </Link>
        </div>
        {filtered.length === 0 ? (
          <EmptyQueue />
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {filtered.slice(0, 8).map((opportunity) => (
              <DashboardOpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="dashboard-sections-heading">
        <h2 id="dashboard-sections-heading" className="sr-only">
          Dashboard queues
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <QueueSection
            title="Hot and recent"
            description="Current signals worth researching first."
            items={section(initialData.sections.hotRecent)}
            tone="green"
          />
          <QueueSection
            title="Needs verification"
            description="Stale, changed, inaccessible, or explicitly flagged."
            items={section(initialData.sections.needsVerification)}
            tone="yellow"
          />
          <QueueSection
            title="Evidence becoming stale"
            description="Aging records that should be re-checked."
            items={section(initialData.sections.staleSoon)}
            tone="yellow"
          />
          <QueueSection
            title="Ready for outreach"
            description="Freshness and solution gates are currently clear."
            items={section(initialData.sections.readyForOutreach)}
            tone="green"
          />
        </div>
      </section>

      <MonitoringAlertSection alerts={initialData.sections.monitoringAlerts} />

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <FollowUpPanel followUps={initialData.followUps} />
        <CountsPanel
          categoryCounts={initialData.categoryCounts}
          statusCounts={initialData.statusCounts}
        />
      </section>
      <QueueSection
        title="Recently changed or resolved"
        description="Keep recent workflow movement visible."
        items={section(initialData.sections.recentlyChanged)}
      />
    </div>
  );
}

function MonitoringAlertSection({ alerts }: { alerts: DashboardMonitoringAlertView[] }) {
  return (
    <section
      className="rounded-3xl border border-[#ead9b5] bg-[#fff8e8]/80 p-5"
      aria-labelledby="dashboard-monitoring-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b08432]">
            Monitoring review
          </p>
          <h2
            id="dashboard-monitoring-heading"
            className="mt-2 text-xl font-semibold tracking-[-0.035em] text-[#17201b]"
          >
            Changed sources
          </h2>
          <p className="mt-2 text-sm text-[#748078]">
            Source changes and failures that may affect current opportunities.
          </p>
        </div>
        <Link href="/monitoring" className="button-secondary">
          Review alerts
        </Link>
      </div>
      {alerts.length === 0 ? (
        <p className="mt-5 text-sm text-[#8a9890]">No pending monitoring alerts.</p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {alerts.slice(0, 6).map((alert) => (
            <article key={alert.id} className="rounded-2xl border border-[#f0e3c8] bg-white/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#b08432]">
                {formatLabel(alert.resultStatus)} · {alert.companyName}
              </p>
              <h3 className="mt-2 font-semibold text-[#17201b]">
                {alert.sourceTitle || alert.sourceUrl}
              </h3>
              <p className="mt-2 text-xs text-[#8a9890]">Checked {formatDate(alert.checkedAt)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
  labels = {},
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#8a9890]">
      {label}
      <select
        aria-label={`Dashboard ${label} filter`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control mt-2 normal-case tracking-normal"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function QueueSection({
  title,
  description,
  items,
  tone = "default",
}: {
  title: string;
  description: string;
  items: DashboardOpportunityView[];
  tone?: "default" | "green" | "yellow";
}) {
  const toneClass =
    tone === "green"
      ? "border-[#d4e4c2] bg-[#e8f2dc]/70"
      : tone === "yellow"
        ? "border-[#ead9b5] bg-[#fff8e8]/80"
        : "border-[#dce3da] bg-white/65";
  return (
    <section className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7d965b]">{title}</p>
          <p className="mt-2 text-sm text-[#748078]">{description}</p>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-[#607a3e]">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-5 text-sm text-[#8a9890]">Nothing in this queue.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.slice(0, 4).map((item) => (
            <DashboardOpportunityCard key={item.id} opportunity={item} compact />
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardOpportunityCard({
  opportunity,
  compact = false,
}: {
  opportunity: DashboardOpportunity;
  compact?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border border-[#edf0eb] bg-white/75 p-4 ${compact ? "" : "shadow-[0_12px_35px_rgba(60,82,59,0.04)]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#7d965b]">
            {opportunity.companyName} · {formatLabel(opportunity.category)}
          </p>
          <h3
            className={`${compact ? "text-base" : "text-lg"} mt-2 font-semibold tracking-[-0.025em] text-[#17201b]`}
          >
            {opportunity.title}
          </h3>
        </div>
        <span className={freshnessClass(opportunity.freshnessLabel)}>
          {opportunity.freshnessLabel}
        </span>
      </div>
      {!compact && (
        <p className="mt-2 text-sm leading-6 text-[#59685f]">{opportunity.hypothesis}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8a9890]">
        <span>Priority {opportunity.priorityScore.toFixed(2)}</span>
        <span>Confidence {opportunity.confidence}</span>
        <span>{opportunity.evidenceCount} evidence</span>
        <span>{formatLabel(opportunity.status)}</span>
      </div>
      <Link
        href={`/opportunities?companyId=${opportunity.companyId}`}
        className="mt-3 inline-block text-xs font-bold text-[#607a3e] underline decoration-[#c7f36b] underline-offset-4"
      >
        Review opportunity →
      </Link>
    </article>
  );
}

function FollowUpPanel({ followUps }: { followUps: DashboardFollowUpView[] }) {
  return (
    <section className="rounded-3xl border border-[#dce3da] bg-white/65 p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7d965b]">
            Personal follow-up
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-[#17201b]">
            Due and overdue
          </h2>
        </div>
        <Link href="/outreach" className="button-secondary">
          Open outreach
        </Link>
      </div>
      {followUps.length === 0 ? (
        <p className="mt-5 text-sm text-[#8a9890]">No follow-ups scheduled.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {followUps.slice(0, 6).map((followUp) => (
            <div
              key={followUp.id}
              className={`rounded-2xl border p-3 ${followUp.overdue ? "border-[#ead9b5] bg-[#fff8e8]" : "border-[#edf0eb] bg-[#fbfcfa]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#344239]">
                    {followUp.opportunityTitle}
                  </p>
                  <p className="mt-1 text-xs text-[#748078]">
                    {followUp.contactName} · {followUp.companyName}
                  </p>
                </div>
                <span
                  className={
                    followUp.overdue ? "text-xs font-bold text-[#9a762c]" : "text-xs text-[#8a9890]"
                  }
                >
                  {followUp.followUpAt ? formatDate(followUp.followUpAt) : "No date"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CountsPanel({
  categoryCounts,
  statusCounts,
}: {
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
}) {
  return (
    <section className="rounded-3xl border border-[#dce3da] bg-white/65 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7d965b]">
        Workspace distribution
      </p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <CountGroup title="By category" counts={categoryCounts} />
        <CountGroup title="By status" counts={statusCounts} />
      </div>
    </section>
  );
}
function CountGroup({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((left, right) => right[1] - left[1]);
  return (
    <div>
      <h2 className="text-sm font-semibold text-[#344239]">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-xs text-[#8a9890]">No records.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.slice(0, 6).map(([key, count]) => (
            <li
              key={key}
              className="flex items-center justify-between gap-3 text-xs text-[#68766e]"
            >
              <span>{formatLabel(key)}</span>
              <span className="rounded-full bg-[#edf2eb] px-2 py-0.5 font-bold text-[#607a3e]">
                {count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function EmptyQueue() {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-[#cbd8c8] bg-[#fbfcfa] px-5 py-10 text-center">
      <p className="font-semibold text-[#17201b]">No opportunities match these filters</p>
      <p className="mt-2 text-sm text-[#748078]">
        Broaden the queue or create a new evidence-backed hypothesis.
      </p>
    </div>
  );
}
function freshnessClass(label: FreshnessLabel) {
  if (label === "Hot")
    return "rounded-full bg-[#e8f2dc] px-2.5 py-1 text-[11px] font-bold text-[#607a3e]";
  if (label === "Recent")
    return "rounded-full bg-[#edf2eb] px-2.5 py-1 text-[11px] font-bold text-[#607a3e]";
  if (label === "Aging")
    return "rounded-full bg-[#fff8e8] px-2.5 py-1 text-[11px] font-bold text-[#9a762c]";
  return "rounded-full bg-[#fff0ef] px-2.5 py-1 text-[11px] font-bold text-[#a3483e]";
}
function formatLabel(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function formatDate(value: string) {
  return new Date(value).toISOString().slice(0, 16).replace("T", " ");
}
