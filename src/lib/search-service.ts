import { prisma } from "@/lib/prisma";

export type SearchResult = {
  id: string;
  type: "company" | "source" | "evidence" | "opportunity" | "contact" | "issue-signal";
  title: string;
  summary: string;
  href: string;
  companyName: string;
};

export async function searchWorkspace(query: string): Promise<SearchResult[]> {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];
  const [companies, sources, evidence, opportunities, contacts, issueSignals] = await Promise.all([
    prisma.company.findMany({ take: 500, orderBy: { updatedAt: "desc" } }),
    prisma.source.findMany({
      take: 500,
      include: { company: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.evidence.findMany({
      take: 500,
      include: {
        company: { select: { name: true } },
        source: { select: { title: true, url: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.opportunity.findMany({
      take: 500,
      include: { company: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contact.findMany({
      take: 500,
      include: { company: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.issueSignal.findMany({
      take: 500,
      include: { company: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const matches = (values: Array<string | null | undefined>) =>
    values.some((value) => value?.toLocaleLowerCase().includes(normalized));
  return [
    ...companies
      .filter((company) =>
        matches([
          company.name,
          company.websiteUrl,
          company.industry,
          company.location,
          company.notes,
        ]),
      )
      .map((company) => ({
        id: company.id,
        type: "company" as const,
        title: company.name,
        summary: company.websiteUrl,
        href: `/companies/${company.id}`,
        companyName: company.name,
      })),
    ...sources
      .filter((source) =>
        matches([source.title, source.url, source.sourceType, source.company.name]),
      )
      .map((source) => ({
        id: source.id,
        type: "source" as const,
        title: source.title || source.url,
        summary: `${source.sourceType} · ${source.company.name}`,
        href: `/evidence?companyId=${source.companyId}`,
        companyName: source.company.name,
      })),
    ...evidence
      .filter((record) =>
        matches([
          record.excerpt,
          record.notes,
          record.source.title,
          record.source.url,
          record.company.name,
        ]),
      )
      .map((record) => ({
        id: record.id,
        type: "evidence" as const,
        title: record.excerpt.slice(0, 100),
        summary: `Evidence · ${record.company.name}`,
        href: `/evidence?companyId=${record.companyId}`,
        companyName: record.company.name,
      })),
    ...opportunities
      .filter((opportunity) =>
        matches([
          opportunity.title,
          opportunity.hypothesis,
          opportunity.category,
          opportunity.suggestedSolution,
          opportunity.company.name,
        ]),
      )
      .map((opportunity) => ({
        id: opportunity.id,
        type: "opportunity" as const,
        title: opportunity.title,
        summary: `${opportunity.status} · ${opportunity.company.name}`,
        href: `/opportunities?companyId=${opportunity.companyId}`,
        companyName: opportunity.company.name,
      })),
    ...contacts
      .filter((contact) =>
        matches([
          contact.name,
          contact.role,
          contact.profileUrl,
          contact.relevanceNotes,
          contact.company.name,
        ]),
      )
      .map((contact) => ({
        id: contact.id,
        type: "contact" as const,
        title: contact.name,
        summary: `${contact.role || "Contact"} · ${contact.company.name}`,
        href: `/contacts?companyId=${contact.companyId}`,
        companyName: contact.company.name,
      })),
    ...issueSignals
      .filter((signal) =>
        matches([
          signal.title,
          signal.excerpt,
          signal.neutralSummary,
          signal.sourceUrl,
          signal.sourceType,
          signal.reviewStatus,
          signal.company.name,
        ]),
      )
      .map((signal) => ({
        id: signal.id,
        type: "issue-signal" as const,
        title: signal.title,
        summary: `${signal.reviewStatus} · rank ${signal.rankingScore.toFixed(2)} · ${signal.company.name}`,
        href: `/discovery?companyId=${signal.companyId}`,
        companyName: signal.company.name,
      })),
  ].slice(0, 100);
}
