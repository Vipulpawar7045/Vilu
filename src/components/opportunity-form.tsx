"use client";

import { useState, type ReactNode } from "react";

import {
  calculatePriorityScore,
  getConfidenceLevel,
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_STATUSES,
  type OpportunityStatus,
} from "@/domain/rules";

export type OpportunityCompanyOption = { id: string; name: string; status: string };

export type OpportunityEvidenceOption = {
  id: string;
  companyId: string;
  excerpt: string;
  observedAt: string;
  confidence: number;
  company: { id: string; name: string };
  source: {
    id: string;
    url: string;
    title: string | null;
    sourceType: string;
    accessibilityStatus: string;
  };
};

export type OpportunityFormValues = {
  companyId: string;
  title: string;
  category: string;
  hypothesis: string;
  evidenceIds: string[];
  impactDescription: string;
  suggestedSolution: string;
  expectedOutcome: string;
  impactScore: number;
  evidenceScore: number;
  solutionFitScore: number;
  reachabilityScore: number;
  status: OpportunityStatus;
  verificationNotes: string;
  companyConfirmed: boolean;
};

export function opportunityToFormValues(opportunity: {
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
  status: string;
  verificationNotes: string | null;
  companyConfirmed: boolean;
  evidenceLinks: Array<{ evidence: { id: string } }>;
}): OpportunityFormValues {
  return {
    companyId: opportunity.companyId,
    title: opportunity.title,
    category: opportunity.category,
    hypothesis: opportunity.hypothesis,
    evidenceIds: opportunity.evidenceLinks.map(({ evidence }) => evidence.id),
    impactDescription: opportunity.impactDescription ?? "",
    suggestedSolution: opportunity.suggestedSolution ?? "",
    expectedOutcome: opportunity.expectedOutcome ?? "",
    impactScore: opportunity.impactScore,
    evidenceScore: opportunity.evidenceScore,
    solutionFitScore: opportunity.solutionFitScore,
    reachabilityScore: opportunity.reachabilityScore,
    status: opportunity.status as OpportunityStatus,
    verificationNotes: opportunity.verificationNotes ?? "",
    companyConfirmed: opportunity.companyConfirmed,
  };
}

export function emptyOpportunityForm(companyId = "", evidenceId = ""): OpportunityFormValues {
  return {
    companyId,
    title: "",
    category: "website-conversion",
    hypothesis: "",
    evidenceIds: evidenceId ? [evidenceId] : [],
    impactDescription: "",
    suggestedSolution: "",
    expectedOutcome: "",
    impactScore: 3,
    evidenceScore: 3,
    solutionFitScore: 3,
    reachabilityScore: 3,
    status: "new",
    verificationNotes: "",
    companyConfirmed: false,
  };
}

