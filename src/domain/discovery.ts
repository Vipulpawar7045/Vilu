import { createHash } from "node:crypto";

export const DISCOVERY_SOURCE_TYPES = [
  "review",
  "forum",
  "github",
  "status",
  "job-posting",
  "feedback",
  "changelog",
  "announcement",
] as const;

export type DiscoverySourceType = (typeof DISCOVERY_SOURCE_TYPES)[number];

export const DISCOVERY_ADAPTERS = ["rss", "github-json"] as const;

export type DiscoveryAdapter = (typeof DISCOVERY_ADAPTERS)[number];

export const DISCOVERY_REVIEW_STATUSES = [
  "discovered",
  "needs-verification",
  "corroborated",
  "rejected",
  "stale",
] as const;

export type DiscoveryReviewStatus = (typeof DISCOVERY_REVIEW_STATUSES)[number];

export type DiscoveryItem = {
  url: string;
  title: string;
  excerpt: string;
  sourcePublishedAt: Date | null;
  sourceUpdatedAt: Date | null;
};

export type DiscoveryScore = {
  recencyScore: number;
  specificityScore: number;
  sourceReliabilityScore: number;
  corroborationScore: number;
  impactScore: number;
  solutionFitScore: number;
  rankingScore: number;
};

export function isDiscoverySourceType(value: unknown): value is DiscoverySourceType {
  return typeof value === "string" && DISCOVERY_SOURCE_TYPES.includes(value as DiscoverySourceType);
}

export function isDiscoveryAdapter(value: unknown): value is DiscoveryAdapter {
  return typeof value === "string" && DISCOVERY_ADAPTERS.includes(value as DiscoveryAdapter);
}

export function isDiscoveryReviewStatus(value: unknown): value is DiscoveryReviewStatus {
  return (
    typeof value === "string" && DISCOVERY_REVIEW_STATUSES.includes(value as DiscoveryReviewStatus)
  );
}

export function canonicalizeDiscoveryUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
      return null;
    }
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || ["ref", "source"].includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeDiscoveryText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateDiscoveryText(value: string, maxLength = 1600): string {
  const normalized = normalizeDiscoveryText(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function neutralizeDiscoverySummary(title: string, excerpt: string): string {
  const subject = truncateDiscoveryText(title || excerpt, 280);
  return subject
    ? `Public source signal to investigate: ${subject}`
    : "Public source signal requires human review before it can support an opportunity hypothesis.";
}

export function makeDiscoveryFingerprint(item: DiscoveryItem): string {
  return createHash("sha256")
    .update(
      `${canonicalizeDiscoveryUrl(item.url) ?? item.url}|${normalizeForGrouping(item.title)}|${item.sourcePublishedAt?.toISOString() ?? ""}`,
    )
    .digest("hex");
}

export function makeDiscoveryGroupKey(item: DiscoveryItem): string {
  return createHash("sha256")
    .update(normalizeForGrouping(`${item.title} ${item.excerpt}`))
    .digest("hex")
    .slice(0, 32);
}

export function sourceReliabilityScore(sourceType: DiscoverySourceType): number {
  if (sourceType === "github" || sourceType === "status") return 4;
  if (sourceType === "review" || sourceType === "job-posting" || sourceType === "changelog")
    return 3;
  if (sourceType === "forum" || sourceType === "feedback") return 2;
  return 3;
}

export function recencyScore(date: Date | null, referenceDate: Date): number {
  if (!date || !isValidDate(date)) return 1;
  const age = Math.max(0, Math.floor((referenceDate.getTime() - date.getTime()) / 86_400_000));
  if (age <= 7) return 5;
  if (age <= 30) return 4;
  if (age <= 90) return 3;
  if (age <= 365) return 2;
  return 1;
}

export function specificityScore(title: string, excerpt: string): number {
  const combined = normalizeDiscoveryText(`${title} ${excerpt}`);
  if (combined.length < 30) return 1;
  if (combined.length < 90) return 2;
  if (combined.length < 220) return 3;
  if (combined.length < 500) return 4;
  return 5;
}

export function impactScore(title: string, excerpt: string): number {
  const combined = normalizeForGrouping(`${title} ${excerpt}`);
  if (
    /(outage|down|broken|cannot|can't|blocked|failed|error|refund|churn|security)/.test(combined)
  ) {
    return 5;
  }
  if (/(slow|confusing|missing|limit|problem|issue|support|bug|difficult)/.test(combined)) return 4;
  return 3;
}

export function solutionFitScore(title: string, excerpt: string): number {
  const combined = normalizeForGrouping(`${title} ${excerpt}`);
  if (
    /(how to|documentation|docs|onboarding|signup|pricing|support|workflow|integration)/.test(
      combined,
    )
  ) {
    return 4;
  }
  return 3;
}

export function corroborationScore(independentSourceCount: number): number {
  if (independentSourceCount >= 3) return 5;
  if (independentSourceCount === 2) return 3;
  return 1;
}

export function calculateDiscoveryRankingScore(
  scores: Omit<DiscoveryScore, "rankingScore">,
): number {
  const weighted =
    scores.recencyScore * 0.25 +
    scores.specificityScore * 0.2 +
    scores.sourceReliabilityScore * 0.2 +
    scores.corroborationScore * 0.2 +
    scores.impactScore * 0.1 +
    scores.solutionFitScore * 0.05;
  return Math.round(weighted * 100) / 100;
}

export function scoreDiscoveryItem(
  item: DiscoveryItem,
  sourceType: DiscoverySourceType,
  independentSources: number,
  referenceDate: Date,
): DiscoveryScore {
  const scores = {
    recencyScore: recencyScore(item.sourcePublishedAt ?? item.sourceUpdatedAt, referenceDate),
    specificityScore: specificityScore(item.title, item.excerpt),
    sourceReliabilityScore: sourceReliabilityScore(sourceType),
    corroborationScore: corroborationScore(independentSources),
    impactScore: impactScore(item.title, item.excerpt),
    solutionFitScore: solutionFitScore(item.title, item.excerpt),
  };
  return { ...scores, rankingScore: calculateDiscoveryRankingScore(scores) };
}

export function parseDiscoveryPayload(
  payload: string,
  adapter: DiscoveryAdapter,
  fallbackUrl: string,
): DiscoveryItem[] {
  if (adapter === "github-json") return parseGithubJson(payload, fallbackUrl);
  return parseRss(payload, fallbackUrl);
}

function parseRss(payload: string, fallbackUrl: string): DiscoveryItem[] {
  const entries = payload.match(/<(item|entry)\b[\s\S]*?<\/(item|entry)>/gi) ?? [];
  return entries
    .map((entry) => {
      const title = readXmlField(entry, "title");
      const excerpt = truncateDiscoveryText(
        readXmlField(entry, "description") ||
          readXmlField(entry, "summary") ||
          readXmlField(entry, "content") ||
          title,
      );
      const url = readXmlLink(entry) || fallbackUrl;
      const published = parseDate(
        readXmlField(entry, "pubDate") || readXmlField(entry, "published"),
      );
      const updated = parseDate(
        readXmlField(entry, "updated") || readXmlField(entry, "lastBuildDate"),
      );
      if (!title && !excerpt) return null;
      return {
        url: canonicalizeDiscoveryUrl(url) ?? fallbackUrl,
        title: truncateDiscoveryText(title || "Untitled public signal", 280),
        excerpt,
        sourcePublishedAt: published,
        sourceUpdatedAt: updated,
      } satisfies DiscoveryItem;
    })
    .filter((item): item is DiscoveryItem => item !== null);
}

function parseGithubJson(payload: string, fallbackUrl: string): DiscoveryItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return [];
  }
  const entries = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.items)
      ? parsed.items
      : [];
  return entries
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const title = typeof entry.title === "string" ? entry.title : "";
      const excerpt = truncateDiscoveryText(
        typeof entry.body === "string"
          ? entry.body
          : typeof entry.description === "string"
            ? entry.description
            : title,
      );
      const url =
        typeof entry.html_url === "string"
          ? entry.html_url
          : typeof entry.url === "string"
            ? entry.url
            : fallbackUrl;
      if (!title && !excerpt) return null;
      return {
        url: canonicalizeDiscoveryUrl(url) ?? fallbackUrl,
        title: truncateDiscoveryText(title || "Untitled public issue", 280),
        excerpt,
        sourcePublishedAt: parseDate(
          typeof entry.created_at === "string" ? entry.created_at : null,
        ),
        sourceUpdatedAt: parseDate(typeof entry.updated_at === "string" ? entry.updated_at : null),
      } satisfies DiscoveryItem;
    })
    .filter((item): item is DiscoveryItem => item !== null);
}

function readXmlField(entry: string, field: string): string {
  const match = entry.match(new RegExp(`<${field}(?:\\s[^>]*)?>([\\s\\S]*?)</${field}>`, "i"));
  return normalizeDiscoveryText(match?.[1] ?? "");
}

function readXmlLink(entry: string): string | null {
  const href = entry.match(/<link(?:\s[^>]*)?\s(?:href|url)=["']([^"']+)["'][^>]*>/i)?.[1];
  if (href) return decodeHtmlEntities(href);
  return entry.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? null;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isValidDate(date) ? date : null;
}

function normalizeForGrouping(value: string): string {
  return normalizeDiscoveryText(value)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => safeCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => safeCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function safeCodePoint(value: number): string {
  return value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}
