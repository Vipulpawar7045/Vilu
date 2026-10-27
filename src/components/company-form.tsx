"use client";

import { useState } from "react";

export type CompanyFormValues = {
  name: string;
  websiteUrl: string;
  industry: string;
  companyType: string;
  sizeEstimate: string;
  location: string;
  priority: number;
  notes: string;
  lastResearchedAt: string;
};

export const emptyCompanyForm: CompanyFormValues = {
  name: "",
  websiteUrl: "",
  industry: "SaaS",
  companyType: "Startup",
  sizeEstimate: "",
  location: "",
  priority: 3,
  notes: "",
  lastResearchedAt: "",
};

export function companyToFormValues(company: {
  name: string;
  websiteUrl: string;
  industry: string | null;
  companyType: string | null;
  sizeEstimate: string | null;
  location: string | null;
  priority: number;
  notes: string | null;
  lastResearchedAt: string | Date | null;
}): CompanyFormValues {
  return {
    name: company.name,
    websiteUrl: company.websiteUrl,
    industry: company.industry ?? "",
    companyType: company.companyType ?? "",
    sizeEstimate: company.sizeEstimate ?? "",
    location: company.location ?? "",
    priority: company.priority,
    notes: company.notes ?? "",
    lastResearchedAt: company.lastResearchedAt
      ? new Date(company.lastResearchedAt).toISOString().slice(0, 10)
      : "",
  };
}

export function CompanyForm({
  initialValues = emptyCompanyForm,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValues?: CompanyFormValues;
  submitLabel: string;
  onSubmit: (
    values: CompanyFormValues,
  ) => Promise<{ errors?: Record<string, string>; error?: string }>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof CompanyFormValues, value: string | number) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const result = await onSubmit(values);
    setErrors(result.errors ?? (result.error ? { form: result.error } : {}));
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Company name"
          name="name"
          value={values.name}
          onChange={(value) => update("name", value)}
          error={errors.name}
          required
        />
        <Field
          label="Website URL"
          name="websiteUrl"
          type="url"
          value={values.websiteUrl}
          onChange={(value) => update("websiteUrl", value)}
          error={errors.websiteUrl}
          placeholder="https://example.com"
          required
        />
        <Field
          label="Industry"
          name="industry"
          value={values.industry}
          onChange={(value) => update("industry", value)}
          error={errors.industry}
          placeholder="SaaS"
        />
        <Field
          label="Company type"
          name="companyType"
          value={values.companyType}
          onChange={(value) => update("companyType", value)}
          error={errors.companyType}
          placeholder="Startup"
        />
        <Field
          label="Size estimate"
          name="sizeEstimate"
          value={values.sizeEstimate}
          onChange={(value) => update("sizeEstimate", value)}
          error={errors.sizeEstimate}
          placeholder="11–50"
        />
        <Field
          label="Location"
          name="location"
          value={values.location}
          onChange={(value) => update("location", value)}
          error={errors.location}
          placeholder="Austin, TX"
        />
        <label className="space-y-2 text-sm font-semibold text-[#344239]">
          Priority
          <select
            name="priority"
            value={values.priority}
            onChange={(event) => update("priority", Number(event.target.value))}
            className="field-control"
          >
            {[1, 2, 3, 4, 5].map((priority) => (
              <option key={priority} value={priority}>
                {priority} — {priority === 5 ? "Highest" : priority === 1 ? "Lowest" : ""}
              </option>
            ))}
          </select>
          {errors.priority && <FieldError message={errors.priority} />}
        </label>
        <Field
          label="Last researched"
          name="lastResearchedAt"
          type="date"
          value={values.lastResearchedAt}
          onChange={(value) => update("lastResearchedAt", value)}
          error={errors.lastResearchedAt}
        />
      </div>
      <label className="block space-y-2 text-sm font-semibold text-[#344239]">
        Notes
        <textarea
          name="notes"
          value={values.notes}
          onChange={(event) => update("notes", event.target.value)}
          rows={4}
          className="field-control resize-y"
          placeholder="Context for future research..."
        />
        {errors.notes && <FieldError message={errors.notes} />}
      </label>
      {errors.form && (
        <p role="alert" className="rounded-xl bg-[#fff0ef] px-3 py-2 text-sm text-[#a3483e]">
          {errors.form}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={submitting} className="button-primary">
          {submitting ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="button-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
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
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && <FieldError id={`${name}-error`} message={error} />}
    </label>
  );
}

function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <span id={id} className="block text-xs font-medium text-[#a3483e]">
      {message}
    </span>
  );
}
