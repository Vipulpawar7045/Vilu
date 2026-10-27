import { summarizePilotEntries } from "@/domain/pilot";
import { prisma } from "@/lib/prisma";

const pilotEntryInclude = {
  company: { select: { id: true, name: true, websiteUrl: true } },
  opportunity: { select: { id: true, companyId: true, title: true, category: true, status: true } },
  outreach: { select: { id: true, status: true, sentAt: true, responseSummary: true } },
} as const;

export async function getPilotWorkspaceData(pilotId?: string) {
  const [pilots, companies, opportunities] = await Promise.all([
    prisma.pilot.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        niche: true,
        targetCompanies: true,
        targetMessages: true,
        status: true,
        startedAt: true,
        endedAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.company.findMany({
      where: { status: "active" },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      select: { id: true, name: true, websiteUrl: true },
    }),
    prisma.opportunity.findMany({
      where: { status: { not: "archived" } },
      orderBy: [{ priorityScore: "desc" }, { updatedAt: "desc" }],
      select: { id: true, companyId: true, title: true, category: true, status: true },
      take: 1000,
    }),
  ]);
  const selectedId =
    pilotId && pilots.some((pilot) => pilot.id === pilotId) ? pilotId : pilots[0]?.id;
  const pilot = selectedId
    ? await prisma.pilot.findUnique({
        where: { id: selectedId },
        include: {
          entries: {
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            take: 1000,
            include: pilotEntryInclude,
          },
        },
      })
    : null;
  const entries = pilot?.entries ?? [];
  const analysis = summarizePilotEntries(
    entries.map((entry) => ({
      sourceCategory: entry.sourceCategory,
      issueCategory: entry.issueCategory,
      messageSentAt: entry.messageSentAt,
      replyStatus: entry.replyStatus as
        "not-contacted" | "no-reply" | "positive" | "negative" | "objection",
      meetingAt: entry.meetingAt,
      outcomeStatus: entry.outcomeStatus as
        | "open"
        | "no-response"
        | "replied"
        | "meeting-booked"
        | "proposal-sent"
        | "won"
        | "lost"
        | "archived",
    })),
    {
      targetCompanies: pilot?.targetCompanies ?? 25,
      targetMessages: pilot?.targetMessages ?? 10,
      researchedCompanies: new Set(entries.map((entry) => entry.companyId)).size,
    },
  );

  return { pilots, pilot, companies, opportunities, entries, analysis };
}
