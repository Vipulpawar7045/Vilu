import type { Prisma } from "@prisma/client";

import { type AiDraftKind, type AiDraftStatus } from "@/domain/ai";
import { prisma } from "@/lib/prisma";

export type AiEvidenceContext = {
  id: string;
  excerpt: string;
  sourceTitle: string | null;
  sourceUrl: string;
  sourcePublishedAt: Date | null;
  sourceUpdatedAt: Date | null;
  observedAt: Date;
  lastVerifiedAt: Date | null;
};

export type AiGenerationRequest = {
  kind: AiDraftKind;
  promptContext: string;
};

export type AiProvider = {
  name: string;
  model?: string;
  generate: (request: AiGenerationRequest) => Promise<unknown>;
};

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "unavailable" | "timeout" | "rate-limited" | "malformed",
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export function buildAiPromptContext(input: {
  kind: AiDraftKind;
  companyName: string;
  opportunityTitle: string;
  hypothesis: string;
  suggestedSolution: string | null;
  contactName?: string | null;
  contactRole?: string | null;
  evidence: AiEvidenceContext[];
}) {
  const evidenceText =
    input.evidence.length === 0
      ? "No evidence records were supplied. State what must be researched before making a claim."
      : input.evidence
          .map(
            (record, index) =>
              `${index + 1}. ${record.excerpt}\n   Source: ${record.sourceTitle || record.sourceUrl}\n   URL: ${record.sourceUrl}\n   Published: ${formatDate(record.sourcePublishedAt)}\n   Source updated: ${formatDate(record.sourceUpdatedAt)}\n   Observed: ${record.observedAt.toISOString()}\n   Verified: ${formatDate(record.lastVerifiedAt)}`,
          )
          .join("\n");

  return [
    `Action: ${input.kind}`,
    `Company: ${input.companyName}`,
    `Opportunity title: ${input.opportunityTitle}`,
    `Current hypothesis: ${input.hypothesis}`,
    `Suggested solution: ${input.suggestedSolution || "Not recorded."}`,
    input.contactName ? `Contact name for a local draft: ${input.contactName}` : "",
    input.contactRole ? `Contact role: ${input.contactRole}` : "",
    "",
    "Evidence context:",
    evidenceText,
    "",
    "Rules: Treat public observations as hypotheses, not proof. Do not invent facts, dates, sources, metrics, or company admissions. Return a draft that requires human review. Do not send a message or change any database status.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function runAiProvider(
  provider: AiProvider,
  request: AiGenerationRequest,
  timeoutMs = 10_000,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      provider.generate(request),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new AiProviderError("The AI provider timed out.", "timeout")),
          timeoutMs,
        );
      }),
    ]);
    if (!isProviderResponse(result)) {
      throw new AiProviderError("The AI provider returned an invalid draft.", "malformed");
    }
    return { text: result.text.trim(), model: result.model ?? provider.model };
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    throw new AiProviderError(
      error instanceof Error ? error.message : "The AI provider is unavailable.",
      "unavailable",
    );
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function getAiProvider(): AiProvider {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase() || "local";
  if (configured === "local") return localDraftProvider;
  throw new AiProviderError(
    `AI provider "${configured}" is not configured. Use AI_PROVIDER=local for offline drafts.`,
    "unavailable",
  );
}

