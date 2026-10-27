import { prisma } from "@/lib/prisma";

export async function getOutreachWorkspaceData(options?: {
  companyId?: string;
  status?: string;
  due?: "all" | "due" | "overdue" | "upcoming";
  referenceDate?: Date;
}) {
  const referenceDate = options?.referenceDate ?? new Date();
  const [companies, contacts, opportunities, outreach] = await Promise.all([
    prisma.company.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: { id: true, name: true, status: true },
    }),
    prisma.contact.findMany({
      where: options?.companyId ? { companyId: options.companyId } : undefined,
      orderBy: [{ doNotContact: "asc" }, { name: "asc" }],
      select: {
        id: true,
        companyId: true,
        name: true,
        role: true,
        profileUrl: true,
        contactMethod: true,
        doNotContact: true,
        relevanceNotes: true,
        company: { select: { id: true, name: true, status: true } },
      },
    }),
    prisma.opportunity.findMany({
      where: {
        ...(options?.companyId ? { companyId: options.companyId } : {}),
        status: { not: "archived" },
      },
      orderBy: [{ priorityScore: "desc" }, { updatedAt: "desc" }],
      include: {
        company: { select: { id: true, name: true, status: true } },
        evidenceLinks: {
          orderBy: { linkedAt: "asc" },
          take: 3,
          include: {
            evidence: {
              select: {
                excerpt: true,
                observedAt: true,
                source: { select: { title: true, url: true } },
              },
            },
          },
        },
      },
    }),
    prisma.outreach.findMany({
      where: {
        ...(options?.companyId ? { contact: { companyId: options.companyId } } : {}),
        ...(options?.status && options.status !== "all" ? { status: options.status } : {}),
      },
      orderBy: [{ followUpAt: "asc" }, { updatedAt: "desc" }],
      include: {
        contact: { include: { company: { select: { id: true, name: true, status: true } } } },
        opportunity: { include: { company: { select: { id: true, name: true, status: true } } } },
      },
    }),
  ]);

  const filteredOutreach = outreach.filter((record) => {
    if (!options?.due || options.due === "all" || !record.followUpAt)
      return options?.due === "overdue" ? false : true;
    const diff = record.followUpAt.getTime() - referenceDate.getTime();
    const day = 24 * 60 * 60 * 1000;
    if (options.due === "overdue") return diff < 0;
    if (options.due === "due") return diff >= 0 && diff <= day;
    return diff > day;
  });

  return {
    companies,
    contacts,
    opportunities,
    outreach: filteredOutreach.map((record) => ({
      ...record,
      overdue: Boolean(record.followUpAt && record.followUpAt.getTime() < referenceDate.getTime()),
    })),
  };
}
