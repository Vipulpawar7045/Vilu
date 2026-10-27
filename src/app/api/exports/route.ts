import { NextResponse } from "next/server";

import { buildBackup, buildCsv } from "@/lib/export-service";

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type");
  if (type === "backup") {
    const backup = await buildBackup();
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="vilu-backup-${dateStamp()}.json"`,
      },
    });
  }
  if (type !== "companies" && type !== "opportunities" && type !== "outreach" && type !== "pilot")
    return NextResponse.json(
      { error: "Choose companies, opportunities, outreach, pilot, or backup." },
      { status: 400 },
    );
  const csv = await buildCsv(type);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vilu-${type}-${dateStamp()}.csv"`,
    },
  });
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}
