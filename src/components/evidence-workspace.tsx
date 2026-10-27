"use client";

import Link from "next/link";
import { useState } from "react";

import {
  SOURCE_ACCESSIBILITY_STATUSES,
  SOURCE_TYPES,
  type SourceAccessibilityStatus,
} from "@/domain/rules";

export type EvidenceCompanyView = { id: string; name: string; status: string };

export type SourceView = {
  id: string;
  companyId: string;
  url: string;
  sourceType: string;
  title: string | null;
  publishedAt: string | null;
  sourceUpdatedAt: string | null;
  lastCheckedAt: string | null;
  accessibilityStatus: string;
  company: { id: string; name: string };
  _count: { evidence: number };
};

export type EvidenceView = {
  id: string;
  companyId: string;
  sourceId: string;
  excerpt: string;
  snapshotPath: string | null;
  observedAt: string;
  lastVerifiedAt: string | null;
  snapshotHash: string;
  confidence: number;
  notes: string | null;
  company: { id: string; name: string };
  source: {
    id: string;
    url: string;
    title: string | null;
    sourceType: string;
    accessibilityStatus: string;
  };
};

export type SourceFormValues = {
  companyId: string;
  url: string;
  sourceType: string;
  title: string;
  publishedAt: string;
  sourceUpdatedAt: string;
  lastCheckedAt: string;
  accessibilityStatus: SourceAccessibilityStatus;
};

export type EvidenceFormValues = {
  companyId: string;
  sourceId: string;
  excerpt: string;
  observedAt: string;
  lastVerifiedAt: string;
  snapshotPath: string;
  confidence: number;
  notes: string;
};

export function emptySourceForm(companyId = ""): SourceFormValues {
  return {
    companyId,
    url: "",
    sourceType: "website",
    title: "",
    publishedAt: "",
    sourceUpdatedAt: "",
    lastCheckedAt: "",
    accessibilityStatus: "accessible",
  };
}

export function sourceToFormValues(source: SourceView): SourceFormValues {
  return {
    companyId: source.companyId,
    url: source.url,
    sourceType: source.sourceType,
    title: source.title ?? "",
    publishedAt: formatInputDate(source.publishedAt),
    sourceUpdatedAt: formatInputDate(source.sourceUpdatedAt),
    lastCheckedAt: formatInputDate(source.lastCheckedAt),
    accessibilityStatus: source.accessibilityStatus as SourceAccessibilityStatus,
  };
}

export function emptyEvidenceForm(companyId = "", sourceId = ""): EvidenceFormValues {
  return {
    companyId,
    sourceId,
    excerpt: "",
    observedAt: "",
    lastVerifiedAt: "",
    snapshotPath: "",
    confidence: 3,
    notes: "",
  };
}

export function evidenceToFormValues(evidence: EvidenceView): EvidenceFormValues {
  return {
    companyId: evidence.companyId,
    sourceId: evidence.sourceId,
    excerpt: evidence.excerpt,
    observedAt: formatInputDate(evidence.observedAt),
    lastVerifiedAt: formatInputDate(evidence.lastVerifiedAt),
    snapshotPath: evidence.snapshotPath ?? "",
    confidence: evidence.confidence,
    notes: evidence.notes ?? "",
  };
}

