"use client";

import Link from "next/link";
import { useState } from "react";

import {
  OUTREACH_CHANNELS,
  OUTREACH_STATUSES,
  renderOutreachTemplate,
  type OutreachChannel,
  type OutreachStatus,
} from "@/domain/rules";

export type OutreachCompanyOption = { id: string; name: string; status: string };
export type OutreachContactOption = {
  id: string;
  companyId: string;
  name: string;
  role: string | null;
  profileUrl: string | null;
  contactMethod: string | null;
  doNotContact: boolean;
  company: OutreachCompanyOption;
};
export type OutreachOpportunityOption = {
  id: string;
  companyId: string;
  title: string;
  status: string;
  suggestedSolution: string | null;
  company: OutreachCompanyOption;
  evidenceLinks: Array<{
    evidence: {
      excerpt: string;
      observedAt: string;
      source: { title: string | null; url: string };
    };
  }>;
};
export type OutreachView = {
  id: string;
  opportunityId: string;
  contactId: string;
  channel: string;
  draftMessage: string;
  sentAt: string | null;
  followUpAt: string | null;
  responseSummary: string | null;
  nextAction: string | null;
  status: string;
  opportunity: { id: string; title: string; status: string; company: OutreachCompanyOption };
  contact: OutreachContactOption;
  overdue: boolean;
};

type OutreachFormValues = {
  opportunityId: string;
  contactId: string;
  channel: OutreachChannel;
  draftMessage: string;
  sentAt: string;
  followUpAt: string;
  responseSummary: string;
  nextAction: string;
  status: OutreachStatus;
  confirmClosedOpportunity: boolean;
};

const template =
  "Hi {{contact}},\n\nI was researching {{company}} and noticed a possible opportunity around {{opportunity}}. I found {{evidence}}, and have a practical idea that may help with {{solution}}.\n\nThis is only an outside observation, so I may be missing context. If it is relevant, I would be happy to share a short analysis. If not, no problem at all.\n\nBest,\n[Your name]";

function emptyOutreach(opportunityId = "", contactId = ""): OutreachFormValues {
  return {
    opportunityId,
    contactId,
    channel: "email",
    draftMessage: "",
    sentAt: "",
    followUpAt: "",
    responseSummary: "",
    nextAction: "",
    status: "draft",
    confirmClosedOpportunity: false,
  };
}
function toForm(record: OutreachView): OutreachFormValues {
  return {
    opportunityId: record.opportunityId,
    contactId: record.contactId,
    channel: record.channel as OutreachChannel,
    draftMessage: record.draftMessage,
    sentAt: toLocalDateTime(record.sentAt),
    followUpAt: toLocalDateTime(record.followUpAt),
    responseSummary: record.responseSummary ?? "",
    nextAction: record.nextAction ?? "",
    status: record.status as OutreachStatus,
    confirmClosedOpportunity: false,
  };
}

