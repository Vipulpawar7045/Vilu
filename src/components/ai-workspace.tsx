"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AI_DRAFT_KINDS, type AiDraftKind, type AiDraftStatus } from "@/domain/ai";

export type AiOpportunityView = {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  status: string;
  evidenceCount: number;
};

export type AiContactView = {
  id: string;
  companyId: string;
  name: string;
  role: string | null;
};

export type AiDraftView = {
  id: string;
  kind: AiDraftKind;
  provider: string;
  model: string | null;
  originalText: string;
  draftText: string;
  status: AiDraftStatus;
  generatedAt: string;
  reviewedAt: string | null;
  opportunity: { id: string; title: string; company: { id: string; name: string } };
  contact: { id: string; name: string; role: string | null } | null;
  evidenceLinks: Array<{
    evidence: {
      id: string;
      excerpt: string;
      observedAt: string;
      lastVerifiedAt: string | null;
      source: {
        title: string | null;
        url: string;
        publishedAt: string | null;
        sourceUpdatedAt: string | null;
      };
    };
  }>;
};

export function AiWorkspace({
  initialOpportunities,
  initialContacts,
  initialDrafts,
}: {
  initialOpportunities: AiOpportunityView[];
  initialContacts: AiContactView[];
  initialDrafts: AiDraftView[];
}) {
  const [opportunities] = useState(initialOpportunities);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [opportunityId, setOpportunityId] = useState(initialOpportunities[0]?.id ?? "");
  const [kind, setKind] = useState<AiDraftKind>("summary");
  const [contactId, setContactId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedOpportunity = opportunities.find((opportunity) => opportunity.id === opportunityId);
  const availableContacts = useMemo(
    () => initialContacts.filter((contact) => contact.companyId === selectedOpportunity?.companyId),
    [initialContacts, selectedOpportunity?.companyId],
  );

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/ai/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, kind, contactId: contactId || null }),
      });
      const payload = (await response.json()) as {
        draft?: AiDraftView;
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok || !payload.draft) {
        setError(
          payload.errors?.opportunityId ??
            payload.errors?.kind ??
            payload.error ??
            "The draft could not be generated.",
        );
        return;
      }
      setDrafts((current) => [payload.draft!, ...current]);
      setNotice("Draft generated. Review the evidence and edit or reject it before approval.");
    } catch {
      setError("The draft request could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function updateDraft(id: string, input: { draftText?: string; status?: AiDraftStatus }) {
    const response = await fetch(`/api/ai/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = (await response.json()) as { draft?: AiDraftView; error?: string };
    if (!response.ok || !payload.draft) {
      setError(payload.error ?? "The draft could not be updated.");
      return null;
    }
    setDrafts((current) => current.map((draft) => (draft.id === id ? payload.draft! : draft)));
    return payload.draft;
  }

  if (opportunities.length === 0) {
    return (
      <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-[#17201b]">Create an opportunity first</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#748078]">
          AI assistance needs an evidence-backed opportunity context. Generated drafts never become
          verified records automatically.
        </p>
        <Link href="/opportunities" className="button-primary mt-6">
          Open opportunities
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d4e4c2] bg-[#f5faef] p-5 sm:p-7">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
            Human-approved assistant
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
            Generate a review draft
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#68766e]">
            The offline provider uses the selected opportunity and linked evidence. It includes
            source and verification dates, never changes opportunity status, and never sends
            outreach. An external provider is not configured by default.
          </p>
        </div>
        <form
          onSubmit={generate}
          className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.75fr_0.75fr_auto] lg:items-end"
        >
          <label className="text-sm font-semibold text-[#344239]">
            Opportunity
            <select
              aria-label="AI opportunity"
              value={opportunityId}
              onChange={(event) => {
                setOpportunityId(event.target.value);
                setContactId("");
              }}
              className="field-control mt-2"
            >
              {opportunities.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.companyName} · {opportunity.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#344239]">
            Draft action
            <select
              aria-label="AI draft action"
              value={kind}
              onChange={(event) => setKind(event.target.value as AiDraftKind)}
              className="field-control mt-2"
            >
              {AI_DRAFT_KINDS.map((value) => (
                <option key={value} value={value}>
                  {formatLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#344239]">
            Contact (optional)
            <select
              aria-label="AI contact"
              value={contactId}
              onChange={(event) => setContactId(event.target.value)}
              className="field-control mt-2"
            >
              <option value="">No contact context</option>
              {availableContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                  {contact.role ? ` · ${contact.role}` : ""}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={loading || !opportunityId} className="button-primary">
            {loading ? "Drafting..." : "Generate draft"}
          </button>
        </form>
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
          Use <code className="rounded bg-white/80 px-1.5 py-0.5">AI_PROVIDER=local</code> for
          offline drafts. No credentials or private profile URLs are sent.
        </p>
      </section>
      <section aria-labelledby="ai-drafts-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
              Draft review queue
            </p>
            <h2
              id="ai-drafts-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
            >
              Assistant results
            </h2>
          </div>
          <span className="text-sm text-[#748078]">{drafts.length} saved</span>
        </div>
        {drafts.length === 0 ? (
          <div className="mt-5 rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-14 text-center">
            <h3 className="text-xl font-semibold text-[#17201b]">No drafts yet</h3>
            <p className="mt-3 text-sm text-[#748078]">
              Generate a summary or missing-information checklist to begin.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {drafts.map((draft) => (
              <AiDraftCard key={draft.id} draft={draft} onUpdate={updateDraft} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AiDraftCard({
  draft,
  onUpdate,
}: {
  draft: AiDraftView;
  onUpdate: (
    id: string,
    input: { draftText?: string; status?: AiDraftStatus },
  ) => Promise<AiDraftView | null>;
}) {
  const [text, setText] = useState(draft.draftText);
  const [saving, setSaving] = useState(false);

  async function save(input: { draftText?: string; status?: AiDraftStatus }) {
    setSaving(true);
    const updated = await onUpdate(draft.id, input);
    if (updated) setText(updated.draftText);
    setSaving(false);
  }

  return (
    <article className="rounded-3xl border border-[#dce3da] bg-white/75 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
            {formatLabel(draft.kind)} · {draft.opportunity.company.name}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#17201b]">{draft.opportunity.title}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${draft.status === "approved" ? "bg-[#e8f2dc] text-[#607a3e]" : draft.status === "rejected" ? "bg-[#fff0ef] text-[#a3483e]" : "bg-[#fff8e8] text-[#9a762c]"}`}
        >
          {formatLabel(draft.status)}
        </span>
      </div>
      <p className="mt-3 text-xs text-[#748078]">
        Generated {formatDate(draft.generatedAt)} · {draft.provider}
        {draft.model ? ` · ${draft.model}` : ""}
      </p>
      <textarea
        aria-label={`Edit ${formatLabel(draft.kind)} draft`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={8}
        className="field-control mt-4 resize-y text-sm leading-6"
      />
      <div className="mt-4 rounded-2xl bg-[#fbfcfa] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
          Evidence used
        </p>
        {draft.evidenceLinks.length === 0 ? (
          <p className="mt-2 text-sm text-[#8a9890]">
            No evidence was linked; research is required before making a claim.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {draft.evidenceLinks.map(({ evidence }) => (
              <li key={evidence.id} className="text-sm leading-6 text-[#59685f]">
                <span>{evidence.excerpt}</span>
                <span className="mt-1 block text-xs text-[#8a9890]">
                  {evidence.source.title || evidence.source.url} · observed{" "}
                  {formatDate(evidence.observedAt)} · verified {formatDate(evidence.lastVerifiedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save({ draftText: text })}
          className="button-secondary"
        >
          Save edits
        </button>
        {draft.status !== "approved" && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save({ draftText: text, status: "approved" })}
            className="button-primary"
          >
            Approve draft
          </button>
        )}
        {draft.status !== "rejected" && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save({ status: "rejected" })}
            className="button-secondary"
          >
            Reject
          </button>
        )}
        {draft.status !== "draft" && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save({ draftText: text, status: "draft" })}
            className="button-secondary"
          >
            Return to draft
          </button>
        )}
      </div>
      <p className="mt-4 text-xs leading-5 text-[#8a9890]">
        Approval applies only to this draft. It does not update the opportunity, evidence, contact,
        or outreach status.
      </p>
    </article>
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
    : "Not recorded";
}
