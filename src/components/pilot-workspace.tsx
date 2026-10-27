"use client";

import { useState } from "react";

import {
  OPPORTUNITY_CATEGORIES,
  SOURCE_TYPES,
  type OpportunityCategory,
  type SourceType,
} from "@/domain/rules";
import {
  PILOT_OUTCOME_STATUSES,
  PILOT_REPLY_STATUSES,
  PILOT_STATUSES,
  type PilotOutcomeStatus,
  type PilotReplyStatus,
  type PilotStatus,
} from "@/domain/pilot";
import { MetricCard } from "@/components/workspace-page";

export type PilotView = {
  id: string;
  name: string;
  niche: string;
  targetCompanies: number;
  targetMessages: number;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
export type PilotCompanyOption = { id: string; name: string; websiteUrl: string };
export type PilotOpportunityOption = {
  id: string;
  companyId: string;
  title: string;
  category: string;
  status: string;
};
export type PilotEntryView = {
  id: string;
  pilotId: string;
  companyId: string;
  opportunityId: string | null;
  outreachId: string | null;
  sourceCategory: string;
  issueCategory: string;
  issueCluster: string | null;
  sourceUrl: string;
  evidenceDate: string | null;
  observedAt: string | null;
  lastVerifiedAt: string | null;
  manuallyReviewed: boolean;
  impactScore: number;
  evidenceScore: number;
  solutionFitScore: number;
  reachabilityScore: number;
  priorityScore: number;
  proposedSolution: string;
  messageSentAt: string | null;
  replyStatus: string;
  replySummary: string | null;
  objection: string | null;
  meetingAt: string | null;
  outcomeStatus: string;
  outcomeNotes: string | null;
  createdAt: string;
  updatedAt: string;
  company: PilotCompanyOption;
  opportunity: PilotOpportunityOption | null;
  outreach: {
    id: string;
    status: string;
    sentAt: string | null;
    responseSummary: string | null;
  } | null;
};
export type PilotAnalysisRow = {
  label: string;
  entries: number;
  sent: number;
  replies: number;
  meetings: number;
  wins: number;
  replyRate: number | null;
};
export type PilotSummary = {
  entries: number;
  researchedCompanies: number;
  sent: number;
  replies: number;
  meetings: number;
  wins: number;
  targetCompanies: number;
  targetMessages: number;
  bySource: PilotAnalysisRow[];
  byIssue: PilotAnalysisRow[];
};

type PilotForm = {
  name: string;
  niche: string;
  targetCompanies: string;
  targetMessages: string;
  status: PilotStatus;
  notes: string;
};
type EntryForm = {
  companyId: string;
  opportunityId: string;
  sourceCategory: SourceType;
  issueCategory: OpportunityCategory;
  issueCluster: string;
  sourceUrl: string;
  evidenceDate: string;
  observedAt: string;
  lastVerifiedAt: string;
  manuallyReviewed: boolean;
  impactScore: string;
  evidenceScore: string;
  solutionFitScore: string;
  reachabilityScore: string;
  proposedSolution: string;
  messageSentAt: string;
  replyStatus: PilotReplyStatus;
  replySummary: string;
  objection: string;
  meetingAt: string;
  outcomeStatus: PilotOutcomeStatus;
  outcomeNotes: string;
};

const defaultPilot: PilotForm = {
  name: "",
  niche: "Startup SaaS companies",
  targetCompanies: "25",
  targetMessages: "10",
  status: "planned",
  notes: "",
};
const defaultEntry: EntryForm = {
  companyId: "",
  opportunityId: "",
  sourceCategory: "website",
  issueCategory: "website-conversion",
  issueCluster: "",
  sourceUrl: "",
  evidenceDate: "",
  observedAt: "",
  lastVerifiedAt: "",
  manuallyReviewed: false,
  impactScore: "3",
  evidenceScore: "3",
  solutionFitScore: "3",
  reachabilityScore: "3",
  proposedSolution: "",
  messageSentAt: "",
  replyStatus: "not-contacted",
  replySummary: "",
  objection: "",
  meetingAt: "",
  outcomeStatus: "open",
  outcomeNotes: "",
};

export function PilotWorkspace({
  initialPilot,
  initialPilots,
  initialCompanies,
  initialOpportunities,
  initialEntries,
  initialAnalysis,
}: {
  initialPilot: PilotView | null;
  initialPilots: PilotView[];
  initialCompanies: PilotCompanyOption[];
  initialOpportunities: PilotOpportunityOption[];
  initialEntries: PilotEntryView[];
  initialAnalysis: PilotSummary;
}) {
  const [pilot, setPilot] = useState(initialPilot);
  const [pilots, setPilots] = useState(initialPilots);
  const [companies, setCompanies] = useState(initialCompanies);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [entries, setEntries] = useState(initialEntries);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [showPilotForm, setShowPilotForm] = useState(!initialPilot);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editing, setEditing] = useState<PilotEntryView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh(pilotId = pilot?.id) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        pilotId ? `/api/pilots?pilotId=${encodeURIComponent(pilotId)}` : "/api/pilots",
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        pilot?: PilotView | null;
        pilots?: PilotView[];
        companies?: PilotCompanyOption[];
        opportunities?: PilotOpportunityOption[];
        entries?: PilotEntryView[];
        analysis?: PilotSummary;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Pilot could not be loaded.");
      setPilot(payload.pilot ?? null);
      setPilots(payload.pilots ?? []);
      setCompanies(payload.companies ?? []);
      setOpportunities(payload.opportunities ?? []);
      setEntries(payload.entries ?? []);
      setAnalysis(payload.analysis ?? emptyAnalysis());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pilot could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function createPilot(values: PilotForm) {
    const response = await fetch("/api/pilots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        targetCompanies: Number(values.targetCompanies),
        targetMessages: Number(values.targetMessages),
      }),
    });
    const payload = (await response.json()) as {
      errors?: Record<string, string>;
      error?: string;
      pilot?: PilotView;
    };
    if (!response.ok) return { errors: payload.errors, error: payload.error };
    setShowPilotForm(false);
    setPilot(payload.pilot ?? null);
    await refresh(payload.pilot?.id);
    setShowEntryForm(true);
    return {};
  }

  async function updatePilotStatus(status: PilotStatus) {
    if (!pilot) return;
    const response = await fetch(`/api/pilots/${pilot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = (await response.json()) as { error?: string; errors?: Record<string, string> };
    if (!response.ok) {
      setError(
        payload.error ??
          Object.values(payload.errors ?? {})[0] ??
          "Pilot status could not be saved.",
      );
      return;
    }
    await refresh(pilot.id);
  }

  async function saveEntry(values: EntryForm) {
    if (!pilot) return { error: "Create a pilot first." };
    const body = {
      ...values,
      pilotId: pilot.id,
      opportunityId: values.opportunityId || null,
      evidenceDate: toIso(values.evidenceDate),
      observedAt: toIso(values.observedAt),
      lastVerifiedAt: toIso(values.lastVerifiedAt),
      messageSentAt: toIso(values.messageSentAt),
      meetingAt: toIso(values.meetingAt),
      impactScore: Number(values.impactScore),
      evidenceScore: Number(values.evidenceScore),
      solutionFitScore: Number(values.solutionFitScore),
      reachabilityScore: Number(values.reachabilityScore),
      replySummary: values.replySummary || null,
      objection: values.objection || null,
      outcomeNotes: values.outcomeNotes || null,
      issueCluster: values.issueCluster || null,
    };
    const response = await fetch(
      editing ? `/api/pilots/entries/${editing.id}` : "/api/pilots/entries",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const payload = (await response.json()) as { errors?: Record<string, string>; error?: string };
    if (!response.ok) return { errors: payload.errors, error: payload.error };
    setEditing(null);
    setShowEntryForm(false);
    await refresh(pilot.id);
    return {};
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-[#dce3da] bg-white/65 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <label className="text-sm font-semibold text-[#344239]" htmlFor="pilot-selector">
            Current pilot
          </label>
          <select
            id="pilot-selector"
            aria-label="Current pilot"
            value={pilot?.id ?? ""}
            onChange={(event) => {
              setEditing(null);
              setShowEntryForm(false);
              void refresh(event.target.value || undefined);
            }}
            className="field-control mt-2 max-w-xl"
          >
            <option value="">Select a pilot</option>
            {pilots.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={() => setShowPilotForm((visible) => !visible)}
        >
          {showPilotForm ? "Close pilot form" : "New pilot"}
        </button>
      </section>

      {showPilotForm && (
        <PilotForm onSubmit={createPilot} onCancel={() => setShowPilotForm(false)} />
      )}
      {error && (
        <p role="alert" className="rounded-2xl bg-[#fff0ef] px-4 py-3 text-sm text-[#a3483e]">
          {error}
        </p>
      )}

      {!pilot ? (
        <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-[#17201b]">
            Create a pilot before adding research
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#748078]">
            Keep the first cohort focused. Vilu will not mark the pilot complete or invent outcomes
            for you.
          </p>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-3xl border border-[#d4e4c2] bg-[#f5faef] p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
                {pilot.niche}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#17201b]">{pilot.name}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#69766d]">
                Research and outreach remain manual. Every sent entry must show its source, dates,
                and review confirmation.
              </p>
            </div>
            <label className="text-sm font-semibold text-[#344239]">
              Pilot status
              <select
                aria-label="Pilot status"
                value={pilot.status}
                onChange={(event) => void updatePilotStatus(event.target.value as PilotStatus)}
                className="field-control mt-2 sm:min-w-44"
              >
                {PILOT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Companies researched"
              value={`${analysis.researchedCompanies}/${pilot.targetCompanies}`}
              detail="Distinct companies in this pilot"
            />
            <MetricCard
              label="Messages sent"
              value={`${analysis.sent}/${pilot.targetMessages}`}
              detail="Manual messages recorded"
            />
            <MetricCard
              label="Replies"
              value={String(analysis.replies)}
              detail="Positive, negative, or objection"
            />
            <MetricCard
              label="Meetings / wins"
              value={`${analysis.meetings} / ${analysis.wins}`}
              detail="Recorded pilot outcomes"
            />
          </div>
          <section className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
                Evidence ledger
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#17201b]">Pilot opportunities</h2>
            </div>
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                setEditing(null);
                setShowEntryForm((visible) => !visible);
              }}
            >
              {showEntryForm && !editing ? "Close entry form" : "Add pilot opportunity"}
            </button>
          </section>
          {showEntryForm && (
            <PilotEntryForm
              companies={companies}
              opportunities={opportunities}
              initialValues={editing ? toEntryForm(editing) : defaultEntry}
              submitLabel={editing ? "Save pilot entry" : "Add pilot entry"}
              onSubmit={saveEntry}
              onCancel={() => {
                setEditing(null);
                setShowEntryForm(false);
              }}
            />
          )}
          {loading && <p className="text-sm text-[#748078]">Refreshing pilot data...</p>}
          {entries.length === 0 ? (
            <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
              <h2 className="text-xl font-semibold text-[#17201b]">
                No pilot opportunities recorded
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-[#748078]">
                Add only opportunities you actually researched. Do not pad the cohort to hit a
                target.
              </p>
            </section>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <PilotEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => {
                    setEditing(entry);
                    setShowEntryForm(true);
                  }}
                />
              ))}
            </div>
          )}
          <PilotAnalysis analysis={analysis} />
        </>
      )}
    </div>
  );
}

function PilotForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (values: PilotForm) => Promise<{ errors?: Record<string, string>; error?: string }>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(defaultPilot);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const update = (field: keyof PilotForm, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await onSubmit(values);
      setErrors(result.errors ?? (result.error ? { form: result.error } : {}));
    } catch {
      setErrors({ form: "The pilot could not be saved." });
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      aria-labelledby="pilot-form-heading"
      className="rounded-3xl border border-[#d4e4c2] bg-[#f5faef] p-5 sm:p-7"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
        Focused validation cohort
      </p>
      <h2 id="pilot-form-heading" className="mt-2 text-2xl font-semibold text-[#17201b]">
        Start a pilot
      </h2>
      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Pilot name"
            name="pilot-name"
            value={values.name}
            onChange={(value) => update("name", value)}
            error={errors.name}
            placeholder="Q4 startup SaaS discovery"
          />
          <Field
            label="Niche"
            name="pilot-niche"
            value={values.niche}
            onChange={(value) => update("niche", value)}
            error={errors.niche}
            placeholder="Startup SaaS companies"
          />
          <Field
            label="Target companies"
            name="pilot-target-companies"
            type="number"
            value={values.targetCompanies}
            onChange={(value) => update("targetCompanies", value)}
            error={errors.targetCompanies}
          />
          <Field
            label="Target messages"
            name="pilot-target-messages"
            type="number"
            value={values.targetMessages}
            onChange={(value) => update("targetMessages", value)}
            error={errors.targetMessages}
          />
        </div>
        <label className="block text-sm font-semibold text-[#344239]" htmlFor="pilot-notes">
          Pilot notes<span className="ml-1 font-normal text-[#7a877e]">(optional)</span>
          <textarea
            id="pilot-notes"
            value={values.notes}
            onChange={(event) => update("notes", event.target.value)}
            className="field-control mt-2 min-h-24"
            placeholder="What service hypothesis are you testing?"
          />
        </label>
        {errors.form && (
          <p role="alert" className="rounded-xl bg-[#fff0ef] px-3 py-2 text-sm text-[#a3483e]">
            {errors.form}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="button-primary">
            {saving ? "Saving..." : "Create pilot"}
          </button>
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function PilotEntryForm({
  companies,
  opportunities,
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  companies: PilotCompanyOption[];
  opportunities: PilotOpportunityOption[];
  initialValues: EntryForm;
  submitLabel: string;
  onSubmit: (values: EntryForm) => Promise<{ errors?: Record<string, string>; error?: string }>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const update = (field: keyof EntryForm, value: string | boolean) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };
  const availableOpportunities = values.companyId
    ? opportunities.filter((opportunity) => opportunity.companyId === values.companyId)
    : opportunities;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await onSubmit(values);
      setErrors(result.errors ?? (result.error ? { form: result.error } : {}));
    } catch {
      setErrors({ form: "The pilot entry could not be saved." });
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      aria-labelledby="pilot-entry-form-heading"
      className="rounded-3xl border border-[#dce3da] bg-white/70 p-5 sm:p-7"
    >
      <h2 id="pilot-entry-form-heading" className="text-2xl font-semibold text-[#17201b]">
        {submitLabel}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#748078]">
        Record the observation and score snapshot first. Only add a sent date after manually
        reviewing the message and re-verifying the opportunity.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-6" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Company"
            name="pilot-company"
            value={values.companyId}
            onChange={(value) => {
              update("companyId", value);
              update("opportunityId", "");
            }}
            error={errors.companyId}
          >
            <option value="">Choose a company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Opportunity"
            name="pilot-opportunity"
            value={values.opportunityId}
            onChange={(value) => update("opportunityId", value)}
            error={errors.opportunityId}
          >
            <option value="">Optional opportunity link</option>
            {availableOpportunities.map((opportunity) => (
              <option key={opportunity.id} value={opportunity.id}>
                {opportunity.title} ({opportunity.status})
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Source category"
            name="pilot-source-category"
            value={values.sourceCategory}
            onChange={(value) => update("sourceCategory", value)}
            error={errors.sourceCategory}
          >
            {SOURCE_TYPES.map((source) => (
              <option key={source} value={source}>
                {formatLabel(source)}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Issue category"
            name="pilot-issue-category"
            value={values.issueCategory}
            onChange={(value) => update("issueCategory", value)}
            error={errors.issueCategory}
          >
            {OPPORTUNITY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {formatLabel(category)}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Source URL"
            name="pilot-source-url"
            value={values.sourceUrl}
            onChange={(value) => update("sourceUrl", value)}
            error={errors.sourceUrl}
            placeholder="https://example.com/pricing"
          />
          <Field
            label="Issue cluster"
            name="pilot-issue-cluster"
            value={values.issueCluster}
            onChange={(value) => update("issueCluster", value)}
            error={errors.issueCluster}
            placeholder="Optional repeated theme"
          />
        </div>
        <fieldset className="rounded-2xl border border-[#dce3da] p-4">
          <legend className="px-2 text-sm font-semibold text-[#344239]">Evidence dates</legend>
          <div className="grid gap-5 sm:grid-cols-3">
            <DateField
              label="Evidence date"
              name="pilot-evidence-date"
              value={values.evidenceDate}
              onChange={(value) => update("evidenceDate", value)}
              error={errors.evidenceDate}
            />
            <DateField
              label="Observed date"
              name="pilot-observed-date"
              value={values.observedAt}
              onChange={(value) => update("observedAt", value)}
              error={errors.observedAt}
            />
            <DateField
              label="Last verified date"
              name="pilot-verified-date"
              value={values.lastVerifiedAt}
              onChange={(value) => update("lastVerifiedAt", value)}
              error={errors.lastVerifiedAt}
            />
          </div>
        </fieldset>
        <fieldset className="rounded-2xl border border-[#dce3da] p-4">
          <legend className="px-2 text-sm font-semibold text-[#344239]">Score snapshot</legend>
          <div className="grid gap-5 sm:grid-cols-4">
            <ScoreField
              label="Impact"
              name="pilot-impact-score"
              value={values.impactScore}
              onChange={(value) => update("impactScore", value)}
              error={errors.impactScore}
            />
            <ScoreField
              label="Evidence"
              name="pilot-evidence-score"
              value={values.evidenceScore}
              onChange={(value) => update("evidenceScore", value)}
              error={errors.evidenceScore}
            />
            <ScoreField
              label="Solution fit"
              name="pilot-solution-fit-score"
              value={values.solutionFitScore}
              onChange={(value) => update("solutionFitScore", value)}
              error={errors.solutionFitScore}
            />
            <ScoreField
              label="Reachability"
              name="pilot-reachability-score"
              value={values.reachabilityScore}
              onChange={(value) => update("reachabilityScore", value)}
              error={errors.reachabilityScore}
            />
          </div>
        </fieldset>
        <label
          className="block text-sm font-semibold text-[#344239]"
          htmlFor="pilot-proposed-solution"
        >
          Proposed solution
          <textarea
            id="pilot-proposed-solution"
            value={values.proposedSolution}
            onChange={(event) => update("proposedSolution", event.target.value)}
            className="field-control mt-2 min-h-24"
            placeholder="Describe the practical solution you could offer."
          />
        </label>
        {errors.proposedSolution && (
          <p role="alert" className="text-sm text-[#a3483e]">
            {errors.proposedSolution}
          </p>
        )}
        <fieldset className="rounded-2xl border border-[#dce3da] p-4">
          <legend className="px-2 text-sm font-semibold text-[#344239]">
            Manual outreach outcome
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <DateField
              label="Message sent date"
              name="pilot-message-sent-date"
              value={values.messageSentAt}
              onChange={(value) => update("messageSentAt", value)}
              error={errors.messageSentAt}
            />
            <SelectField
              label="Reply status"
              name="pilot-reply-status"
              value={values.replyStatus}
              onChange={(value) => update("replyStatus", value)}
              error={errors.replyStatus}
            >
              {PILOT_REPLY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </SelectField>
            <DateField
              label="Meeting date"
              name="pilot-meeting-date"
              value={values.meetingAt}
              onChange={(value) => update("meetingAt", value)}
              error={errors.meetingAt}
            />
            <SelectField
              label="Outcome status"
              name="pilot-outcome-status"
              value={values.outcomeStatus}
              onChange={(value) => update("outcomeStatus", value)}
              error={errors.outcomeStatus}
            >
              {PILOT_OUTCOME_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <TextAreaField
              label="Reply summary"
              name="pilot-reply-summary"
              value={values.replySummary}
              onChange={(value) => update("replySummary", value)}
              error={errors.replySummary}
              placeholder="Keep the outcome factual and brief."
            />
            <TextAreaField
              label="Objection"
              name="pilot-objection"
              value={values.objection}
              onChange={(value) => update("objection", value)}
              error={errors.objection}
              placeholder="What concern or objection was raised?"
            />
            <TextAreaField
              label="Outcome notes"
              name="pilot-outcome-notes"
              value={values.outcomeNotes}
              onChange={(value) => update("outcomeNotes", value)}
              error={errors.outcomeNotes}
              placeholder="What did you learn?"
            />
          </div>
        </fieldset>
        <label className="flex items-start gap-3 rounded-2xl border border-[#d4e4c2] bg-[#f5faef] p-4 text-sm text-[#344239]">
          <input
            type="checkbox"
            checked={values.manuallyReviewed}
            onChange={(event) => update("manuallyReviewed", event.target.checked)}
            className="mt-0.5 size-4 accent-[#77905e]"
          />{" "}
          <span>
            <strong>Manually reviewed</strong>
            <span className="block mt-1 text-[#69766d]">
              I reviewed the opportunity and message myself. This is required before a sent date can
              be recorded.
            </span>
            {errors.manuallyReviewed && (
              <span className="mt-1 block text-[#a3483e]">{errors.manuallyReviewed}</span>
            )}
          </span>
        </label>
        {errors.form && (
          <p role="alert" className="rounded-xl bg-[#fff0ef] px-3 py-2 text-sm text-[#a3483e]">
            {errors.form}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="button-primary">
            {saving ? "Saving..." : submitLabel}
          </button>
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function PilotEntryCard({ entry, onEdit }: { entry: PilotEntryView; onEdit: () => void }) {
  return (
    <article className="rounded-3xl border border-[#dce3da] bg-white/65 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
            {entry.company.name} · {formatLabel(entry.sourceCategory)}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[#17201b]">
            {entry.opportunity?.title ?? "Pilot research opportunity"}
          </h3>
          <p className="mt-2 text-sm text-[#69766d]">
            {formatLabel(entry.issueCategory)}
            {entry.issueCluster ? ` · ${entry.issueCluster}` : ""} · priority{" "}
            {entry.priorityScore.toFixed(2)}
          </p>
        </div>
        <button type="button" className="button-secondary" onClick={onEdit}>
          Edit pilot entry
        </button>
      </div>
      <div className="mt-5 grid gap-3 text-sm text-[#69766d] sm:grid-cols-3">
        <p>
          <strong className="text-[#344239]">Evidence:</strong> {formatDate(entry.evidenceDate)}
        </p>
        <p>
          <strong className="text-[#344239]">Observed:</strong> {formatDate(entry.observedAt)}
        </p>
        <p>
          <strong className="text-[#344239]">Verified:</strong> {formatDate(entry.lastVerifiedAt)}
        </p>
      </div>
      <p className="mt-4 rounded-2xl bg-[#f5faef] p-4 text-sm leading-6 text-[#536158]">
        <strong className="text-[#344239]">Proposed solution:</strong> {entry.proposedSolution}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#69766d]">
        <span className="rounded-full bg-[#edf2eb] px-3 py-1.5">
          {entry.messageSentAt ? `Sent ${formatDate(entry.messageSentAt)}` : "Not contacted"}
        </span>
        <span className="rounded-full bg-[#edf2eb] px-3 py-1.5">
          Reply: {formatLabel(entry.replyStatus)}
        </span>
        <span className="rounded-full bg-[#edf2eb] px-3 py-1.5">
          Outcome: {formatLabel(entry.outcomeStatus)}
        </span>
        {entry.manuallyReviewed && (
          <span className="rounded-full bg-[#e8f2dc] px-3 py-1.5 text-[#5d793f]">
            Manually reviewed
          </span>
        )}
      </div>
      {(entry.replySummary || entry.objection || entry.outcomeNotes) && (
        <div className="mt-4 space-y-1 text-sm text-[#69766d]">
          {entry.replySummary && (
            <p>
              <strong className="text-[#344239]">Reply:</strong> {entry.replySummary}
            </p>
          )}
          {entry.objection && (
            <p>
              <strong className="text-[#344239]">Objection:</strong> {entry.objection}
            </p>
          )}
          {entry.outcomeNotes && (
            <p>
              <strong className="text-[#344239]">Learning:</strong> {entry.outcomeNotes}
            </p>
          )}
        </div>
      )}
      <a
        href={entry.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex text-sm font-semibold text-[#5d793f] underline decoration-[#b6d28f] underline-offset-4"
      >
        Open source <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}

function PilotAnalysis({ analysis }: { analysis: PilotSummary }) {
  return (
    <section className="rounded-3xl border border-[#dce3da] bg-white/65 p-5 sm:p-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
          Outcome comparison
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#17201b]">
          What produced useful conversations?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#748078]">
          These counts are descriptive only. Use them to propose workflow changes; Vilu does not
          automatically rewrite scores or ranking rules.
        </p>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AnalysisTable title="By source category" rows={analysis.bySource} />
        <AnalysisTable title="By issue category" rows={analysis.byIssue} />
      </div>
    </section>
  );
}

function AnalysisTable({ title, rows }: { title: string; rows: PilotAnalysisRow[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-[#17201b]">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-[#748078]">No outcomes yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[#dce3da]">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="bg-[#f5faef] text-xs uppercase tracking-[0.12em] text-[#6f7f74]">
              <tr>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Entries</th>
                <th className="px-3 py-3">Sent</th>
                <th className="px-3 py-3">Replies</th>
                <th className="px-3 py-3">Meetings</th>
                <th className="px-3 py-3">Wins</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-[#edf2eb]">
                  <th scope="row" className="px-3 py-3 font-semibold text-[#344239]">
                    {formatLabel(row.label)}
                  </th>
                  <td className="px-3 py-3 text-[#69766d]">{row.entries}</td>
                  <td className="px-3 py-3 text-[#69766d]">{row.sent}</td>
                  <td className="px-3 py-3 text-[#69766d]">
                    {row.replies}
                    {row.replyRate !== null && (
                      <span className="ml-1 text-xs text-[#8a9890]">({row.replyRate}%)</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[#69766d]">{row.meetings}</td>
                  <td className="px-3 py-3 text-[#69766d]">{row.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-[#344239]" htmlFor={name}>
      {label}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-control mt-2"
      />
      {error && (
        <span role="alert" className="mt-1 block text-xs font-normal text-[#a3483e]">
          {error}
        </span>
      )}
    </label>
  );
}
function DateField({
  label,
  name,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <Field label={label} name={name} type="date" value={value} onChange={onChange} error={error} />
  );
}
function ScoreField({
  label,
  name,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <SelectField label={label} name={name} value={value} onChange={onChange} error={error}>
      <option value="1">1 — low</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5">5 — high</option>
    </SelectField>
  );
}
function SelectField({
  label,
  name,
  value,
  onChange,
  error,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-[#344239]" htmlFor={name}>
      {label}
      <select
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control mt-2"
      >
        {children}
      </select>
      {error && (
        <span role="alert" className="mt-1 block text-xs font-normal text-[#a3483e]">
          {error}
        </span>
      )}
    </label>
  );
}
function TextAreaField({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-[#344239]" htmlFor={name}>
      {label}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-control mt-2 min-h-24"
      />
      {error && (
        <span role="alert" className="mt-1 block text-xs font-normal text-[#a3483e]">
          {error}
        </span>
      )}
    </label>
  );
}

function toEntryForm(entry: PilotEntryView): EntryForm {
  return {
    companyId: entry.companyId,
    opportunityId: entry.opportunityId ?? "",
    sourceCategory: entry.sourceCategory as SourceType,
    issueCategory: entry.issueCategory as OpportunityCategory,
    issueCluster: entry.issueCluster ?? "",
    sourceUrl: entry.sourceUrl,
    evidenceDate: toDateInput(entry.evidenceDate),
    observedAt: toDateInput(entry.observedAt),
    lastVerifiedAt: toDateInput(entry.lastVerifiedAt),
    manuallyReviewed: entry.manuallyReviewed,
    impactScore: String(entry.impactScore),
    evidenceScore: String(entry.evidenceScore),
    solutionFitScore: String(entry.solutionFitScore),
    reachabilityScore: String(entry.reachabilityScore),
    proposedSolution: entry.proposedSolution,
    messageSentAt: toDateInput(entry.messageSentAt),
    replyStatus: entry.replyStatus as PilotReplyStatus,
    replySummary: entry.replySummary ?? "",
    objection: entry.objection ?? "",
    meetingAt: toDateInput(entry.meetingAt),
    outcomeStatus: entry.outcomeStatus as PilotOutcomeStatus,
    outcomeNotes: entry.outcomeNotes ?? "",
  };
}
function toIso(value: string) {
  return value ? new Date(`${value}T12:00:00.000Z`).toISOString() : null;
}
function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}
function formatDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "Not recorded";
}
function formatLabel(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function emptyAnalysis(): PilotSummary {
  return {
    entries: 0,
    researchedCompanies: 0,
    sent: 0,
    replies: 0,
    meetings: 0,
    wins: 0,
    targetCompanies: 25,
    targetMessages: 10,
    bySource: [],
    byIssue: [],
  };
}
