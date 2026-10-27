import { prisma } from "@/lib/prisma";

export async function getEvidenceWorkspaceData(companyId?: string) {
  const [companies, allSources, evidence] = await Promise.all([
    prisma.company.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: { id: true, name: true, status: true },
    }),
    prisma.source.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { evidence: true } },
      },
    }),
    prisma.evidence.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: [{ observedAt: "desc" }, { updatedAt: "desc" }],
      include: {
        company: { select: { id: true, name: true } },
        source: {
          select: {
            id: true,
            url: true,
            title: true,
            sourceType: true,
            accessibilityStatus: true,
          },
        },
      },
    }),
  ]);

  const sources = companyId
    ? allSources.filter((source) => source.companyId === companyId)
    : allSources;
  return { companies, sources, sourceOptions: allSources, evidence };
}