export function EvidenceWorkspace({
  initialCompanies,
  initialSources,
  initialSourceOptions,
  initialEvidence,
  initialCompanyId = "",
}: {
  initialCompanies: EvidenceCompanyView[];
  initialSources: SourceView[];
  initialSourceOptions: SourceView[];
  initialEvidence: EvidenceView[];
  initialCompanyId?: string;
}) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [sources, setSources] = useState(initialSources);
  const [sourceOptions, setSourceOptions] = useState(initialSourceOptions);
  const [evidence, setEvidence] = useState(initialEvidence);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
  const [editingSource, setEditingSource] = useState<SourceView | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<EvidenceView | null>(null);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formCompanyId =
    selectedCompanyId ||
    companies.find((company) => company.status === "active")?.id ||
    companies[0]?.id ||
    "";
  const formSources = sourceOptions.filter((source) => source.companyId === formCompanyId);

  async function refresh(companyId = selectedCompanyId) {
    setLoading(true);
    setError("");
    try {
      const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
      const response = await fetch(`/api/evidence${query}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        companies?: EvidenceCompanyView[];
        sources?: SourceView[];
        sourceOptions?: SourceView[];
        evidence?: EvidenceView[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Evidence could not be loaded.");
      setCompanies(payload.companies ?? []);
      setSources(payload.sources ?? []);
      setSourceOptions(payload.sourceOptions ?? payload.sources ?? []);
      setEvidence(payload.evidence ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Evidence could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  function changeCompany(companyId: string) {
    setSelectedCompanyId(companyId);
    void refresh(companyId);
  }

  async function saveSource(values: SourceFormValues) {
    const id = editingSource?.id;
    const response = await fetch(id ? `/api/sources/${id}` : "/api/sources", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        publishedAt: values.publishedAt || null,
        sourceUpdatedAt: values.sourceUpdatedAt || null,
        lastCheckedAt: values.lastCheckedAt || null,
      }),
    });
    const payload = (await response.json()) as { errors?: Record<string, string>; error?: string };
    if (!response.ok) return { errors: payload.errors, error: payload.error };

    setSelectedCompanyId(values.companyId);
    setEditingSource(null);
    setShowSourceForm(false);
    await refresh(values.companyId);
    return {};
  }

  async function saveEvidence(values: EvidenceFormValues) {
    const id = editingEvidence?.id;
    const response = await fetch(id ? `/api/evidence/${id}` : "/api/evidence", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        observedAt: values.observedAt || null,
        lastVerifiedAt: values.lastVerifiedAt || null,
        snapshotPath: values.snapshotPath || null,
        notes: values.notes || null,
      }),
    });
    const payload = (await response.json()) as { errors?: Record<string, string>; error?: string };
    if (!response.ok) return { errors: payload.errors, error: payload.error };

    setSelectedCompanyId(values.companyId);
    setEditingEvidence(null);
    setShowEvidenceForm(false);
    await refresh(values.companyId);
    return {};
  }

  function openNewSource() {
    setEditingSource(null);
    setEditingEvidence(null);
    setShowEvidenceForm(false);
    setShowSourceForm((visible) => !visible);
  }

  function openNewEvidence() {
    setEditingSource(null);
    setShowSourceForm(false);
    setShowEvidenceForm((visible) => !visible);
  }

  if (companies.length === 0) {
    return (
      <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center sm:px-10">
        <div
          className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e8f2dc] text-xl font-bold text-[#77905e]"
          aria-hidden="true"
        >
          +
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#8aa95b]">
          Company first
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
          Add a company before capturing evidence
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#748078]">
          Every source and observation must remain traceable to a company. Add a fictional or
          permitted research target to begin.
        </p>
        <Link href="/companies" className="button-primary mt-6">
          Go to companies
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-[#dce3da] bg-white/65 p-5 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex-1 text-sm font-semibold text-[#344239]">
          Filter by company
          <select
            aria-label="Filter evidence by company"
            value={selectedCompanyId}
            onChange={(event) => changeCompany(event.target.value)}
            className="field-control mt-2"
          >
            <option value="">All companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
                {company.status === "archived" ? " (archived)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openNewSource} className="button-secondary">
            Add source
          </button>
          <button type="button" onClick={openNewEvidence} className="button-primary">
            Add evidence
          </button>
        </div>
      </section>

      {(showSourceForm || editingSource) && (
        <section
          aria-labelledby="source-form-heading"
          className="rounded-3xl border border-[#d4e4c2] bg-[#f5faef] p-5 sm:p-7"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
            {editingSource ? "Edit public source" : "New public source"}
          </p>
          <h2
            id="source-form-heading"
            className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
          >
            {editingSource ? editingSource.title || editingSource.url : "Add a source link"}
          </h2>
          <div className="mt-6">
            <SourceForm
              key={editingSource?.id ?? `new-source-${formCompanyId}`}
              companies={companies}
              initialValues={
                editingSource ? sourceToFormValues(editingSource) : emptySourceForm(formCompanyId)
              }
              submitLabel={editingSource ? "Save source" : "Create source"}
              onSubmit={saveSource}
              onCancel={() => {
                setShowSourceForm(false);
                setEditingSource(null);
              }}
            />
          </div>
        </section>
      )}

      {(showEvidenceForm || editingEvidence) && (
        <section
          aria-labelledby="evidence-form-heading"
          className="rounded-3xl border border-[#dce3da] bg-white/75 p-5 sm:p-7"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
            {editingEvidence ? "Edit observation" : "New observation"}
          </p>
          <h2
            id="evidence-form-heading"
            className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
          >
            {editingEvidence ? "Update the evidence record" : "Capture what you observed"}
          </h2>
          <div className="mt-6">
            <EvidenceForm
              key={editingEvidence?.id ?? `new-evidence-${formCompanyId}`}
              companies={companies}
              sources={sourceOptions}
              initialValues={
                editingEvidence
                  ? evidenceToFormValues(editingEvidence)
                  : emptyEvidenceForm(formCompanyId, formSources[0]?.id ?? "")
              }
              submitLabel={editingEvidence ? "Save evidence" : "Save evidence"}
              onSubmit={saveEvidence}
              onCancel={() => {
                setShowEvidenceForm(false);
                setEditingEvidence(null);
              }}
            />
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-[#fff0ef] px-4 py-3 text-sm text-[#a3483e]">
          {error}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section aria-labelledby="evidence-list-heading">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
                Observed signals
              </p>
              <h2
                id="evidence-list-heading"
                className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
              >
                Evidence records
              </h2>
            </div>
            <p className="text-sm text-[#748078]" aria-live="polite">
              {loading
                ? "Loading..."
                : `${evidence.length} ${evidence.length === 1 ? "record" : "records"}`}
            </p>
          </div>
          {evidence.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-[#cbd8c8] bg-white/50 px-5 py-12 text-center">
              <p className="text-lg font-semibold text-[#17201b]">No evidence captured yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#748078]">
                Add a source first, then preserve a short excerpt with its observation and
                verification dates.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {evidence.map((record) => (
                <EvidenceCard
                  key={record.id}
                  evidence={record}
                  onEdit={() => {
                    setEditingEvidence(record);
                    setEditingSource(null);
                    setShowSourceForm(false);
                    setShowEvidenceForm(false);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="source-list-heading">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
              Traceability
            </p>
            <h2
              id="source-list-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
            >
              Source links
            </h2>
          </div>
          {sources.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-[#cbd8c8] bg-white/50 px-5 py-12 text-center">
              <p className="text-lg font-semibold text-[#17201b]">No sources added yet</p>
              <p className="mt-2 text-sm leading-6 text-[#748078]">
                A source keeps every observation tied to a public location.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {sources.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  onEdit={() => {
                    setEditingSource(source);
                    setEditingEvidence(null);
                    setShowEvidenceForm(false);
                    setShowSourceForm(false);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SourceForm({
  companies,
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  companies: EvidenceCompanyView[];
  initialValues: SourceFormValues;
  submitLabel: string;
  onSubmit: (
    values: SourceFormValues,
  ) => Promise<{ errors?: Record<string, string>; error?: string }>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof SourceFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await onSubmit(values);
      setErrors(result.errors ?? (result.error ? { form: result.error } : {}));
    } catch {
      setErrors({ form: "The source could not be saved." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Company"
          name="source-company"
          value={values.companyId}
          onChange={(value) => update("companyId", value)}
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
          label="Source URL"
          name="source-url"
          type="url"
          value={values.url}
          onChange={(value) => update("url", value)}
          error={errors.url}
          placeholder="https://example.com/pricing"
          required
        />
        <SelectField
          label="Source type"
          name="source-type"
          value={values.sourceType}
          onChange={(value) => update("sourceType", value)}
          error={errors.sourceType}
        >
          {SOURCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {formatLabel(type)}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Source title"
          name="source-title"
          value={values.title}
          onChange={(value) => update("title", value)}
          error={errors.title}
          placeholder="Pricing page"
        />
        <TextField
          label="Published date"
          name="published-date"
          type="date"
          value={values.publishedAt}
          onChange={(value) => update("publishedAt", value)}
          error={errors.publishedAt}
        />
        <TextField
          label="Source updated date"
          name="source-updated-date"
          type="date"
          value={values.sourceUpdatedAt}
          onChange={(value) => update("sourceUpdatedAt", value)}
          error={errors.sourceUpdatedAt}
        />
        <TextField
          label="Last checked date"
          name="last-checked-date"
          type="date"
          value={values.lastCheckedAt}
          onChange={(value) => update("lastCheckedAt", value)}
          error={errors.lastCheckedAt}
        />
        <SelectField
          label="Accessibility"
          name="source-accessibility"
          value={values.accessibilityStatus}
          onChange={(value) => update("accessibilityStatus", value)}
          error={errors.accessibilityStatus}
        >
          {SOURCE_ACCESSIBILITY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatLabel(status)}
            </option>
          ))}
        </SelectField>
      </div>
      <FormActions
        submitting={submitting}
        submitLabel={submitLabel}
        onCancel={onCancel}
        formError={errors.form}
      />
    </form>
  );
}

function EvidenceForm({
  companies,
  sources,
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  companies: EvidenceCompanyView[];
  sources: SourceView[];
  initialValues: EvidenceFormValues;
  submitLabel: string;
  onSubmit: (
    values: EvidenceFormValues,
  ) => Promise<{ errors?: Record<string, string>; error?: string }>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof EvidenceFormValues, value: string | number) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  }

  function updateCompany(companyId: string) {
    const nextSource = sources.find((source) => source.companyId === companyId);
    setValues((current) => ({ ...current, companyId, sourceId: nextSource?.id ?? "" }));
    setErrors((current) => ({ ...current, companyId: "", sourceId: "", form: "" }));
  }

  const availableSources = sources.filter((source) => source.companyId === values.companyId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await onSubmit(values);
      setErrors(result.errors ?? (result.error ? { form: result.error } : {}));
    } catch {
      setErrors({ form: "The evidence could not be saved." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Company"
          name="evidence-company"
          value={values.companyId}
          onChange={updateCompany}
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
          label="Source"
          name="evidence-source"
          value={values.sourceId}
          onChange={(value) => update("sourceId", value)}
          error={errors.sourceId}
        >
          <option value="">Choose a source</option>
          {availableSources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.title || source.url}
            </option>
          ))}
        </SelectField>
      </div>
      {availableSources.length === 0 && (
        <p className="rounded-xl bg-[#fff8e8] px-3 py-2 text-sm text-[#8d6b28]">
          Add a source for this company before saving evidence.
        </p>
      )}
      <label className="block space-y-2 text-sm font-semibold text-[#344239]">
        Evidence excerpt
        <textarea
          name="evidence-excerpt"
          value={values.excerpt}
          onChange={(event) => update("excerpt", event.target.value)}
          rows={5}
          className="field-control resize-y"
          placeholder="Short, factual observation from the source..."
          aria-invalid={Boolean(errors.excerpt)}
        />
        {errors.excerpt && <ErrorText message={errors.excerpt} />}
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Observed date"
          name="observed-date"
          type="date"
          value={values.observedAt}
          onChange={(value) => update("observedAt", value)}
          error={errors.observedAt}
        />
        <TextField
          label="Last verified date"
          name="verified-date"
          type="date"
          value={values.lastVerifiedAt}
          onChange={(value) => update("lastVerifiedAt", value)}
          error={errors.lastVerifiedAt}
        />
        <TextField
          label="Screenshot or attachment path"
          name="snapshot-path"
          value={values.snapshotPath}
          onChange={(value) => update("snapshotPath", value)}
          error={errors.snapshotPath}
          placeholder="notes/screenshots/pricing.png"
        />
        <label className="space-y-2 text-sm font-semibold text-[#344239]">
          Confidence
          <select
            name="confidence"
            value={values.confidence}
            onChange={(event) => update("confidence", Number(event.target.value))}
            className="field-control"
          >
            {[1, 2, 3, 4, 5].map((score) => (
              <option key={score} value={score}>
                {score} / 5
              </option>
            ))}
          </select>
          {errors.confidence && <ErrorText message={errors.confidence} />}
        </label>
      </div>
      <label className="block space-y-2 text-sm font-semibold text-[#344239]">
        Notes
        <textarea
          name="evidence-notes"
          value={values.notes}
          onChange={(event) => update("notes", event.target.value)}
          rows={3}
          className="field-control resize-y"
          placeholder="Context for re-verification..."
        />
        {errors.notes && <ErrorText message={errors.notes} />}
      </label>
      <FormActions
        submitting={submitting}
        submitLabel={submitLabel}
        onCancel={onCancel}
        formError={errors.form}
        disabled={availableSources.length === 0}
      />
    </form>
  );
}

function SourceCard({ source, onEdit }: { source: SourceView; onEdit: () => void }) {
  return (
    <article className="rounded-3xl border border-[#dce3da] bg-white/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#344239] underline decoration-[#c7f36b] underline-offset-4 hover:text-[#607a3e]"
          >
            {source.title || source.url}
          </a>
          <p className="mt-2 truncate text-xs text-[#8a9890]">{source.url}</p>
        </div>
        <span className={accessibilityClass(source.accessibilityStatus)}>
          {formatLabel(source.accessibilityStatus)}
        </span>
      </div>
      <p className="mt-4 text-xs text-[#748078]">
        {source.company.name} · {formatLabel(source.sourceType)} · {source._count.evidence}{" "}
        {source._count.evidence === 1 ? "observation" : "observations"}
      </p>
      <p className="mt-2 text-xs text-[#8a9890]">
        Published {formatDate(source.publishedAt)} · Updated {formatDate(source.sourceUpdatedAt)} ·
        Checked {formatDate(source.lastCheckedAt)}
      </p>
      <button type="button" onClick={onEdit} className="button-secondary mt-4">
        Edit source
      </button>
    </article>
  );
}

function EvidenceCard({ evidence, onEdit }: { evidence: EvidenceView; onEdit: () => void }) {
  return (
    <article className="rounded-3xl border border-[#dce3da] bg-white/75 p-5 shadow-[0_12px_35px_rgba(60,82,59,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
          {evidence.company.name} · {formatLabel(evidence.source.sourceType)}
        </p>
        <span className="rounded-full bg-[#edf2eb] px-3 py-1 text-xs font-bold text-[#607a3e]">
          Confidence {evidence.confidence}/5
        </span>
      </div>
      <blockquote className="mt-4 border-l-2 border-[#c7f36b] pl-4 text-base leading-7 text-[#344239]">
        “{evidence.excerpt}”
      </blockquote>
      <a
        href={evidence.source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block truncate text-xs text-[#708076] underline decoration-[#c7f36b] underline-offset-4 hover:text-[#607a3e]"
      >
        {evidence.source.title || evidence.source.url}
      </a>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#8a9890]">
        <span>Observed {formatDate(evidence.observedAt)}</span>
        <span>Verified {formatDate(evidence.lastVerifiedAt)}</span>
        <span className={accessibilityClass(evidence.source.accessibilityStatus)}>
          {formatLabel(evidence.source.accessibilityStatus)}
        </span>
      </div>
      {evidence.notes && <p className="mt-3 text-sm leading-6 text-[#68766e]">{evidence.notes}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onEdit} className="button-secondary">
          Edit evidence
        </button>
        <Link
          href={`/opportunities?companyId=${evidence.companyId}&evidenceId=${evidence.id}`}
          className="button-secondary"
        >
          Create opportunity
        </Link>
      </div>
    </article>
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

function FormActions({
  submitting,
  submitLabel,
  onCancel,
  formError,
  disabled = false,
}: {
  submitting: boolean;
  submitLabel: string;
  onCancel: () => void;
  formError?: string;
  disabled?: boolean;
}) {
  return (
    <>
      {formError && (
        <p role="alert" className="rounded-xl bg-[#fff0ef] px-3 py-2 text-sm text-[#a3483e]">
          {formError}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={submitting || disabled} className="button-primary">
          {submitting ? "Saving..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="button-secondary">
          Cancel
        </button>
      </div>
    </>
  );
}

function ErrorText({ message }: { message: string }) {
  return <span className="block text-xs font-medium text-[#a3483e]">{message}</span>;
}

function formatInputDate(value: string | Date | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function formatDate(value: string | Date | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "not set";
}

function formatLabel(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function accessibilityClass(status: string) {
  if (status === "accessible")
    return "rounded-full bg-[#e8f2dc] px-2.5 py-1 text-[11px] font-bold text-[#607a3e]";
  if (status === "inaccessible" || status === "deleted")
    return "rounded-full bg-[#fff0ef] px-2.5 py-1 text-[11px] font-bold text-[#a3483e]";
  return "rounded-full bg-[#fff8e8] px-2.5 py-1 text-[11px] font-bold text-[#9a762c]";
}
