import { io } from "next/cache";
import { Suspense } from "react";

import { CompanyWorkspace, type CompanyListItemView } from "@/components/company-workspace";
import { WorkspacePage } from "@/components/workspace-page";
import { listCompanies } from "@/lib/company-service";

export default function CompaniesPage() {
  return (
    <WorkspacePage
      eyebrow="Research targets"
      title="Companies"
      description="Keep the companies you are researching, their context, and the last time you checked them."
    >
      <Suspense fallback={<CompanyListFallback />}>
        <CompaniesContent />
      </Suspense>
    </WorkspacePage>
  );
}

async function CompaniesContent() {
  await io();
  const companies = await listCompanies({ status: "active" });
  const initialCompanies: CompanyListItemView[] = companies.map((company) => ({
    ...company,
    lastResearchedAt: company.lastResearchedAt?.toISOString() ?? null,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  }));

  return <CompanyWorkspace initialCompanies={initialCompanies} />;
}

function CompanyListFallback() {
  return (
    <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
      <p className="text-sm text-[#748078]">Loading companies...</p>
    </section>
  );
}