export async function generateAndStoreAiDraft(input: {
  opportunityId: string;
  kind: AiDraftKind;
  contactId?: string | null;
}) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: input.opportunityId },
    include: {
      company: { select: { id: true, name: true } },
      evidenceLinks: {
        orderBy: { linkedAt: "asc" },
        include: {
          evidence: {
            include: {
              source: {
                select: {
                  title: true,
                  url: true,
                  publishedAt: true,
                  sourceUpdatedAt: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!opportunity) throw new AiRequestError("Opportunity could not be found.", "opportunityId");

  let contact: { id: string; name: string; role: string | null } | null = null;
  if (input.contactId) {
    contact = await prisma.contact.findFirst({
      where: { id: input.contactId, companyId: opportunity.companyId },
      select: { id: true, name: true, role: true },
    });
    if (!contact) throw new AiRequestError("Contact does not belong to this company.", "contactId");
  }

  const evidence: AiEvidenceContext[] = opportunity.evidenceLinks.map(({ evidence: record }) => ({
    id: record.id,
    excerpt: record.excerpt,
    sourceTitle: record.source.title,
    sourceUrl: record.source.url,
    sourcePublishedAt: record.source.publishedAt,
    sourceUpdatedAt: record.source.sourceUpdatedAt,
    observedAt: record.observedAt,
    lastVerifiedAt: record.lastVerifiedAt,
  }));
  const promptContext = buildAiPromptContext({
    kind: input.kind,
    companyName: opportunity.company.name,
    opportunityTitle: opportunity.title,
    hypothesis: opportunity.hypothesis,
    suggestedSolution: opportunity.suggestedSolution,
    contactName: contact?.name,
    contactRole: contact?.role,
    evidence,
  });
  const provider = getAiProvider();
  const generated = await runAiProvider(provider, { kind: input.kind, promptContext });
  const draft = await prisma.aiDraft.create({
    data: {
      opportunityId: opportunity.id,
      contactId: contact?.id ?? null,
      kind: input.kind,
      provider: provider.name,
      model: generated.model ?? null,
      promptContext,
      originalText: generated.text,
      draftText: generated.text,
      status: "draft",
      evidenceLinks: { create: evidence.map((record) => ({ evidenceId: record.id })) },
    },
    include: aiDraftInclude,
  });
  return draft;
}

export async function getAiWorkspaceData() {
  const [opportunities, contacts, drafts] = await Promise.all([
    prisma.opportunity.findMany({
      where: { status: { notIn: ["archived", "resolved"] } },
      orderBy: [{ priorityScore: "desc" }, { updatedAt: "desc" }],
      include: {
        company: { select: { id: true, name: true } },
        evidenceLinks: {
          orderBy: { linkedAt: "asc" },
          include: {
            evidence: {
              include: {
                source: {
                  select: { title: true, url: true, publishedAt: true, sourceUpdatedAt: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.contact.findMany({
      where: { company: { status: "active" }, doNotContact: false },
      orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
      select: { id: true, companyId: true, name: true, role: true },
    }),
    prisma.aiDraft.findMany({
      take: 100,
      orderBy: [{ updatedAt: "desc" }],
      include: aiDraftInclude,
    }),
  ]);
  return { opportunities, contacts, drafts };
}

export async function updateAiDraft(input: {
  id: string;
  draftText?: string;
  status?: AiDraftStatus;
}) {
  const draftText = input.draftText?.trim();
  if (draftText !== undefined && (draftText.length === 0 || draftText.length > 10_000)) {
    throw new AiRequestError("Draft text must be between 1 and 10,000 characters.", "draftText");
  }
  const data: Prisma.AiDraftUpdateInput = {};
  if (draftText !== undefined) {
    data.draftText = draftText;
    data.status = "draft";
    data.reviewedAt = null;
  }
  if (input.status) {
    data.status = input.status;
    data.reviewedAt = input.status === "draft" ? null : new Date();
  }
  if (Object.keys(data).length === 0)
    throw new AiRequestError("No draft changes were provided.", "draftText");
  return prisma.aiDraft.update({ where: { id: input.id }, data, include: aiDraftInclude });
}

export class AiRequestError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
    this.name = "AiRequestError";
  }
}

const aiDraftInclude = {
  opportunity: { include: { company: { select: { id: true, name: true } } } },
  contact: { select: { id: true, name: true, role: true } },
  evidenceLinks: {
    include: {
      evidence: {
        include: {
          source: { select: { title: true, url: true, publishedAt: true, sourceUpdatedAt: true } },
        },
      },
    },
  },
} satisfies Prisma.AiDraftInclude;

function isProviderResponse(value: unknown): value is { text: string; model?: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof value.text === "string" &&
    value.text.trim().length > 0
  );
}

const localDraftProvider: AiProvider = {
  name: "local-template",
  model: "review-draft-v1",
  async generate(request) {
    const evidenceLines = request.promptContext
      .split("\n")
      .filter((line) => /^\d+\. /.test(line))
      .slice(0, 3);
    const evidenceSummary =
      evidenceLines.length > 0 ? evidenceLines.join("\n") : "No evidence was provided.";
    const textByKind: Record<AiDraftKind, string> = {
      summary: `Draft summary — needs review\n\nPublic observations to verify:\n${evidenceSummary}\n\nThis is a research aid, not proof of an internal company problem.`,
      hypothesis:
        "Draft hypothesis — needs review\n\nThe available public evidence may indicate an improvement opportunity, but the company’s internal context is not confirmed. Check the latest source and gather missing context before making a claim.",
      classification:
        "Draft classification — needs review\n\nLikely category: documentation, website clarity, onboarding, support, or another category selected by the operator. Confirm the category against the evidence before saving it elsewhere.",
      scores:
        "Draft score guidance — needs review\n\nImpact: assess the plausible business consequence. Evidence: assess recency, specificity, and independence. Solution fit: assess deliverability. Reachability: assess whether a relevant contact is appropriate. Do not treat these suggestions as final scores.",
      solution:
        "Draft solution outline — needs review\n\n1. Re-check the source and reproduce the observation.\n2. Define the smallest practical improvement.\n3. Identify a measurable expected outcome.\n4. Confirm assumptions with the company before presenting the idea.",
      outreach:
        "Draft outreach — needs review\n\nHi there — I noticed a possible improvement opportunity based on public information and prepared a short idea that may be relevant. I’m happy to share it if useful.\n\nPlease personalize this message and verify the evidence before any manual sending. Vilu does not send it automatically.",
      "missing-information":
        "Missing information checklist — needs review\n\n- Confirm the observation is still current.\n- Capture the source and observation dates.\n- Look for an independent supporting signal.\n- Confirm the likely business impact.\n- Identify whether the proposed contact is appropriate and has not opted out.",
    };
    return { text: textByKind[request.kind] };
  },
};

function formatDate(value: Date | null) {
  return value ? value.toISOString() : "Not recorded";
}
