import { NextResponse } from "next/server";

import { isAiDraftKind } from "@/domain/ai";
import {
  AiProviderError,
  AiRequestError,
  generateAndStoreAiDraft,
  getAiWorkspaceData,
} from "@/lib/ai-service";

export async function GET() {
  const data = await getAiWorkspaceData();
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const value = isRecord(body) ? body : {};
  const opportunityId = typeof value.opportunityId === "string" ? value.opportunityId : "";
  const kind = value.kind;
  const contactId = typeof value.contactId === "string" && value.contactId ? value.contactId : null;
  if (!opportunityId || !isAiDraftKind(kind)) {
    return NextResponse.json(
      {
        errors: {
          opportunityId: "Choose an opportunity.",
          kind: "Choose a supported draft action.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const draft = await generateAndStoreAiDraft({ opportunityId, kind, contactId });
    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    if (error instanceof AiRequestError) {
      return NextResponse.json({ errors: { [error.field]: error.message } }, { status: 400 });
    }
    if (error instanceof AiProviderError) {
      const status = error.code === "rate-limited" ? 429 : error.code === "timeout" ? 504 : 503;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "The draft could not be generated." }, { status: 500 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
