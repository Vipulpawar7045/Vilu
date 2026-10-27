import { NextResponse } from "next/server";

import {
  discoverCompanySignals,
  captureIssueSignal,
  DiscoveryInputError,
  getDiscoveryWorkspaceData,
  isDiscoveryAdapter,
  isDiscoveryReviewStatus,
  isDiscoverySourceType,
  type DiscoveryAdapter,
  type DiscoveryReviewStatus,
  type DiscoverySourceType,
} from "@/lib/discovery-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId")?.trim() || undefined;
  const requestedSourceType = searchParams.get("sourceType")?.trim() || "all";
  const sourceType =
    requestedSourceType === "all" || !requestedSourceType
      ? "all"
      : isDiscoverySourceType(requestedSourceType)
        ? requestedSourceType
        : "all";
  const requestedMinimumScore = Number(searchParams.get("minimumScore") ?? "");
  const minimumScore =
    Number.isFinite(requestedMinimumScore) && requestedMinimumScore > 0
      ? Math.min(5, requestedMinimumScore)
      : undefined;
  const requestedStatus = searchParams.get("reviewStatus")?.trim() || "all";
  const reviewStatus =
    requestedStatus === "all" || !requestedStatus
      ? "all"
      : isDiscoveryReviewStatus(requestedStatus)
        ? requestedStatus
        : "all";
  const data = await getDiscoveryWorkspaceData({
    companyId,
    reviewStatus: reviewStatus as DiscoveryReviewStatus | "all",
    sourceType,
    minimumScore,
  });
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const value = isRecord(body) ? body : {};
  const companyId = stringValue(value.companyId);
  const url = stringValue(value.url);
  const sourceType = stringValue(value.sourceType);
  const adapter = stringValue(value.adapter);
  if (value.capture === true) {
    if (!isDiscoverySourceType(sourceType)) {
      return NextResponse.json(
        { errors: { sourceType: "Choose a supported source type." } },
        { status: 400 },
      );
    }
    try {
      const signal = await captureIssueSignal(companyId, {
        url,
        sourceType,
        title: stringValue(value.title),
        excerpt: stringValue(value.excerpt),
        sourcePublishedAt: parseDate(value.sourcePublishedAt),
      });
      return NextResponse.json({ signal }, { status: 201 });
    } catch (error) {
      if (error instanceof DiscoveryInputError) {
        return NextResponse.json({ errors: error.errors }, { status: 400 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "The capture could not be saved." },
        { status: 500 },
      );
    }
  }
  if (!isDiscoverySourceType(sourceType) || !isDiscoveryAdapter(adapter)) {
    return NextResponse.json(
      { errors: { sourceType: "Choose a supported source type and adapter." } },
      { status: 400 },
    );
  }

  try {
    const result = await discoverCompanySignals(
      companyId,
      url,
      sourceType as DiscoverySourceType,
      adapter as DiscoveryAdapter,
    );
    if (!result.result.ok) {
      return NextResponse.json(
        { error: result.result.errorMessage, result },
        { status: result.result.blockedByRobots ? 403 : 502 },
      );
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DiscoveryInputError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "The public source could not be discovered.",
      },
      { status: 500 },
    );
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
