"use client";

import Link from "next/link";
import { useState } from "react";

import { FRESHNESS_LABELS, type FreshnessLabel } from "@/domain/rules";
import {
  emptyOpportunityForm,
  opportunityToFormValues,
  OpportunityForm,
  type OpportunityCompanyOption,
  type OpportunityEvidenceOption,
  type OpportunityFormValues,
} from "@/components/opportunity-form";

type OpportunityEvidenceView = {
  evidence: {
    id: string;
    excerpt: string;
    observedAt: string;
    lastVerifiedAt: string | null;
    confidence: number;
    source: {
      id: string;
      url: string;
      title: string | null;
      sourceType: string;
      publishedAt: string | null;
      sourceUpdatedAt: string | null;
      lastCheckedAt: string | null;
      accessibilityStatus: string;
    };
  };
};

export type OpportunityView = {
  id: string;
  companyId: string;
  title: string;
  category: string;
  hypothesis: string;
  impactDescription: string | null;
  suggestedSolution: string | null;
  expectedOutcome: string | null;
  impactScore: number;
  evidenceScore: number;
  solutionFitScore: number;
  reachabilityScore: number;
  priorityScore: number;
  freshnessLabel: FreshnessLabel;
  status: string;
  lastVerifiedAt: string | null;
  verificationNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  allSourcesAccessible: boolean;
  needsVerification: boolean;
  confidence: "Low" | "Medium" | "High";
  companyConfirmed: boolean;
  company: { id: string; name: string; status: string };
  evidenceLinks: OpportunityEvidenceView[];
  _count: { evidenceLinks: number; outreach: number };
  verificationReason: string;
};

type QueueStatus = "active" | "needs-verification" | "resolved" | "all";

