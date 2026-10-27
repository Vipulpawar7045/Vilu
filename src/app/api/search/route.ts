import { NextResponse } from "next/server";

import { searchWorkspace } from "@/lib/search-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const results = await searchWorkspace(query);
  return NextResponse.json(
    { query, results },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
