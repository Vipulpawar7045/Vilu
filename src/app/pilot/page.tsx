import { io } from "next/cache";
import { Suspense } from "react";

import {
  PilotWorkspace,
  type PilotCompanyOption,
  type PilotEntryView,
  type PilotOpportunityOption,
  type PilotSummary,
  type PilotView,
} from "@/components/pilot-workspace";
import { WorkspacePage } from "@/components/workspace-page";
import { getPilotWorkspaceData } from "@/lib/pilot-service";

export default function PilotPage({
  searchParams,
}: {
  searchParams: Promise<{ pilotId?: string | string[] }>;
}) {
  return (
    <WorkspacePage
      eyebrow="Real-world validation"
      title="Pilot"
      description="Track one focused research cohort, keep every contacted opportunity verifiable, and learn from outcomes without changing ranking rules automatically."
    >
      <Suspense fallback={<p className="text-sm text-[#748078]">Loading pilot workspace...</p>}>
        <PilotContent searchParams={searchParams} />
      </Suspense>
    </WorkspacePage>
  );
}

async function PilotContent({
  searchParams,
}: {
  searchParams: Promise<{ pilotId?: string | string[] }>;
}) {
  await io();
  const params = await searchParams;
  const rawPilotId = params.pilotId;
  const pilotId = Array.isArray(rawPilotId) ? rawPilotId[0] : rawPilotId;
  const data = await getPilotWorkspaceData(pilotId);
  const pilot: PilotView | null = data.pilot
    ? {
        ...data.pilot,
        startedAt: data.pilot.startedAt?.toISOString() ?? null,
        endedAt: data.pilot.endedAt?.toISOString() ?? null,
        createdAt: data.pilot.createdAt.toISOString(),
        updatedAt: data.pilot.updatedAt.toISOString(),
      }
    : null;
  const pilots: PilotView[] = data.pilots.map((item) => ({
    ...item,
    startedAt: item.startedAt?.toISOString() ?? null,
    endedAt: item.endedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));
  const entries: PilotEntryView[] = data.entries.map((entry) => ({
    ...entry,
    evidenceDate: entry.evidenceDate?.toISOString() ?? null,
    observedAt: entry.observedAt?.toISOString() ?? null,
    lastVerifiedAt: entry.lastVerifiedAt?.toISOString() ?? null,
    messageSentAt: entry.messageSentAt?.toISOString() ?? null,
    meetingAt: entry.meetingAt?.toISOString() ?? null,
    outreach: entry.outreach
      ? {
          ...entry.outreach,
          sentAt: entry.outreach.sentAt?.toISOString() ?? null,
        }
      : null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }));
  const summary: PilotSummary = data.analysis;
  return (
    <PilotWorkspace
      initialPilot={pilot}
      initialPilots={pilots}
      initialCompanies={data.companies as PilotCompanyOption[]}
      initialOpportunities={data.opportunities as PilotOpportunityOption[]}
      initialEntries={entries}
      initialAnalysis={summary}
    />
  );
}
