import { NextResponse } from "next/server";

import { getMonitoringWorkspaceData, runMonitoring } from "@/lib/monitoring-service";

export async function GET() {
  const data = await getMonitoringWorkspaceData();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // An empty body means use the default monitoring batch.
  }
  const limit = isRecord(body) && typeof body.limit === "number" ? body.limit : undefined;
  const companyId =
    isRecord(body) && typeof body.companyId === "string" ? body.companyId : undefined;
  try {
    const result = await runMonitoring({ limit, companyId });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Monitoring could not be completed." },
      { status: 500 },
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