export function OpportunityWorkspace({
  initialOpportunities,
  initialStatus = "active",
  initialFreshness = "all",
  initialCompanyId = "",
  initialEvidenceId = "",
  editorCompanies,
  editorEvidence,
}: {
  initialOpportunities: OpportunityView[];
  initialStatus?: QueueStatus;
  initialFreshness?: FreshnessLabel | "all";
  initialCompanyId?: string;
  initialEvidenceId?: string;
  editorCompanies: OpportunityCompanyOption[];
  editorEvidence: OpportunityEvidenceOption[];
}) {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [status, setStatus] = useState<QueueStatus>(initialStatus);
  const [freshness, setFreshness] = useState<FreshnessLabel | "all">(initialFreshness);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<OpportunityView | null>(null);
  const [showEditor, setShowEditor] = useState(Boolean(initialEvidenceId));

  async function refresh(
    nextStatus = status,
    nextFreshness = freshness,
    nextCompanyId = companyId,
  ) {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ status: nextStatus, freshness: nextFreshness });
    if (nextCompanyId) params.set("companyId", nextCompanyId);

    try {
      const response = await fetch(`/api/opportunities?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        opportunities?: OpportunityView[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Opportunities could not be loaded.");
      setOpportunities(payload.opportunities ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Opportunities could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  function changeStatus(nextStatus: QueueStatus) {
    setStatus(nextStatus);
    void refresh(nextStatus, freshness, companyId);
  }

  function changeFreshness(nextFreshness: FreshnessLabel | "all") {
    setFreshness(nextFreshness);
    void refresh(status, nextFreshness, companyId);
  }

  function changeCompany(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    void refresh(status, freshness, nextCompanyId);
  }

  async function performAction(id: string, action: string, body: Record<string, string> = {}) {
    setActionId(id);
    setError("");
    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = (await response.json()) as {
        error?: string;
        errors?: Record<string, string>;
      };
      if (!response.ok) {
        setError(
          payload.error ??
            Object.values(payload.errors ?? {})[0] ??
            "The opportunity could not be updated.",
        );
        return false;
      }
      await refresh();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The opportunity could not be updated.");
      return false;
    } finally {
      setActionId(null);
    }
  }

  async function submitReverification(id: string) {
    if (reviewNote.trim().length < 5) {
      setError("Add a short note describing what you re-verified.");
      return;
    }
    const updated = await performAction(id, "reverify", { note: reviewNote });
    if (updated) {
      setReviewingId(null);
      setReviewNote("");
    }
  }

  async function saveOpportunity(values: OpportunityFormValues) {
    const id = editingOpportunity?.id;
    const response = await fetch(id ? `/api/opportunities/${id}` : "/api/opportunities", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as {
      errors?: Record<string, string>;
      error?: string;
    };
    if (!response.ok) return { errors: payload.errors, error: payload.error };

    setShowEditor(false);
    setEditingOpportunity(null);
    setCompanyId(values.companyId);
    await refresh(status, freshness, values.companyId);
    return {};
  }

  const companies = Array.from(
    new Map(
      opportunities.map((opportunity) => [opportunity.company.id, opportunity.company]),
    ).values(),
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-[#dce3da] bg-white/65 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
            Structured research
          </p>
          <p className="mt-2 text-sm leading-6 text-[#59685f]">
            Keep the evidence, hypothesis, scores, and proposed solution distinct.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingOpportunity(null);
            setShowEditor((visible) => !visible);
          }}
          className="button-primary shrink-0"
        >
          {showEditor && !editingOpportunity ? "Close editor" : "Create opportunity"}
        </button>
      </section>

      {showEditor && (
        <section
          aria-labelledby="opportunity-form-heading"
          className="rounded-3xl border border-[#d4e4c2] bg-[#f5faef] p-5 sm:p-7"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
            {editingOpportunity ? "Edit opportunity hypothesis" : "New opportunity hypothesis"}
          </p>
          <h2
            id="opportunity-form-heading"
            className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
          >
            {editingOpportunity
              ? editingOpportunity.title
              : "Turn evidence into a careful hypothesis"}
          </h2>
          <div className="mt-6">
            <OpportunityForm
              key={editingOpportunity?.id ?? `new-${initialCompanyId}-${initialEvidenceId}`}
              companies={editorCompanies}
              evidenceOptions={editorEvidence}
              initialValues={
                editingOpportunity
                  ? opportunityToFormValues(editingOpportunity)
                  : emptyOpportunityForm(initialCompanyId, initialEvidenceId)
              }
              submitLabel={editingOpportunity ? "Save opportunity" : "Create opportunity"}
              onSubmit={saveOpportunity}
              onCancel={() => {
                setShowEditor(false);
                setEditingOpportunity(null);
              }}
            />
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-[#dce3da] bg-white/65 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#344239]">Research queue</p>
            <div
              className="mt-3 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Opportunity status filter"
            >
              <QueueTab
                label="Current work"
                active={status === "active"}
                onClick={() => changeStatus("active")}
              />
              <QueueTab
                label="Needs verification"
                active={status === "needs-verification"}
                onClick={() => changeStatus("needs-verification")}
              />
              <QueueTab
                label="Resolved"
                active={status === "resolved"}
                onClick={() => changeStatus("resolved")}
              />
              <QueueTab
                label="All records"
                active={status === "all"}
                onClick={() => changeStatus("all")}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[25rem]">
            <label className="text-sm font-semibold text-[#344239]">
              Freshness
              <select
                aria-label="Filter opportunities by freshness"
                value={freshness}
                onChange={(event) => changeFreshness(event.target.value as FreshnessLabel | "all")}
                className="field-control mt-2"
              >
                <option value="all">All freshness labels</option>
                {FRESHNESS_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-[#344239]">
              Company
              <select
                aria-label="Filter opportunities by company"
                value={companyId}
                onChange={(event) => changeCompany(event.target.value)}
                className="field-control mt-2"
              >
                <option value="">All companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-2xl bg-[#fff0ef] px-4 py-3 text-sm text-[#a3483e]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
            Evidence before claims
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
            Opportunity queue
          </h2>
        </div>
        <p className="text-sm text-[#748078]" aria-live="polite">
          {loading
            ? "Loading..."
            : `${opportunities.length} ${opportunities.length === 1 ? "opportunity" : "opportunities"}`}
        </p>
      </div>

      {opportunities.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center sm:px-10">
          <div
            className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e8f2dc] text-xl font-bold text-[#77905e]"
            aria-hidden="true"
          >
            ✓
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#8aa95b]">
            Queue is clear
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
            No records match these filters
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#748078]">
            Try another freshness label or status. A stale or inaccessible record should remain
            visible in the verification queue rather than silently entering outreach.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              reviewing={reviewingId === opportunity.id}
              reviewNote={reviewNote}
              busy={actionId === opportunity.id}
              onStartReview={() => {
                setReviewingId(opportunity.id);
                setReviewNote("");
                setError("");
              }}
              onReviewNoteChange={setReviewNote}
              onCancelReview={() => {
                setReviewingId(null);
                setReviewNote("");
              }}
              onSubmitReview={() => void submitReverification(opportunity.id)}
              onMarkNeedsVerification={() =>
                void performAction(opportunity.id, "mark-needs-verification")
              }
              onResolve={() => {
                if (window.confirm(`Mark “${opportunity.title}” as resolved?`))
                  void performAction(opportunity.id, "resolve");
              }}
              onReopen={() => void performAction(opportunity.id, "reopen")}
              onEdit={() => {
                setEditingOpportunity(opportunity);
                setShowEditor(true);
                setError("");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OpportunityCard({
  opportunity,
  reviewing,
  reviewNote,
  busy,
  onStartReview,
  onReviewNoteChange,
  onCancelReview,
  onSubmitReview,
  onMarkNeedsVerification,
  onResolve,
  onReopen,
  onEdit,
}: {
  opportunity: OpportunityView;
  reviewing: boolean;
  reviewNote: string;
  busy: boolean;
  onStartReview: () => void;
  onReviewNoteChange: (value: string) => void;
  onCancelReview: () => void;
  onSubmitReview: () => void;
  onMarkNeedsVerification: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onEdit: () => void;
}) {
  return (
    <article
      className={`rounded-3xl border bg-white/75 p-5 shadow-[0_12px_35px_rgba(60,82,59,0.04)] ${opportunity.needsVerification ? "border-[#ead9b5]" : "border-[#dce3da]"}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
              {opportunity.company.name}
            </span>
            <span className={freshnessClass(opportunity.freshnessLabel)}>
              {opportunity.freshnessLabel}
            </span>
            <span className="rounded-full bg-[#f2f4ee] px-2.5 py-1 text-[11px] font-bold text-[#68766e]">
              {formatLabel(opportunity.status)}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-[-0.035em] text-[#17201b]">
            {opportunity.title}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#59685f]">
            {opportunity.hypothesis}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl bg-[#17201b] px-4 py-3 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c7f36b]">
            Priority
          </p>
          <p className="mt-1 text-2xl font-semibold">{opportunity.priorityScore.toFixed(2)}</p>
          <p className="mt-1 text-[10px] font-semibold text-[#d8e8b9]">
            Confidence {opportunity.confidence}
          </p>
        </div>
      </div>

      {opportunity.needsVerification && (
        <div className="mt-5 rounded-2xl border border-[#ead9b5] bg-[#fff8e8] px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9a762c]">
            Needs verification
          </p>
          <p className="mt-1 text-sm leading-6 text-[#795f2b]">{opportunity.verificationReason}</p>
        </div>
      )}

      <div className="mt-5 grid gap-4 border-y border-[#edf0eb] py-4 sm:grid-cols-3">
        <Detail label="Evidence" value={`${opportunity._count.evidenceLinks} linked`} />
        <Detail label="Last verified" value={formatDate(opportunity.lastVerifiedAt)} />
        <Detail
          label="Sources"
          value={opportunity.allSourcesAccessible ? "Accessible" : "Check access"}
          warning={!opportunity.allSourcesAccessible}
        />
      </div>

      {opportunity.evidenceLinks.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a9890]">
            Supporting evidence
          </p>
          {opportunity.evidenceLinks.slice(0, 2).map(({ evidence }) => (
            <div key={evidence.id} className="rounded-2xl bg-[#fbfcfa] p-3">
              <p className="text-sm leading-6 text-[#59685f]">“{evidence.excerpt}”</p>
              <p className="mt-2 text-xs text-[#8a9890]">
                Observed {formatDate(evidence.observedAt)} · Confidence {evidence.confidence}/5
              </p>
            </div>
          ))}
        </div>
      )}

      {reviewing && (
        <div className="mt-5 rounded-2xl border border-[#d4e4c2] bg-[#f5faef] p-4">
          <label className="block text-sm font-semibold text-[#344239]">
            Re-verification note
            <textarea
              value={reviewNote}
              onChange={(event) => onReviewNoteChange(event.target.value)}
              rows={3}
              className="field-control mt-2 resize-y"
              placeholder="What did you check, and does the signal still matter?"
              autoFocus
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSubmitReview}
              disabled={busy}
              className="button-primary"
            >
              {busy ? "Saving..." : "Confirm re-verification"}
            </button>
            <button type="button" onClick={onCancelReview} className="button-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {opportunity.needsVerification &&
          !reviewing &&
          opportunity.status !== "resolved" &&
          opportunity.status !== "archived" && (
            <button type="button" onClick={onStartReview} className="button-primary">
              Re-verify
            </button>
          )}
        {!opportunity.needsVerification &&
          opportunity.status !== "resolved" &&
          opportunity.status !== "archived" && (
            <button type="button" onClick={onMarkNeedsVerification} className="button-secondary">
              Mark needs verification
            </button>
          )}
        {opportunity.status === "resolved" ? (
          <button type="button" onClick={onReopen} disabled={busy} className="button-secondary">
            {busy ? "Reopening..." : "Reopen for research"}
          </button>
        ) : (
          opportunity.status !== "archived" && (
            <button type="button" onClick={onResolve} disabled={busy} className="button-danger">
              Resolve
            </button>
          )
        )}
        <Link href={`/evidence?companyId=${opportunity.companyId}`} className="button-secondary">
          View company evidence
        </Link>
        <button type="button" onClick={onEdit} className="button-secondary">
          Edit opportunity
        </button>
        <a href={`/api/exports/opportunity/${opportunity.id}`} className="button-secondary">
          Export briefing
        </a>
      </div>
    </article>
  );
}

function QueueTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#8ebd42] focus:ring-offset-2 ${active ? "bg-[#17201b] text-white" : "bg-white/70 text-[#627067] hover:bg-white"}`}
    >
      {label}
    </button>
  );
}

function Detail({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8a9890]">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${warning ? "text-[#a3483e]" : "text-[#344239]"}`}>
        {value}
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

function formatDate(value: string | Date | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "Not verified";
}

function formatLabel(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
