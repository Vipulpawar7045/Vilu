import { prisma } from "@/lib/prisma";

export async function getContactWorkspaceData(companyId?: string) {
  const [companies, contacts] = await Promise.all([
    prisma.company.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: { id: true, name: true, status: true },
    }),
    prisma.contact.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: [{ doNotContact: "asc" }, { updatedAt: "desc" }, { name: "asc" }],
      include: {
        company: { select: { id: true, name: true, status: true } },
        _count: { select: { outreach: true } },
      },
    }),
  ]);

  return { companies, contacts };
}
