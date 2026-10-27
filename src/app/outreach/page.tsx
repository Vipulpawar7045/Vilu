import { io } from "next/cache";
import { Suspense } from "react";

import {
  OutreachWorkspace,
  type OutreachCompanyOption,
  type OutreachContactOption,
  type OutreachOpportunityOption,
  type OutreachView,
} from "@/components/outreach-workspace";
import { WorkspacePage } from "@/components/workspace-page";
import { getOutreachWorkspaceData } from "@/lib/outreach-service";

export default function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string | string[]; contactId?: string | string[] }>;
}) {
  return (
    <WorkspacePage
      eyebrow="Personal follow-up"
      title="Outreach"
      description="Draft, review, and track thoughtful messages without automatically sending or tagging anyone."
    >
      <Suspense fallback={<p className="text-sm text-[#748078]">Loading outreach...</p>}>
        <OutreachContent searchParams={searchParams} />
      </Suspense>
    </WorkspacePage>
  );
}

async function OutreachContent({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string | string[]; contactId?: string | string[] }>;
}) {
  await io();
  const params = await searchParams;
  const companyId = first(params.companyId);
  const contactId = first(params.contactId);
  const data = await getOutreachWorkspaceData({ companyId });
  const companies: OutreachCompanyOption[] = data.companies;
  const contacts: OutreachContactOption[] = data.contacts;
  const opportunities: OutreachOpportunityOption[] = data.opportunities.map((opportunity) => ({
    ...opportunity,
    evidenceLinks: opportunity.evidenceLinks.map(({ evidence }) => ({
      evidence: { ...evidence, observedAt: evidence.observedAt.toISOString() },
    })),
  }));
  const outreach: OutreachView[] = data.outreach.map((record) => ({
    ...record,
    sentAt: record.sentAt?.toISOString() ?? null,
    followUpAt: record.followUpAt?.toISOString() ?? null,
  }));
  return (
    <OutreachWorkspace
      initialCompanies={companies}
      initialContacts={contacts}
      initialOpportunities={opportunities}
      initialOutreach={outreach}
      initialCompanyId={companyId ?? ""}
      initialContactId={contactId ?? ""}
    />
  );
}
function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
