import { NextResponse } from "next/server";

import { validateBackup } from "@/lib/backup-service";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, errors: ["Request body must be valid JSON."], summary: {} },
      { status: 400 },
    );
  }
  return NextResponse.json(validateBackup(body));
}
