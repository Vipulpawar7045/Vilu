"use client";

import Link from "next/link";
import { useState } from "react";

export type ContactCompanyView = { id: string; name: string; status: string };
export type ContactView = {
  id: string;
  companyId: string;
  name: string;
  role: string | null;
  profileUrl: string | null;
  contactMethod: string | null;
  relevanceNotes: string | null;
  doNotContact: boolean;
  company: ContactCompanyView;
  _count: { outreach: number };
};

type ContactFormValues = {
  companyId: string;
  name: string;
  role: string;
  profileUrl: string;
  contactMethod: string;
  relevanceNotes: string;
  doNotContact: boolean;
};

function emptyContact(companyId = ""): ContactFormValues {
  return {
    companyId,
    name: "",
    role: "",
    profileUrl: "",
    contactMethod: "",
    relevanceNotes: "",
    doNotContact: false,
  };
}

function toForm(contact: ContactView): ContactFormValues {
  return {
    companyId: contact.companyId,
    name: contact.name,
    role: contact.role ?? "",
    profileUrl: contact.profileUrl ?? "",
    contactMethod: contact.contactMethod ?? "",
    relevanceNotes: contact.relevanceNotes ?? "",
    doNotContact: contact.doNotContact,
  };
}

export function ContactWorkspace({
  initialCompanies,
  initialContacts,
  initialCompanyId = "",
}: {
  initialCompanies: ContactCompanyView[];
  initialContacts: ContactView[];
  initialCompanyId?: string;
}) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [contacts, setContacts] = useState(initialContacts);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [editing, setEditing] = useState<ContactView | null>(null);
  const [showForm, setShowForm] = useState(Boolean(initialCompanyId));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh(nextCompanyId = companyId) {
    setLoading(true);
    setError("");
    try {
      const query = nextCompanyId ? `?companyId=${encodeURIComponent(nextCompanyId)}` : "";
      const response = await fetch(`/api/contacts${query}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        companies?: ContactCompanyView[];
        contacts?: ContactView[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Contacts could not be loaded.");
      setCompanies(payload.companies ?? []);
      setContacts(payload.contacts ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Contacts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function saveContact(values: ContactFormValues) {
    const response = await fetch(editing ? `/api/contacts/${editing.id}` : "/api/contacts", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        profileUrl: values.profileUrl || null,
        role: values.role || null,
        contactMethod: values.contactMethod || null,
        relevanceNotes: values.relevanceNotes || null,
      }),
    });
    const payload = (await response.json()) as { errors?: Record<string, string>; error?: string };
    if (!response.ok) return { errors: payload.errors, error: payload.error };
    setCompanyId(values.companyId);
    setEditing(null);
    setShowForm(false);
    await refresh(values.companyId);
    return {};
  }

  if (companies.length === 0)
    return (
      <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-[#17201b]">
          Add a company before saving contacts
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#748078]">
          Contacts stay linked to a research target and are never used for bulk outreach.
        </p>
        <Link href="/companies" className="button-primary mt-6">
          Go to companies
        </Link>
      </section>
    );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-[#dce3da] bg-white/65 p-5 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex-1 text-sm font-semibold text-[#344239]">
          Filter by company
          <select
            aria-label="Filter contacts by company"
            value={companyId}
            onChange={(event) => {
              setCompanyId(event.target.value);
              void refresh(event.target.value);
            }}
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
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm((visible) => !visible);
          }}
          className="button-primary"
        >
          {showForm && !editing ? "Close form" : "Add contact"}
        </button>
      </section>
      {showForm && (
        <ContactForm
          key={editing?.id ?? `new-${companyId}`}
          companies={companies}
          initialValues={
            editing
              ? toForm(editing)
              : emptyContact(
                  companyId || companies.find((company) => company.status === "active")?.id,
                )
          }
          submitLabel={editing ? "Save contact" : "Create contact"}
          onSubmit={saveContact}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
      {error && (
        <p role="alert" className="rounded-2xl bg-[#fff0ef] px-4 py-3 text-sm text-[#a3483e]">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
            Relevant people
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
            Contact directory
          </h2>
        </div>
        <p className="text-sm text-[#748078]">
          {loading
            ? "Loading..."
            : `${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"}`}
        </p>
      </div>
      {contacts.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-[#17201b]">No contacts saved yet</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#748078]">
            Save one relevant person at a time. A do-not-contact flag always remains visible.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={() => {
                setEditing(contact);
                setShowForm(true);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactForm({
  companies,
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  companies: ContactCompanyView[];
  initialValues: ContactFormValues;
  submitLabel: string;
  onSubmit: (
    values: ContactFormValues,
  ) => Promise<{ errors?: Record<string, string>; error?: string }>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const update = (field: keyof ContactFormValues, value: string | boolean) => {
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
      setErrors({ form: "The contact could not be saved." });
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      aria-labelledby="contact-form-heading"
      className="rounded-3xl border border-[#d4e4c2] bg-[#f5faef] p-5 sm:p-7"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">Contact record</p>
      <h2
        id="contact-form-heading"
        className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
      >
        {submitLabel}
      </h2>
      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Company"
            name="contact-company"
            value={values.companyId}
            onChange={(value) => update("companyId", value)}
            error={errors.companyId}
            select
            options={companies.map((company) => ({ value: company.id, label: company.name }))}
          />
          <Field
            label="Contact name"
            name="contact-name"
            value={values.name}
            onChange={(value) => update("name", value)}
            error={errors.name}
            required
          />
          <Field
            label="Role"
            name="contact-role"
            value={values.role}
            onChange={(value) => update("role", value)}
            error={errors.role}
            placeholder="Head of Product"
          />
          <Field
            label="Public profile or company contact link"
            name="contact-profile"
            value={values.profileUrl}
            onChange={(value) => update("profileUrl", value)}
            error={errors.profileUrl}
            placeholder="https://example.com/team/name"
          />
          <Field
            label="Contact method"
            name="contact-method"
            value={values.contactMethod}
            onChange={(value) => update("contactMethod", value)}
            error={errors.contactMethod}
            placeholder="Email, LinkedIn, referral"
          />
        </div>
        <label className="block space-y-2 text-sm font-semibold text-[#344239]">
          Relevance notes
          <textarea
            name="relevance-notes"
            value={values.relevanceNotes}
            onChange={(event) => update("relevanceNotes", event.target.value)}
            rows={3}
            className="field-control resize-y"
            placeholder="Why this person is relevant to the opportunity..."
          />
          {errors.relevanceNotes && <ErrorText message={errors.relevanceNotes} />}
        </label>
        <label className="flex items-start gap-3 rounded-2xl border border-[#f0cbc6] bg-[#fff7f6] p-4 text-sm text-[#8f443c]">
          <input
            type="checkbox"
            checked={values.doNotContact}
            onChange={(event) => update("doNotContact", event.target.checked)}
            className="mt-1 accent-[#a3483e]"
          />
          <span>
            <strong>Do not contact</strong>
            <span className="mt-1 block text-xs leading-5">
              Future outreach to this contact will be blocked.
            </span>
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
          <button type="button" onClick={onCancel} className="button-secondary">
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function ContactCard({ contact, onEdit }: { contact: ContactView; onEdit: () => void }) {
  return (
    <article
      className={`rounded-3xl border bg-white/75 p-5 ${contact.doNotContact ? "border-[#f0cbc6]" : "border-[#dce3da]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-[-0.035em] text-[#17201b]">
            {contact.name}
          </h3>
          <p className="mt-1 text-sm text-[#7d965b]">
            {contact.role || "Role not set"} · {contact.company.name}
          </p>
        </div>
        {contact.doNotContact && (
          <span className="rounded-full bg-[#fff0ef] px-3 py-1 text-xs font-bold text-[#a3483e]">
            Do not contact
          </span>
        )}
      </div>
      {contact.profileUrl && (
        <a
          href={contact.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block truncate text-sm text-[#607a3e] underline decoration-[#c7f36b] underline-offset-4"
        >
          {contact.profileUrl}
        </a>
      )}
      <p className="mt-4 text-sm leading-6 text-[#59685f]">
        {contact.relevanceNotes || "No relevance notes added."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#8a9890]">
        <span>{contact.contactMethod || "Method not set"}</span>
        <span>
          {contact._count.outreach} outreach {contact._count.outreach === 1 ? "record" : "records"}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onEdit} className="button-secondary">
          Edit
        </button>
        <Link href={`/outreach?contactId=${contact.id}`} className="button-secondary">
          View outreach
        </Link>
      </div>
    </article>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  required,
  select,
  options = [],
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  select?: boolean;
  options?: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-2 text-sm font-semibold text-[#344239]">
      {label}
      {select ? (
        <select
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="field-control"
          aria-invalid={Boolean(error)}
        >
          <option value="">Choose a company</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="field-control"
          aria-invalid={Boolean(error)}
        />
      )}
      {error && <ErrorText message={error} />}
    </label>
  );
}
function ErrorText({ message }: { message: string }) {
  return <span className="block text-xs font-medium text-[#a3483e]">{message}</span>;
}
