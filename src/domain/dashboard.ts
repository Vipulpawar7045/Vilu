import type { ConfidenceLevel, FreshnessLabel } from "@/domain/rules";

export type DashboardOpportunity = {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  hypothesis: string;
  category: string;
  status: string;
  freshnessLabel: FreshnessLabel;
  confidence: ConfidenceLevel;
  priorityScore: number;
  lastVerifiedAt: Date | string | null;
  updatedAt: Date | string;
  needsVerification: boolean;
  evidenceCount: number;
};

export type DashboardOpportunityFilters = {
  freshness?: FreshnessLabel | "all";
  confidence?: ConfidenceLevel | "all";
  category?: string | "all";
  companyId?: string | "all";
  status?: string | "all";
  sort?: "freshness" | "priority" | "confidence" | "last-verified";
};

const freshnessRank: Record<FreshnessLabel, number> = {
  Hot: 0,
  Recent: 1,
  Aging: 2,
  Historical: 3,
  Undated: 4,
};

const confidenceRank: Record<ConfidenceLevel, number> = { High: 0, Medium: 1, Low: 2 };

export function filterAndSortDashboardOpportunities(
  opportunities: DashboardOpportunity[],
  filters: DashboardOpportunityFilters = {},
): DashboardOpportunity[] {
  const filtered = opportunities.filter((opportunity) => {
    if (
      filters.freshness &&
      filters.freshness !== "all" &&
      opportunity.freshnessLabel !== filters.freshness
    )
      return false;
    if (
      filters.confidence &&
      filters.confidence !== "all" &&
      opportunity.confidence !== filters.confidence
    )
      return false;
    if (filters.category && filters.category !== "all" && opportunity.category !== filters.category)
      return false;
    if (
      filters.companyId &&
      filters.companyId !== "all" &&
      opportunity.companyId !== filters.companyId
    )
      return false;
    if (filters.status && filters.status !== "all") {
      if (filters.status === "active" && ["resolved", "archived"].includes(opportunity.status))
        return false;
      if (filters.status === "needs-verification" && !opportunity.needsVerification) return false;
      if (
        !["active", "needs-verification"].includes(filters.status) &&
        opportunity.status !== filters.status
      )
        return false;
    }
    return true;
  });

  return filtered.sort((left, right) => {
    const sort = filters.sort ?? "freshness";
    if (sort === "priority" && right.priorityScore !== left.priorityScore)
      return right.priorityScore - left.priorityScore;
    if (
      sort === "confidence" &&
      confidenceRank[left.confidence] !== confidenceRank[right.confidence]
    )
      return confidenceRank[left.confidence] - confidenceRank[right.confidence];
    if (sort === "last-verified") {
      const leftDate = dateValue(left.lastVerifiedAt);
      const rightDate = dateValue(right.lastVerifiedAt);
      if (rightDate !== leftDate) return rightDate - leftDate;
    }
    if (
      sort === "freshness" &&
      freshnessRank[left.freshnessLabel] !== freshnessRank[right.freshnessLabel]
    )
      return freshnessRank[left.freshnessLabel] - freshnessRank[right.freshnessLabel];
    if (right.priorityScore !== left.priorityScore) return right.priorityScore - left.priorityScore;
    return dateValue(right.updatedAt) - dateValue(left.updatedAt);
  });
}

function dateValue(value: Date | string | null): number {
  return value ? new Date(value).getTime() : 0;
}
