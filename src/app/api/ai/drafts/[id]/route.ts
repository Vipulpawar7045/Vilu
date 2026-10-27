import { NextResponse } from "next/server";

import { isAiDraftStatus } from "@/domain/ai";
import { AiRequestError, updateAiDraft } from "@/lib/ai-service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const value = isRecord(body) ? body : {};
  const draftText = typeof value.draftText === "string" ? value.draftText : undefined;
  const status =
    value.status === undefined ? undefined : isAiDraftStatus(value.status) ? value.status : null;
  if (status === null) {
    return NextResponse.json(
      { errors: { status: "Choose draft, approved, or rejected." } },
      { status: 400 },
    );
  }

  try {
    const draft = await updateAiDraft({ id, draftText, status });
    return NextResponse.json({ draft });
  } catch (error) {
    if (error instanceof AiRequestError) {
      return NextResponse.json({ errors: { [error.field]: error.message } }, { status: 400 });
    }
    return NextResponse.json({ error: "The draft could not be updated." }, { status: 404 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
