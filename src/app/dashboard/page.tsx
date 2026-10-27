import { io } from "next/cache";
import { Suspense } from "react";

import {
  DashboardWorkspace,
  type DashboardCompanyView,
  type DashboardFollowUpView,
  type DashboardOpportunityView,
} from "@/components/dashboard-workspace";
import { WorkspacePage } from "@/components/workspace-page";
import { getDashboardData } from "@/lib/dashboard-service";

export default function DashboardPage() {
  return (
    <WorkspacePage
      eyebrow="Overview"
      title="Your research radar"
      description="Keep the freshest opportunities, verification work, and personal follow-ups in one place."
    >
      <Suspense fallback={<p className="text-sm text-[#748078]">Loading your research radar...</p>}>
        <DashboardContent />
      </Suspense>
    </WorkspacePage>
  );
}

async function DashboardContent() {
  await io();
  const data = await getDashboardData();
  const opportunities: DashboardOpportunityView[] = data.opportunities.map((opportunity) => ({
    ...opportunity,
    lastVerifiedAt: opportunity.lastVerifiedAt?.toISOString() ?? null,
    updatedAt: new Date(opportunity.updatedAt).toISOString(),
  }));
  const followUps: DashboardFollowUpView[] = data.followUps.map((followUp) => ({
    ...followUp,
    followUpAt: followUp.followUpAt?.toISOString() ?? null,
  }));
  const companies: DashboardCompanyView[] = data.companies.map((company) => ({
    ...company,
    lastResearchedAt: company.lastResearchedAt?.toISOString() ?? null,
  }));

  return (
    <DashboardWorkspace
      initialData={{
        opportunities,
        followUps,
        companies,
        metrics: data.metrics,
        categoryCounts: data.categoryCounts,
        statusCounts: data.statusCounts,
        sections: {
          hotRecent: mapSection(data.sections.hotRecent),
          needsVerification: mapSection(data.sections.needsVerification),
          staleSoon: mapSection(data.sections.staleSoon),
          readyForOutreach: mapSection(data.sections.readyForOutreach),
          recentlyChanged: mapSection(data.sections.recentlyChanged),
          monitoringAlerts: data.sections.monitoringAlerts.map((alert) => ({
            ...alert,
            checkedAt: alert.checkedAt.toISOString(),
          })),
        },
      }}
    />
  );

  function mapSection(section: typeof data.opportunities): DashboardOpportunityView[] {
    return section.map((opportunity) => ({
      ...opportunity,
      lastVerifiedAt: opportunity.lastVerifiedAt?.toISOString() ?? null,
      updatedAt: new Date(opportunity.updatedAt).toISOString(),
    }));
  }
}
