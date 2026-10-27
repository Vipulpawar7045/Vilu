import type { ConfidenceLevel, FreshnessLabel } from "@/domain/rules";

import { getOpportunityQueue } from "@/lib/opportunity-service";
import { getOutreachWorkspaceData } from "@/lib/outreach-service";
import { getMonitoringAlerts } from "@/lib/monitoring-service";
import { prisma } from "@/lib/prisma";

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData(referenceDate = new Date()) {
  const [opportunities, companies, outreachData, monitoringAlerts] = await Promise.all([
    getOpportunityQueue({ status: "all", referenceDate }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true, lastResearchedAt: true },
    }),
    getOutreachWorkspaceData({ due: "all", referenceDate }),
    getMonitoringAlerts(),
  ]);

  const dashboardOpportunities = opportunities
    .filter((opportunity) => opportunity.company.status !== "archived")
    .map((opportunity) => ({
      id: opportunity.id,
      companyId: opportunity.companyId,
      companyName: opportunity.company.name,
      title: opportunity.title,
      hypothesis: opportunity.hypothesis,
      category: opportunity.category,
      status: opportunity.status,
      freshnessLabel: opportunity.freshnessLabel as FreshnessLabel,
      confidence: opportunity.confidence as ConfidenceLevel,
      priorityScore: opportunity.priorityScore,
      lastVerifiedAt: opportunity.lastVerifiedAt,
      updatedAt: opportunity.updatedAt,
      needsVerification: opportunity.needsVerification,
      evidenceCount: opportunity._count.evidenceLinks,
    }));

  const active = dashboardOpportunities.filter(
    (opportunity) => !["resolved", "archived"].includes(opportunity.status),
  );
  const startOfToday = new Date(referenceDate);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const followUps = outreachData.outreach.map((record) => ({
    id: record.id,
    opportunityId: record.opportunityId,
    opportunityTitle: record.opportunity.title,
    companyName: record.contact.company.name,
    contactName: record.contact.name,
    status: record.status,
    followUpAt: record.followUpAt,
    overdue: Boolean(record.followUpAt && record.followUpAt < startOfToday),
  }));

  const categoryCounts = countBy(active, (opportunity) => opportunity.category);
  const statusCounts = countBy(dashboardOpportunities, (opportunity) => opportunity.status);
  const dashboardMonitoringAlerts = monitoringAlerts.map((check) => ({
    id: check.id,
    sourceId: check.sourceId,
    sourceTitle: check.source.title,
    sourceUrl: check.source.url,
    companyName: check.source.company.name,
    resultStatus: check.resultStatus,
    checkedAt: check.checkedAt,
  }));
  const recentlyChanged = dashboardOpportunities.filter(
    (opportunity) =>
      referenceDate.getTime() - new Date(opportunity.updatedAt).getTime() <=
      7 * 24 * 60 * 60 * 1000,
  );

  return {
    referenceDate,
    companies,
    opportunities: dashboardOpportunities,
    followUps,
    metrics: {
      hotRecent: active.filter((opportunity) =>
        ["Hot", "Recent"].includes(opportunity.freshnessLabel),
      ).length,
      needsVerification: active.filter((opportunity) => opportunity.needsVerification).length,
      staleSoon: active.filter((opportunity) => opportunity.freshnessLabel === "Aging").length,
      readyForOutreach: active.filter(
        (opportunity) =>
          opportunity.status === "ready-for-outreach" && !opportunity.needsVerification,
      ).length,
      followUpsToday: followUps.filter(
        (followUp) =>
          followUp.followUpAt &&
          followUp.followUpAt >= startOfToday &&
          followUp.followUpAt < endOfToday,
      ).length,
      overdueFollowUps: followUps.filter((followUp) => followUp.overdue).length,
      companiesResearched: companies.filter((company) => company.lastResearchedAt).length,
      monitoringAlerts: dashboardMonitoringAlerts.length,
    },
    sections: {
      hotRecent: active.filter((opportunity) =>
        ["Hot", "Recent"].includes(opportunity.freshnessLabel),
      ),
      needsVerification: active.filter((opportunity) => opportunity.needsVerification),
      staleSoon: active.filter((opportunity) => opportunity.freshnessLabel === "Aging"),
      readyForOutreach: active.filter(
        (opportunity) =>
          opportunity.status === "ready-for-outreach" && !opportunity.needsVerification,
      ),
      recentlyChanged,
      monitoringAlerts: dashboardMonitoringAlerts,
    },
    categoryCounts,
    statusCounts,
  };
}

function countBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const value = key(item);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}
