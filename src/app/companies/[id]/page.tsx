import Link from "next/link";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { WorkspacePage } from "@/components/workspace-page";
import { getCompany } from "@/lib/company-service";

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<CompanyDetailFallback />}>
      <CompanyDetailContent params={params} />
    </Suspense>
  );
}

async function CompanyDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await io();
  const company = await getCompany(id);

  if (!company) notFound();

  return (
    <WorkspacePage
      eyebrow="Research target"
      title={company.name}
      description="Review the company context and see how its research records connect before adding the next signal."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/companies" className="button-secondary">
            ← All companies
          </Link>
          <a
            href={company.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button-secondary"
          >
            Open website ↗
          </a>
          {company.status === "archived" && (
            <span className="rounded-full bg-[#fff8e8] px-3 py-1.5 text-xs font-bold text-[#9a762c]">
              Archived
            </span>
          )}
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailMetric label="Priority" value={`${company.priority}/5`} />
          <DetailMetric label="Sources" value={String(company._count.sources)} />
          <DetailMetric label="Evidence" value={String(company._count.evidence)} />
          <DetailMetric label="Opportunities" value={String(company._count.opportunities)} />
        </section>

        <section
          aria-label="Company research links"
          className="rounded-3xl border border-[#dce3da] bg-[#e8f2dc]/70 p-5"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6d8849]">
            Connected research
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ResearchLink
              href={`/evidence?companyId=${company.id}`}
              label="Sources & evidence"
              count={company._count.evidence}
            />
            <ResearchLink
              href={`/opportunities?companyId=${company.id}`}
              label="Opportunities"
              count={company._count.opportunities}
            />
            <ResearchLink
              href={`/opportunities?companyId=${company.id}`}
              label="Create opportunity"
            />
            <ResearchLink
              href={`/contacts?companyId=${company.id}`}
              label="Contacts"
              count={company._count.contacts}
            />
            <ResearchLink href={`/outreach?companyId=${company.id}`} label="Outreach" />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-[#dce3da] bg-white/70 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
              Company context
            </p>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <Detail label="Website" value={company.websiteUrl} />
              <Detail label="Industry" value={company.industry} />
              <Detail label="Company type" value={company.companyType} />
              <Detail label="Size estimate" value={company.sizeEstimate} />
              <Detail label="Location" value={company.location} />
              <Detail
                label="Last researched"
                value={
                  company.lastResearchedAt
                    ? formatDate(company.lastResearchedAt)
                    : "Not yet researched"
                }
              />
            </dl>
            <div className="mt-6 border-t border-[#edf0eb] pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a9890]">Notes</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#59685f]">
                {company.notes || "No notes added yet."}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-[#dce3da] bg-white/70 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
              Recent sources
            </p>
            {company.sources.length === 0 ? (
              <p className="mt-5 text-sm leading-6 text-[#748078]">
                No sources linked yet. Source and evidence entry will build on this company record
                next.
              </p>
            ) : (
              <ul className="mt-5 space-y-4">
                {company.sources.map((source) => (
                  <li
                    key={source.id}
                    className="border-b border-[#edf0eb] pb-4 last:border-0 last:pb-0"
                  >
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#344239] underline decoration-[#c7f36b] underline-offset-4 hover:text-[#607a3e]"
                    >
                      {source.title || source.url}
                    </a>
                    <p className="mt-1 text-xs text-[#8a9890]">
                      {source.sourceType} · Last checked{" "}
                      {source.lastCheckedAt ? formatDate(source.lastCheckedAt) : "not checked"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section
          aria-labelledby="recent-evidence-heading"
          className="rounded-3xl border border-[#dce3da] bg-white/70 p-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d965b]">
                What was observed
              </p>
              <h2
                id="recent-evidence-heading"
                className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17201b]"
              >
                Recent evidence
              </h2>
            </div>
            <Link href={`/evidence?companyId=${company.id}`} className="button-secondary">
              Manage evidence
            </Link>
          </div>
          {company.evidence.length === 0 ? (
            <p className="mt-5 text-sm leading-6 text-[#748078]">
              No evidence has been captured for this company yet.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {company.evidence.map((record) => (
                <article
                  key={record.id}
                  className="rounded-2xl border border-[#edf0eb] bg-[#fbfcfa] p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7d965b]">
                    {record.source.title || record.source.sourceType}
                  </p>
                  <blockquote className="mt-3 border-l-2 border-[#c7f36b] pl-3 text-sm leading-6 text-[#344239]">
                    “{record.excerpt}”
                  </blockquote>
                  <p className="mt-3 text-xs text-[#8a9890]">
                    Observed {formatDate(record.observedAt)} · Verified{" "}
                    {record.lastVerifiedAt ? formatDate(record.lastVerifiedAt) : "not yet"} ·
                    Confidence {record.confidence}/5
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspacePage>
  );
}

function CompanyDetailFallback() {
  return (
    <WorkspacePage
      eyebrow="Research target"
      title="Company details"
      description="Loading the company research record..."
    >
      <div className="rounded-3xl border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center text-sm text-[#748078]">
        Loading company details...
      </div>
    </WorkspacePage>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl border border-[#dce3da] bg-white/65 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a9890]">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#17201b]">{value}</p>
    </article>
  );
}

function ResearchLink({ href, label, count }: { href: string; label: string; count?: number }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-[#cbd8c8] bg-white/70 px-3.5 py-2 text-sm font-semibold text-[#536158] transition hover:border-[#8ebd42] hover:bg-white hover:text-[#17201b]"
    >
      {label}
      {count !== undefined ? ` · ${count}` : ""}
    </Link>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a9890]">{label}</dt>
      <dd className="mt-2 text-sm text-[#344239]">{value || "Not set"}</dd>
    </div>
  );
}

function formatDate(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}
