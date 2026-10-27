import { NextResponse } from "next/server";

import { importBackup, validateBackup } from "@/lib/backup-service";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!isRecord(body) || body.confirm !== true)
    return NextResponse.json({ error: "Import requires explicit confirmation." }, { status: 400 });
  const validation = validateBackup(body.backup);
  if (!validation.valid) return NextResponse.json(validation, { status: 400 });
  try {
    return NextResponse.json({ imported: await importBackup(body.backup) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backup import failed." },
      { status: 400 },
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
