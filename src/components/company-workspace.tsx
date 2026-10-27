"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import {
  companyToFormValues,
  CompanyForm,
  emptyCompanyForm,
  type CompanyFormValues,
} from "@/components/company-form";

export type CompanyListItemView = {
  id: string;
  name: string;
  websiteUrl: string;
  industry: string | null;
  companyType: string | null;
  sizeEstimate: string | null;
  location: string | null;
  priority: number;
  status: string;
  notes: string | null;
  lastResearchedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    sources: number;
    evidence: number;
    opportunities: number;
    contacts: number;
  };
};

export function CompanyWorkspace({
  initialCompanies,
}: {
  initialCompanies: CompanyListItemView[];
}) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CompanyListItemView | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const refreshRequest = useRef(0);
  const localStatusChanges = useRef(new Map<string, CompanyListItemView>());
  const visibleCompanies = companies
    .map((company) => ({
      ...company,
      status: statusOverrides[company.id] ?? company.status,
    }))
    .filter((company) => company.status === status);

  async function refresh(nextQuery = query, nextStatus = status) {
    const requestId = ++refreshRequest.current;
    setLoading(true);
    setListError("");

    try {
      const response = await fetch(
        `/api/companies?q=${encodeURIComponent(nextQuery)}&status=${nextStatus}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        companies?: CompanyListItemView[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Companies could not be loaded.");
      if (requestId !== refreshRequest.current) return;
      const fetchedCompanies = payload.companies ?? [];
      const locallyChanged = Array.from(localStatusChanges.current.values()).filter(
        (company) =>
          company.status === nextStatus &&
          matchesCompanyQuery(company, nextQuery) &&
          !fetchedCompanies.some((fetchedCompany) => fetchedCompany.id === company.id),
      );
      setCompanies([...fetchedCompanies, ...locallyChanged]);
    } catch (error) {
      if (requestId !== refreshRequest.current) return;
      setListError(error instanceof Error ? error.message : "Companies could not be loaded.");
    } finally {
      if (requestId === refreshRequest.current) setLoading(false);
    }
  }

  function changeStatus(nextStatus: "active" | "archived") {
    setStatus(nextStatus);
    void refresh(query, nextStatus);
  }

  async function saveCompany(values: CompanyFormValues) {
    const id = editing?.id;
    const response = await fetch(id ? `/api/companies/${id}` : "/api/companies", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, lastResearchedAt: values.lastResearchedAt || null }),
    });
    const payload = (await response.json()) as {
      company?: CompanyListItemView;
      errors?: Record<string, string>;
      error?: string;
    };

    if (!response.ok) return { errors: payload.errors, error: payload.error };

    if (payload.company) {
      localStatusChanges.current.set(payload.company.id, {
        ...payload.company,
        _count: editing?._count ?? {
          sources: 0,
          evidence: 0,
          opportunities: 0,
          contacts: 0,
        },
      });
    }
    setShowForm(false);
    setEditing(null);
    await refresh();
    return {};
  }

  async function archiveCompany(company: CompanyListItemView) {
    const action = company.status === "archived" ? "restore" : "archive";
    if (!window.confirm(`${action === "archive" ? "Archive" : "Restore"} ${company.name}?`)) return;

    const response = await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action === "archive" ? "archived" : "active" }),
    });

    if (response.ok) {
      localStatusChanges.current.set(company.id, {
        ...company,
        status: action === "archive" ? "archived" : "active",
      });
      setStatusOverrides((current) => ({
        ...current,
        [company.id]: action === "archive" ? "archived" : "active",
      }));
      if (action === "restore") await refresh();
    } else {
      const payload = (await response.json()) as { error?: string };
      setListError(payload.error ?? "The company status could not be changed.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-[#dce3da] bg-white/65 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label htmlFor="company-search" className="text-sm font-semibold text-[#344239]">
            Search companies
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="company-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void refresh();
              }}
              placeholder="Name, website, industry, or location"
              className="field-control"
            />
            <button
              type="button"
              onClick={() => void refresh()}
              className="button-secondary shrink-0"
            >
              Search
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm((visible) => !visible);
          }}
          className="button-primary shrink-0"
        >
          {showForm && !editing ? "Close form" : "Add company"}
        </button>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="tablist" aria-label="Company status filter">
          <button
            type="button"
            role="tab"
            aria-selected={status === "active"}
            onClick={() => changeStatus("active")}
            className={tabClass(status === "active")}
          >
            Active
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={status === "archived"}
            onClick={() => changeStatus("archived")}
            className={tabClass(status === "archived")}
          >
            Archived
          </button>
        </div>
        <p className="text-sm text-[#748078]" aria-live="polite">
          {loading
            ? "Loading companies..."
            : `${visibleCompanies.length} ${visibleCompanies.length === 1 ? "company" : "companies"}`}
        </p>
      </div>

      {(showForm || editing) && (
        <section
          aria-labelledby="company-form-heading"
          className="rounded-3xl border border-[#d4e4c2] bg-[#f5faef] p-5 sm:p-7"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
            {editing ? "Edit research target" : "New research target"}
          </p>
          <h2
            id="company-form-heading"
            className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
          >
            {editing ? editing.name : "Add a company"}
          </h2>
          <div className="mt-6">
            <CompanyForm
              key={editing?.id ?? "new-company"}
              initialValues={editing ? companyToFormValues(editing) : emptyCompanyForm}
              submitLabel={editing ? "Save changes" : "Create company"}
              onSubmit={saveCompany}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          </div>
        </section>
      )}

      {listError && (
        <p role="alert" className="rounded-2xl bg-[#fff0ef] px-4 py-3 text-sm text-[#a3483e]">
          {listError}
        </p>
      )}

      {visibleCompanies.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center sm:px-10">
          <div
            className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e8f2dc] text-xl font-bold text-[#77905e]"
            aria-hidden="true"
          >
            {status === "active" ? "+" : "✓"}
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#8aa95b]">
            {status === "active" ? "Ready for your first record" : "Archive is clear"}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]">
            {query
              ? "No matching companies"
              : status === "active"
                ? "No companies added yet"
                : "No archived companies"}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#748078]">
            {query
              ? "Try a different name, website, industry, or location."
              : status === "active"
                ? "Add a company to start collecting public signals and current research evidence."
                : "Archived research targets remain available here without losing their related records."}
          </p>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onEdit={() => {
                setEditing(company);
                setShowForm(false);
              }}
              onArchive={() => void archiveCompany(company)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyCard({
  company,
  onEdit,
  onArchive,
}: {
  company: CompanyListItemView;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <article className="rounded-3xl border border-[#dce3da] bg-white/75 p-5 shadow-[0_12px_35px_rgba(60,82,59,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/companies/${company.id}`}
            className="text-xl font-semibold tracking-[-0.035em] text-[#17201b] underline decoration-[#c7f36b] decoration-2 underline-offset-4 hover:text-[#607a3e]"
          >
            {company.name}
          </Link>
          <a
            href={company.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block truncate text-sm text-[#708076] hover:text-[#607a3e]"
          >
            {company.websiteUrl}
          </a>
        </div>
        <span className="shrink-0 rounded-full bg-[#edf2eb] px-3 py-1 text-xs font-bold text-[#607a3e]">
          Priority {company.priority}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[#68766e]">
        {company.industry && (
          <span className="rounded-full bg-[#f2f4ee] px-2.5 py-1">{company.industry}</span>
        )}
        {company.companyType && (
          <span className="rounded-full bg-[#f2f4ee] px-2.5 py-1">{company.companyType}</span>
        )}
        {company.location && (
          <span className="rounded-full bg-[#f2f4ee] px-2.5 py-1">{company.location}</span>
        )}
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 border-y border-[#edf0eb] py-4 text-center">
        <Count label="Sources" value={company._count.sources} />
        <Count label="Evidence" value={company._count.evidence} />
        <Count label="Ideas" value={company._count.opportunities} />
        <Count label="Contacts" value={company._count.contacts} />
      </div>
      <p className="mt-4 text-xs text-[#8a9890]">
        Last researched:{" "}
        {company.lastResearchedAt ? formatDate(company.lastResearchedAt) : "Not yet researched"}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/companies/${company.id}`} className="button-secondary">
          View details
        </Link>
        <button type="button" onClick={onEdit} className="button-secondary">
          Edit
        </button>
        <button type="button" onClick={onArchive} className="button-danger">
          {company.status === "archived" ? "Restore" : "Archive"}
        </button>
      </div>
    </article>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-semibold text-[#17201b]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9aa59c]">
        {label}
      </p>
    </div>
  );
}

function tabClass(active: boolean) {
  return `rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#8ebd42] focus:ring-offset-2 ${active ? "bg-[#17201b] text-white" : "bg-white/70 text-[#627067] hover:bg-white"}`;
}

function matchesCompanyQuery(company: CompanyListItemView, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  return [company.name, company.websiteUrl, company.industry, company.location].some((value) =>
    value?.toLocaleLowerCase().includes(normalizedQuery),
  );
}

function formatDate(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}