export function OpportunityForm({
  companies,
  evidenceOptions,
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  companies: OpportunityCompanyOption[];
  evidenceOptions: OpportunityEvidenceOption[];
  initialValues: OpportunityFormValues;
  submitLabel: string;
  onSubmit: (
    values: OpportunityFormValues,
  ) => Promise<{ errors?: Record<string, string>; error?: string }>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const availableEvidence = evidenceOptions.filter(
    (evidence) => evidence.companyId === values.companyId,
  );
  const selectedEvidence = availableEvidence.filter((evidence) =>
    values.evidenceIds.includes(evidence.id),
  );
  const confidence = getConfidenceLevel({
    evidenceCount: selectedEvidence.length,
    independentSourceCount: new Set(selectedEvidence.map((evidence) => evidence.source.id)).size,
    hasRecentEvidence: selectedEvidence.length > 0,
    manuallyVerified: Boolean(values.verificationNotes.trim()),
  });
  const priorityScore = calculatePriorityScore({
    impact: values.impactScore,
    evidence: values.evidenceScore,
    solutionFit: values.solutionFitScore,
    reachability: values.reachabilityScore,
  });

  function update(field: keyof OpportunityFormValues, value: string | number | boolean | string[]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  }

  function changeCompany(companyId: string) {
    const allowed = new Set(
      evidenceOptions
        .filter((evidence) => evidence.companyId === companyId)
        .map((evidence) => evidence.id),
    );
    update("companyId", companyId);
    setValues((current) => ({
      ...current,
      companyId,
      evidenceIds: current.evidenceIds.filter((evidenceId) => allowed.has(evidenceId)),
    }));
  }

  function toggleEvidence(evidenceId: string) {
    update(
      "evidenceIds",
      values.evidenceIds.includes(evidenceId)
        ? values.evidenceIds.filter((id) => id !== evidenceId)
        : [...values.evidenceIds, evidenceId],
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await onSubmit(values);
      setErrors(result.errors ?? (result.error ? { form: result.error } : {}));
    } catch {
      setErrors({ form: "The opportunity could not be saved." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Company"
          name="opportunity-company"
          value={values.companyId}
          onChange={changeCompany}
          error={errors.companyId}
        >
          <option value="">Choose a company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Opportunity title"
          name="opportunity-title"
          value={values.title}
          onChange={(value) => update("title", value)}
          error={errors.title}
          placeholder="Mobile pricing signup friction"
          required
        />
        <SelectField
          label="Category"
          name="opportunity-category"
          value={values.category}
          onChange={(value) => update("category", value)}
          error={errors.category}
        >
          {OPPORTUNITY_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {formatLabel(category)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status"
          name="opportunity-status"
          value={values.status}
          onChange={(value) => update("status", value as OpportunityStatus)}
          error={errors.status}
        >
          {OPPORTUNITY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatLabel(status)}
            </option>
          ))}
        </SelectField>
      </div>

      <TextAreaField
        label="Evidence-backed hypothesis"
        name="opportunity-hypothesis"
        value={values.hypothesis}
        onChange={(value) => update("hypothesis", value)}
        error={errors.hypothesis}
        placeholder="The public observation may indicate an opportunity to..."
        rows={5}
      />

      <section
        aria-labelledby="related-evidence-heading"
        className="rounded-2xl border border-[#dce3da] bg-[#fbfcfa] p-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
              Traceability
            </p>
            <h3 id="related-evidence-heading" className="mt-1 text-lg font-semibold text-[#17201b]">
              Related evidence
            </h3>
          </div>
          <span className="text-xs text-[#748078]">{selectedEvidence.length} selected</span>
        </div>
        {availableEvidence.length === 0 ? (
          <p className="mt-4 text-sm leading-6 text-[#748078]">
            No evidence exists for this company yet. Add a source and observation before verifying
            this opportunity.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {availableEvidence.map((evidence) => (
              <label
                key={evidence.id}
                className="flex cursor-pointer gap-3 rounded-xl border border-[#edf0eb] bg-white p-3 hover:border-[#cbd8c8]"
              >
                <input
                  type="checkbox"
                  checked={values.evidenceIds.includes(evidence.id)}
                  onChange={() => toggleEvidence(evidence.id)}
                  className="mt-1 accent-[#77905e]"
                />
                <span className="min-w-0">
                  <span className="block text-sm leading-6 text-[#344239]">{evidence.excerpt}</span>
                  <span className="mt-1 block text-xs text-[#8a9890]">
                    {evidence.source.title || evidence.source.sourceType} · Observed{" "}
                    {formatDate(evidence.observedAt)} · Confidence {evidence.confidence}/5
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        {errors.evidenceIds && <ErrorText message={errors.evidenceIds} />}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <TextAreaField
          label="Possible business impact"
          name="impact-description"
          value={values.impactDescription}
          onChange={(value) => update("impactDescription", value)}
          error={errors.impactDescription}
          placeholder="What could improve if this is relevant?"
          rows={4}
        />
        <TextAreaField
          label="Suggested solution"
          name="suggested-solution"
          value={values.suggestedSolution}
          onChange={(value) => update("suggestedSolution", value)}
          error={errors.suggestedSolution}
          placeholder="A practical service or improvement idea..."
          rows={4}
        />
        <TextAreaField
          label="Expected outcome"
          name="expected-outcome"
          value={values.expectedOutcome}
          onChange={(value) => update("expectedOutcome", value)}
          error={errors.expectedOutcome}
          placeholder="A measurable or observable outcome..."
          rows={4}
        />
      </div>

      <section
        aria-labelledby="score-heading"
        className="rounded-2xl border border-[#dce3da] bg-white/70 p-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
              Transparent scoring
            </p>
            <h3 id="score-heading" className="mt-1 text-lg font-semibold text-[#17201b]">
              Priority inputs
            </h3>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#748078]">Priority score</p>
            <p className="text-2xl font-semibold text-[#17201b]">{priorityScore.toFixed(2)}</p>
            <p className="text-xs font-semibold text-[#607a3e]">Confidence {confidence}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreField
            label="Impact"
            name="impact-score"
            value={values.impactScore}
            onChange={(value) => update("impactScore", value)}
            error={errors.impactScore}
          />
          <ScoreField
            label="Evidence"
            name="evidence-score"
            value={values.evidenceScore}
            onChange={(value) => update("evidenceScore", value)}
            error={errors.evidenceScore}
          />
          <ScoreField
            label="Solution fit"
            name="solution-fit-score"
            value={values.solutionFitScore}
            onChange={(value) => update("solutionFitScore", value)}
            error={errors.solutionFitScore}
          />
          <ScoreField
            label="Reachability"
            name="reachability-score"
            value={values.reachabilityScore}
            onChange={(value) => update("reachabilityScore", value)}
            error={errors.reachabilityScore}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-[#8a9890]">
          Impact 35% + evidence 30% + solution fit 20% + reachability 15%.
        </p>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <TextAreaField
          label="Verification notes"
          name="opportunity-verification-notes"
          value={values.verificationNotes}
          onChange={(value) => update("verificationNotes", value)}
          error={errors.verificationNotes}
          placeholder="What has been manually checked?"
          rows={3}
        />
        <label className="flex items-start gap-3 rounded-2xl border border-[#ead9b5] bg-[#fff8e8] p-4 text-sm text-[#795f2b]">
          <input
            type="checkbox"
            checked={values.companyConfirmed}
            onChange={(event) => update("companyConfirmed", event.target.checked)}
            className="mt-1 accent-[#9a762c]"
          />
          <span>
            <strong className="font-semibold">Company explicitly confirmed this claim</strong>
            <span className="mt-1 block text-xs leading-5">
              Only use this for direct confirmation. Public evidence alone remains an opportunity
              hypothesis.
            </span>
          </span>
        </label>
      </section>

      {errors.form && (
        <p role="alert" className="rounded-xl bg-[#fff0ef] px-3 py-2 text-sm text-[#a3483e]">
          {errors.form}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={submitting} className="button-primary">
          {submitting ? "Saving..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="button-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2 text-sm font-semibold text-[#344239]">
      {label}
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="field-control"
        aria-invalid={Boolean(error)}
      />
      {error && <ErrorText message={error} />}
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
  rows,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  rows: number;
}) {
  return (
    <label className="space-y-2 text-sm font-semibold text-[#344239]">
      {label}
      <textarea
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="field-control resize-y"
        aria-invalid={Boolean(error)}
      />
      {error && <ErrorText message={error} />}
    </label>
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
  children: ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm font-semibold text-[#344239]">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control"
        aria-invalid={Boolean(error)}
      >
        {children}
      </select>
      {error && <ErrorText message={error} />}
    </label>
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
  value: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  return (
    <label className="space-y-2 text-sm font-semibold text-[#344239]">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="field-control"
        aria-invalid={Boolean(error)}
      >
        {[1, 2, 3, 4, 5].map((score) => (
          <option key={score} value={score}>
            {score} / 5
          </option>
        ))}
      </select>
      {error && <ErrorText message={error} />}
    </label>
  );
}

function ErrorText({ message }: { message: string }) {
  return <span className="block text-xs font-medium text-[#a3483e]">{message}</span>;
}

function formatLabel(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}
