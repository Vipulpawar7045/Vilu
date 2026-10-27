import { io } from "next/cache";
import { Suspense } from "react";

import {
  MonitoringWorkspace,
  type MonitoringCheckView,
  type MonitoringSourceView,
} from "@/components/monitoring-workspace";
import { WorkspacePage } from "@/components/workspace-page";
import { isMonitoringReviewStatus } from "@/domain/monitoring";
import { getMonitoringWorkspaceData } from "@/lib/monitoring-service";

export default function MonitoringPage() {
  return (
    <WorkspacePage
      eyebrow="Currentness controls"
      title="Monitoring"
      description="Re-check high-priority sources, preserve change history, and review alerts before relying on an opportunity again."
    >
      <Suspense fallback={<MonitoringFallback />}>
        <MonitoringContent />
      </Suspense>
    </WorkspacePage>
  );
}

async function MonitoringContent() {
  await io();
  const data = await getMonitoringWorkspaceData();
  const sources: MonitoringSourceView[] = data.sources.map((source) => ({
    ...source,
    lastCheckedAt: source.lastCheckedAt?.toISOString() ?? null,
  }));
  const checks: MonitoringCheckView[] = data.checks.map((check) => ({
    ...check,
    checkedAt: check.checkedAt.toISOString(),
    reviewStatus: isMonitoringReviewStatus(check.reviewStatus) ? check.reviewStatus : "pending",
  }));
  return <MonitoringWorkspace initialSources={sources} initialChecks={checks} />;
}

function MonitoringFallback() {
  return (
    <section className="rounded-[2rem] border border-dashed border-[#cbd8c8] bg-white/50 px-6 py-16 text-center">
      <p className="text-sm text-[#748078]">Loading monitoring queue...</p>
    </section>
  );
}