export function OutreachWorkspace({
  initialCompanies,
  initialContacts,
  initialOpportunities,
  initialOutreach,
  initialCompanyId = "",
  initialContactId = "",
}: {
  initialCompanies: OutreachCompanyOption[];
  initialContacts: OutreachContactOption[];
  initialOpportunities: OutreachOpportunityOption[];
  initialOutreach: OutreachView[];
  initialCompanyId?: string;
  initialContactId?: string;
}) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [contacts, setContacts] = useState(initialContacts);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [outreach, setOutreach] = useState(initialOutreach);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [due, setDue] = useState<"all" | "due" | "overdue" | "upcoming">("all");
  const [editing, setEditing] = useState<OutreachView | null>(null);
  const [showForm, setShowForm] = useState(Boolean(initialContactId));
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh(nextCompanyId = companyId, nextDue = due) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ due: nextDue });
      if (nextCompanyId) params.set("companyId", nextCompanyId);
      const response = await fetch(`/api/outreach?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        companies?: OutreachCompanyOption[];
        contacts?: OutreachContactOption[];
        opportunities?: OutreachOpportunityOption[];
        outreach?: OutreachView[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Outreach could not be loaded.");
      setCompanies(payload.companies ?? []);
      setContacts(payload.contacts ?? []);
      setOpportunities(payload.opportunities ?? []);
      setOutreach(payload.outreach ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Outreach could not be loaded.");
    } finally {
      setLoading(false);
    }
  }
  async function saveOutreach(values: OutreachFormValues) {
    const response = await fetch(editing ? `/api/outreach/${editing.id}` : "/api/outreach", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        sentAt: values.sentAt ? new Date(values.sentAt).toISOString() : null,
        followUpAt: values.followUpAt ? new Date(values.followUpAt).toISOString() : null,
        responseSummary: values.responseSummary || null,
        nextAction: values.nextAction || null,
      }),
    });
    const payload = (await response.json()) as { errors?: Record<string, string>; error?: string };
    if (!response.ok) return { errors: payload.errors, error: payload.error };
    setCompanyId(
      opportunities.find((opportunity) => opportunity.id === values.opportunityId)?.companyId ??
        companyId,
    );
    setEditing(null);
    setShowForm(false);
    await refresh();
    return {};
  }
  async function copyMessage(id: string, message: string) {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setError("Message could not be copied. Select and copy it manually instead.");
    }
  }

  const formCompanyId =
    companyId ||
    initialCompanyId ||
    companies.find((company) => company.status === "active")?.id ||
    "";
  if (companies.length === 0)
    return (
      <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-[#17201b]">
          Add a company before drafting outreach
        </h2>
        <Link href="/companies" className="button-primary mt-6">
          Go to companies
        </Link>
      </section>
    );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-[#dce3da] bg-white/65 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#344239]">
            Filter by company
            <select
              aria-label="Filter outreach by company"
              value={companyId}
              onChange={(event) => {
                setCompanyId(event.target.value);
                void refresh(event.target.value, due);
              }}
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
          <label className="text-sm font-semibold text-[#344239]">
            Follow-up queue
            <select
              aria-label="Filter follow-ups"
              value={due}
              onChange={(event) => {
                const next = event.target.value as typeof due;
                setDue(next);
                void refresh(companyId, next);
              }}
              className="field-control mt-2"
            >
              <option value="all">All follow-ups</option>
              <option value="due">Due today</option>
              <option value="overdue">Overdue</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm((visible) => !visible);
          }}
          className="button-primary"
        >
          {showForm && !editing ? "Close form" : "Draft message"}
        </button>
      </section>
      {showForm && (
        <OutreachForm
          key={editing?.id ?? `new-${initialContactId}-${formCompanyId}`}
          contacts={contacts}
          opportunities={opportunities}
          initialValues={editing ? toForm(editing) : emptyOutreach("", initialContactId)}
          submitLabel={editing ? "Save outreach" : "Save draft"}
          onSubmit={saveOutreach}
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
            Manual follow-up
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
            Outreach queue
          </h2>
        </div>
        <p className="text-sm text-[#748078]">
          {loading
            ? "Loading..."
            : `${outreach.length} ${outreach.length === 1 ? "record" : "records"}`}
        </p>
      </div>
      {outreach.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-[#17201b]">No outreach records match</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#748078]">
            Drafts and follow-ups stay here until you manually review and act on them.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {outreach.map((record) => (
            <OutreachCard
              key={record.id}
              record={record}
              copied={copiedId === record.id}
              onCopy={() => void copyMessage(record.id, record.draftMessage)}
              onEdit={() => {
                setEditing(record);
                setShowForm(true);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OutreachForm({
  contacts,
  opportunities,
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  contacts: OutreachContactOption[];
  opportunities: OutreachOpportunityOption[];
  initialValues: OutreachFormValues;
  submitLabel: string;
  onSubmit: (
    values: OutreachFormValues,
  ) => Promise<{ errors?: Record<string, string>; error?: string }>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const companyId =
    opportunities.find((opportunity) => opportunity.id === values.opportunityId)?.companyId ||
    contacts.find((contact) => contact.id === values.contactId)?.companyId ||
    "";
  const availableOpportunities = companyId
    ? opportunities.filter((opportunity) => opportunity.companyId === companyId)
    : opportunities;
  const availableContacts = contacts.filter((contact) => contact.companyId === companyId);
  const selectedOpportunity = opportunities.find(
    (opportunity) => opportunity.id === values.opportunityId,
  );
  const selectedContact = contacts.find((contact) => contact.id === values.contactId);
  const evidence =
    selectedOpportunity?.evidenceLinks[0]?.evidence.excerpt ?? "a dated public observation";
  const rendered = renderOutreachTemplate(values.draftMessage, {
    company: selectedOpportunity?.company.name,
    contact: selectedContact?.name,
    opportunity: selectedOpportunity?.title,
    evidence,
    solution: selectedOpportunity?.suggestedSolution,
  });
  const update = (field: keyof OutreachFormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };
  function selectOpportunity(opportunityId: string) {
    const next = opportunities.find((opportunity) => opportunity.id === opportunityId);
    setValues((current) => ({
      ...current,
      opportunityId,
      contactId:
        next &&
        current.contactId &&
        contacts.find((contact) => contact.id === current.contactId)?.companyId === next.companyId
          ? current.contactId
          : "",
    }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await onSubmit(values);
      setErrors(result.errors ?? (result.error ? { form: result.error } : {}));
    } catch {
      setErrors({ form: "The outreach draft could not be saved." });
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      aria-labelledby="outreach-form-heading"
      className="rounded-3xl border border-[#d4e4c2] bg-[#f5faef] p-5 sm:p-7"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
        Human-reviewed outreach
      </p>
      <h2
        id="outreach-form-heading"
        className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
      >
        {submitLabel}
      </h2>
      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Opportunity"
            name="outreach-opportunity"
            value={values.opportunityId}
            onChange={selectOpportunity}
            error={errors.opportunityId}
          >
            {availableOpportunities.map((opportunity) => (
              <option key={opportunity.id} value={opportunity.id}>
                {opportunity.company.name} · {opportunity.title} ({opportunity.status})
              </option>
            ))}
          </Select>
          <Select
            label="Contact"
            name="outreach-contact"
            value={values.contactId}
            onChange={(value) => update("contactId", value)}
            error={errors.contactId}
          >
            {availableContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
                {contact.doNotContact ? " (do not contact)" : ""}
              </option>
            ))}
          </Select>
          <Select
            label="Channel"
            name="outreach-channel"
            value={values.channel}
            onChange={(value) => update("channel", value)}
            error={errors.channel}
          >
            {OUTREACH_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {formatLabel(channel)}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            name="outreach-status"
            value={values.status}
            onChange={(value) => update("status", value)}
            error={errors.status}
          >
            {OUTREACH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatLabel(status)}
              </option>
            ))}
          </Select>
        </div>
        {selectedContact?.doNotContact && (
          <p className="rounded-xl bg-[#fff0ef] px-3 py-2 text-sm text-[#a3483e]">
            This contact is marked do not contact. Outreach actions are blocked.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => update("draftMessage", template)}
            className="button-secondary"
          >
            Insert respectful template
          </button>
          <span className="self-center text-xs text-[#748078]">
            Templates stay drafts until you manually review and copy them.
          </span>
        </div>
        <label className="block space-y-2 text-sm font-semibold text-[#344239]">
          Draft message
          <textarea
            name="draft-message"
            value={values.draftMessage}
            onChange={(event) => update("draftMessage", event.target.value)}
            rows={10}
            className="field-control resize-y"
            placeholder="Write or insert a personalized message..."
          />
          {errors.draftMessage && <ErrorText message={errors.draftMessage} />}
        </label>
        {values.draftMessage && (
          <div className="rounded-2xl border border-[#dce3da] bg-white/75 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">Preview</p>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-[#59685f]">
              {rendered.message}
            </pre>
            {rendered.missingVariables.length > 0 && (
              <p className="mt-3 text-xs font-semibold text-[#a3483e]">
                Missing variables:{" "}
                {rendered.missingVariables.map((variable) => `{{${variable}}}`).join(", ")}
              </p>
            )}
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <DateField
            label="Sent date"
            name="sent-date"
            value={values.sentAt}
            onChange={(value) => update("sentAt", value)}
            error={errors.sentAt}
          />
          <DateField
            label="Follow-up date"
            name="follow-up-date"
            value={values.followUpAt}
            onChange={(value) => update("followUpAt", value)}
            error={errors.followUpAt}
          />
          <TextArea
            label="Response summary"
            name="response-summary"
            value={values.responseSummary}
            onChange={(value) => update("responseSummary", value)}
            error={errors.responseSummary}
          />
          <TextArea
            label="Next action"
            name="next-action"
            value={values.nextAction}
            onChange={(value) => update("nextAction", value)}
            error={errors.nextAction}
          />
        </div>
        {selectedOpportunity && ["resolved", "rejected"].includes(selectedOpportunity.status) && (
          <label className="flex items-start gap-3 rounded-2xl border border-[#ead9b5] bg-[#fff8e8] p-4 text-sm text-[#795f2b]">
            <input
              type="checkbox"
              checked={values.confirmClosedOpportunity}
              onChange={(event) => update("confirmClosedOpportunity", event.target.checked)}
              className="mt-1 accent-[#9a762c]"
            />
            <span>
              <strong>Confirm outreach for a resolved or rejected opportunity</strong>
              <span className="mt-1 block text-xs leading-5">
                Only continue if there is a specific reason to reopen the conversation.
              </span>
            </span>
          </label>
        )}
        {errors.form && (
          <p role="alert" className="rounded-xl bg-[#fff0ef] px-3 py-2 text-sm text-[#a3483e]">
            {errors.form}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || Boolean(selectedContact?.doNotContact)}
            className="button-primary"
          >
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

function OutreachCard({
  record,
  copied,
  onCopy,
  onEdit,
}: {
  record: OutreachView;
  copied: boolean;
  onCopy: () => void;
  onEdit: () => void;
}) {
  const due = record.overdue;
  return (
    <article
      className={`rounded-3xl border bg-white/75 p-5 ${due ? "border-[#ead9b5]" : "border-[#dce3da]"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
            {record.contact.company.name}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-[#17201b]">
            {record.opportunity.title}
          </h3>
          <p className="mt-1 text-sm text-[#59685f]">
            To {record.contact.name}
            {record.contact.role ? ` · ${record.contact.role}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-[#f2f4ee] px-3 py-1 text-xs font-bold text-[#68766e]">
          {formatLabel(record.status)}
        </span>
      </div>
      <div className="mt-4 rounded-2xl bg-[#fbfcfa] p-4">
        <p className="whitespace-pre-wrap text-sm leading-6 text-[#59685f]">
          {record.draftMessage}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#8a9890]">
        <span>{formatLabel(record.channel)}</span>
        <span>Sent {formatDate(record.sentAt)}</span>
        <span className={due ? "font-bold text-[#9a762c]" : ""}>
          Follow-up {formatDate(record.followUpAt)}
        </span>
      </div>
      {record.responseSummary && (
        <p className="mt-3 text-sm leading-6 text-[#59685f]">
          <strong>Response:</strong> {record.responseSummary}
        </p>
      )}
      {record.nextAction && (
        <p className="mt-2 text-sm leading-6 text-[#59685f]">
          <strong>Next:</strong> {record.nextAction}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onCopy} className="button-primary">
          {copied ? "Copied" : "Copy message"}
        </button>
        <button type="button" onClick={onEdit} className="button-secondary">
          Edit outreach
        </button>
      </div>
    </article>
  );
}

function Select({
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
    <label className="space-y-2 text-sm font-semibold text-[#344239]">
      {label}
      <input
        name={name}
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control"
        aria-invalid={Boolean(error)}
      />
      {error && <ErrorText message={error} />}
    </label>
  );
}
function TextArea({
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
    <label className="space-y-2 text-sm font-semibold text-[#344239]">
      {label}
      <textarea
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="field-control resize-y"
      />
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
function formatDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16).replace("T", " ") : "Not set";
}
function toLocalDateTime(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}
