import { io } from "next/cache";
import { Suspense } from "react";

import {
  ContactWorkspace,
  type ContactCompanyView,
  type ContactView,
} from "@/components/contact-workspace";
import { WorkspacePage } from "@/components/workspace-page";
import { getContactWorkspaceData } from "@/lib/contact-service";

export default function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string | string[] }>;
}) {
  return (
    <WorkspacePage
      eyebrow="People and relevance"
      title="Contacts"
      description="Track the right person for each company without turning research into bulk outreach."
    >
      <Suspense fallback={<p className="text-sm text-[#748078]">Loading contacts...</p>}>
        <ContactsContent searchParams={searchParams} />
      </Suspense>
    </WorkspacePage>
  );
}

async function ContactsContent({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string | string[] }>;
}) {
  await io();
  const params = await searchParams;
  const companyId = Array.isArray(params.companyId) ? params.companyId[0] : params.companyId;
  const data = await getContactWorkspaceData(companyId);
  const companies: ContactCompanyView[] = data.companies;
  const contacts: ContactView[] = data.contacts;
  return (
    <ContactWorkspace
      initialCompanies={companies}
      initialContacts={contacts}
      initialCompanyId={companyId ?? ""}
    />
  );
}
