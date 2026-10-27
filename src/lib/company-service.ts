import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const companyListSelect = {
  id: true,
  name: true,
  websiteUrl: true,
  industry: true,
  companyType: true,
  sizeEstimate: true,
  location: true,
  priority: true,
  status: true,
  notes: true,
  lastResearchedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      sources: true,
      evidence: true,
      opportunities: true,
      contacts: true,
    },
  },
} satisfies Prisma.CompanySelect;

export type CompanyListItem = Prisma.CompanyGetPayload<{
  select: typeof companyListSelect;
}>;

export async function listCompanies(options?: {
  query?: string;
  status?: "active" | "archived" | "all";
}) {
  const query = options?.query?.trim();
  const status = options?.status ?? "active";

  return prisma.company.findMany({
    where: {
      ...(status === "all" ? {} : { status }),
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { websiteUrl: { contains: query } },
              { industry: { contains: query } },
              { location: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }, { name: "asc" }],
    select: companyListSelect,
  });
}

export async function getCompany(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: {
      sources: {
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, url: true, sourceType: true, lastCheckedAt: true },
      },
      evidence: {
        orderBy: { observedAt: "desc" },
        take: 10,
        select: {
          id: true,
          excerpt: true,
          observedAt: true,
          lastVerifiedAt: true,
          confidence: true,
          notes: true,
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
      },
      _count: {
        select: {
          sources: true,
          evidence: true,
          opportunities: true,
          contacts: true,
        },
      },
    },
  });
}
