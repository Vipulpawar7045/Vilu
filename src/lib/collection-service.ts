import { createHash } from "node:crypto";

import { chromium } from "playwright";

import {
  COLLECTION_REVIEW_STATUSES,
  type CollectionPageType,
  type CollectionReviewStatus,
} from "@/domain/collection";
import { prisma } from "@/lib/prisma";

export {
  COLLECTION_PAGE_TYPES,
  COLLECTION_REVIEW_STATUSES,
  type CollectionPageType,
  type CollectionReviewStatus,
} from "@/domain/collection";

type CollectionValidation =
  | { success: true; data: { url: string; pageType: CollectionPageType } }
  | { success: false; errors: Record<string, string> };

export type PageFetchResult = {
  status: number | null;
  finalUrl: string;
  html: string;
};

export type PageFetcher = (url: string, timeoutMs: number) => Promise<PageFetchResult>;

export type CollectionFetchResult = {
  ok: boolean;
  finalUrl: string;
  responseStatus: number | null;
  title: string | null;
  normalizedText: string | null;
  contentHash: string | null;
  fetchedAt: Date;
  blockedByRobots: boolean;
  errorMessage: string | null;
};

const lastRequestAt = new Map<string, number>();

export function classifyCollectionPageType(value: string): CollectionPageType | null {
  let pathname: string;
  try {
    pathname = new URL(value).pathname.toLowerCase();
  } catch {
    return null;
  }

  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (normalizedPath === "/") return "homepage";
  if (/(^|\/)(pricing|plans)(\/|$)/.test(normalizedPath)) return "pricing";
  if (/(^|\/)(product|features)(\/|$)/.test(normalizedPath)) return "product";
  if (/(^|\/)(docs?|documentation|help|guides?)(\/|$)/.test(normalizedPath)) {
    return "documentation";
  }
  if (/(^|\/)(careers?|jobs?)(\/|$)/.test(normalizedPath)) return "careers";
  if (/(^|\/)(changelog|releases?)(\/|$)/.test(normalizedPath)) return "changelog";
  if (/(^|\/)(status|uptime)(\/|$)/.test(normalizedPath)) return "status";
  return null;
}

export function validateCollectionUrl(
  companyWebsiteUrl: string,
  targetUrl: string,
): CollectionValidation {
  let companyUrl: URL;
  let url: URL;
  try {
    companyUrl = new URL(companyWebsiteUrl);
    url = new URL(targetUrl.trim());
  } catch {
    return { success: false, errors: { url: "Enter a valid HTTP or HTTPS page URL." } };
  }

  if (!isHttpUrl(companyUrl) || !isHttpUrl(url)) {
    return { success: false, errors: { url: "Only HTTP and HTTPS pages can be collected." } };
  }

  if (url.username || url.password) {
    return { success: false, errors: { url: "URLs with embedded credentials are not allowed." } };
  }

  if (normalizeHost(url.hostname) !== normalizeHost(companyUrl.hostname)) {
    return {
      success: false,
      errors: { url: "The page must use the company website domain allowlist." },
    };
  }

  if (companyUrl.port && url.port !== companyUrl.port) {
    return { success: false, errors: { url: "The page must use the company website port." } };
  }

  const normalizedUrl = normalizeCollectionUrl(url);
  const pageType = classifyCollectionPageType(normalizedUrl);
  if (!pageType) {
    return {
      success: false,
      errors: {
        url: "This page type is not allowlisted. Use a homepage, pricing, product, documentation, careers, changelog, or status page.",
      },
    };
  }

  return { success: true, data: { url: normalizedUrl, pageType } };
}

export function parseRobotsRules(robotsText: string): { allow: string[]; disallow: string[] } {
  const allow: string[] = [];
  const disallow: string[] = [];
  let appliesToVilu = false;
  let hasUserAgent = false;

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0]?.trim() ?? "";
    if (!line) {
      appliesToVilu = false;
      hasUserAgent = false;
      continue;
    }

    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (directive === "user-agent") {
      hasUserAgent = true;
      appliesToVilu = value === "*" || value.toLowerCase().includes("vilu");
      continue;
    }

    if (!hasUserAgent || !appliesToVilu || !value) continue;
    if (directive === "allow") allow.push(value);
    if (directive === "disallow") disallow.push(value);
  }

  return { allow, disallow };
}

export function isAllowedByRobots(pathname: string, robotsText: string): boolean {
  const rules = parseRobotsRules(robotsText);
  const matchingAllow = longestMatchingRule(pathname, rules.allow);
  const matchingDisallow = longestMatchingRule(pathname, rules.disallow);
  if (!matchingDisallow) return true;
  return matchingAllow.length >= matchingDisallow.length;
}

export async function fetchWithRetry(
  input: string,
  options: {
    fetchImpl?: typeof fetch;
    maxRetries?: number;
    timeoutMs?: number;
    sleep?: (milliseconds: number) => Promise<void>;
    baseDelayMs?: number;
  } = {},
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRetries = options.maxRetries ?? 2;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const sleep = options.sleep ?? delay;
  const baseDelayMs = options.baseDelayMs ?? 250;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(fetchImpl, input, timeoutMs);
      if (!isRetryableStatus(response.status) || attempt === maxRetries) return response;
      await sleep(retryDelay(response, attempt, baseDelayMs));
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) throw error;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed.");
}

export async function collectPublicPage(
  companyWebsiteUrl: string,
  targetUrl: string,
  options: {
    fetchImpl?: typeof fetch;
    pageFetcher?: PageFetcher;
    sleep?: (milliseconds: number) => Promise<void>;
    now?: () => Date;
    minIntervalMs?: number;
    maxRetries?: number;
    timeoutMs?: number;
  } = {},
): Promise<CollectionFetchResult & { pageType: CollectionPageType }> {
  const validation = validateCollectionUrl(companyWebsiteUrl, targetUrl);
  if (!validation.success) throw new CollectionInputError(validation.errors);

  const { url, pageType } = validation.data;
  const fetchedAt = options.now?.() ?? new Date();
  const timeoutMs = options.timeoutMs ?? 10_000;
  const sleep = options.sleep ?? delay;
  const hostKey = new URL(url).host;
  await waitForRateLimit(hostKey, options.minIntervalMs ?? 750, sleep);

  try {
    const robotsUrl = `${new URL(url).origin}/robots.txt`;
    const robotsResponse = await fetchWithRetry(robotsUrl, {
      fetchImpl: options.fetchImpl,
      maxRetries: options.maxRetries ?? 2,
      timeoutMs,
      sleep,
    });

    if (robotsResponse.status >= 200 && robotsResponse.status < 300) {
      if (
        robotsResponse.url &&
        normalizeHost(new URL(robotsResponse.url).hostname) !== normalizeHost(new URL(url).hostname)
      ) {
        return collectionResult({
          pageType,
          fetchedAt,
          finalUrl: url,
          responseStatus: robotsResponse.status,
          errorMessage:
            "Collection stopped because robots.txt redirected outside the company domain.",
          blockedByRobots: true,
        });
      }
      const robotsText = await robotsResponse.text();
      if (!isAllowedByRobots(new URL(url).pathname, robotsText)) {
        return collectionResult({
          pageType,
          fetchedAt,
          finalUrl: url,
          responseStatus: null,
          errorMessage: "Collection was blocked by the domain robots.txt policy.",
          blockedByRobots: true,
        });
      }
    } else if (robotsResponse.status !== 404) {
      return collectionResult({
        pageType,
        fetchedAt,
        finalUrl: url,
        responseStatus: robotsResponse.status,
        errorMessage: "Collection stopped because robots.txt could not be checked safely.",
        blockedByRobots: true,
      });
    }

    const pageFetcher = options.pageFetcher ?? fetchPageWithPlaywright;
    const pageResult = await fetchPageWithRetries(pageFetcher, url, {
      timeoutMs,
      maxRetries: options.maxRetries ?? 2,
      sleep,
    });

    const finalValidation = validateCollectionUrl(companyWebsiteUrl, pageResult.finalUrl);
    if (!finalValidation.success) {
      return collectionResult({
        pageType,
        fetchedAt,
        finalUrl: pageResult.finalUrl,
        responseStatus: pageResult.status,
        errorMessage:
          "Collection stopped because the page redirected outside the company domain allowlist.",
        blockedByRobots: false,
      });
    }

    const normalizedText = normalizePageText(pageResult.html);
    const contentHash = hashContent(normalizedText);
    const isSuccess =
      pageResult.status !== null && pageResult.status >= 200 && pageResult.status < 400;
    return collectionResult({
      pageType,
      fetchedAt,
      finalUrl: pageResult.finalUrl,
      responseStatus: pageResult.status,
      title: extractTitle(pageResult.html),
      normalizedText,
      contentHash,
      errorMessage: isSuccess
        ? null
        : `The page returned HTTP ${pageResult.status ?? "no status"}.`,
      blockedByRobots: false,
    });
  } catch (error) {
    return collectionResult({
      pageType,
      fetchedAt,
      finalUrl: url,
      responseStatus: null,
      errorMessage: error instanceof Error ? error.message : "The page could not be collected.",
      blockedByRobots: false,
    });
  }
}

export async function getCollectionWorkspaceData() {
  const [companies, candidates] = await Promise.all([
    prisma.company.findMany({
      where: { status: "active" },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      select: { id: true, name: true, websiteUrl: true },
    }),
    prisma.collectionCandidate.findMany({
      take: 100,
      orderBy: [{ reviewStatus: "asc" }, { fetchedAt: "desc" }],
      include: { company: { select: { id: true, name: true } } },
    }),
  ]);
  return { companies, candidates };
}

export async function collectCompanyPage(companyId: string, targetUrl: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, websiteUrl: true },
  });
  if (!company) throw new CollectionInputError({ companyId: "Company could not be found." });

  const validation = validateCollectionUrl(company.websiteUrl, targetUrl);
  if (!validation.success) throw new CollectionInputError(validation.errors);

  const result = await collectPublicPage(company.websiteUrl, validation.data.url);
  const previous = await prisma.collectionCandidate.findFirst({
    where: { companyId, url: validation.data.url },
    orderBy: { fetchedAt: "desc" },
    select: { contentHash: true },
  });
  const changeStatus = result.blockedByRobots
    ? "blocked"
    : !result.ok
      ? "failed"
      : !previous?.contentHash
        ? "new"
        : previous.contentHash === result.contentHash
          ? "unchanged"
          : "changed";
  const reviewStatus: CollectionReviewStatus =
    changeStatus === "unchanged" ? "not-needed" : "pending";

  const candidate = await prisma.collectionCandidate.create({
    data: {
      companyId,
      url: validation.data.url,
      pageType: validation.data.pageType,
      title: result.title,
      fetchedAt: result.fetchedAt,
      responseStatus: result.responseStatus,
      contentHash: result.contentHash,
      previousHash: previous?.contentHash ?? null,
      normalizedText: result.normalizedText,
      changeStatus,
      reviewStatus,
      errorMessage: result.errorMessage,
    },
    include: { company: { select: { id: true, name: true } } },
  });

  return { candidate, result };
}

export function isCollectionReviewStatus(value: unknown): value is CollectionReviewStatus {
  return (
    typeof value === "string" &&
    COLLECTION_REVIEW_STATUSES.includes(value as CollectionReviewStatus)
  );
}

export class CollectionInputError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super("Collection input is invalid.");
    this.name = "CollectionInputError";
  }
}

function collectionResult(input: {
  pageType: CollectionPageType;
  fetchedAt: Date;
  finalUrl: string;
  responseStatus: number | null;
  title?: string | null;
  normalizedText?: string | null;
  contentHash?: string | null;
  errorMessage: string | null;
  blockedByRobots: boolean;
}): CollectionFetchResult & { pageType: CollectionPageType } {
  const normalizedText = input.normalizedText ?? null;
  return {
    pageType: input.pageType,
    ok: input.errorMessage === null,
    finalUrl: input.finalUrl,
    responseStatus: input.responseStatus,
    title: input.title ?? null,
    normalizedText,
    contentHash: input.contentHash ?? (normalizedText ? hashContent(normalizedText) : null),
    fetchedAt: input.fetchedAt,
    blockedByRobots: input.blockedByRobots,
    errorMessage: input.errorMessage,
  };
}

async function fetchPageWithPlaywright(url: string, timeoutMs: number): Promise<PageFetchResult> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ userAgent: "ViluResearchBot/0.1" });
    const page = await context.newPage();
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() === "document") {
        await route.continue();
      } else {
        await route.abort();
      }
    });
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    const html = await page.content();
    return { status: response?.status() ?? null, finalUrl: page.url(), html };
  } finally {
    await browser.close();
  }
}

async function fetchPageWithRetries(
  pageFetcher: PageFetcher,
  url: string,
  options: {
    timeoutMs: number;
    maxRetries: number;
    sleep: (milliseconds: number) => Promise<void>;
  },
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    try {
      const result = await pageFetcher(url, options.timeoutMs);
      if (
        result.status === null ||
        !isRetryableStatus(result.status) ||
        attempt === options.maxRetries
      )
        return result;
      await options.sleep(250 * 2 ** attempt);
    } catch (error) {
      lastError = error;
      if (attempt === options.maxRetries) throw error;
      await options.sleep(250 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Page collection failed.");
}

async function fetchWithTimeout(fetchImpl: typeof fetch, input: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForRateLimit(
  host: string,
  minIntervalMs: number,
  sleep: (milliseconds: number) => Promise<void>,
) {
  const previous = lastRequestAt.get(host);
  if (previous !== undefined) {
    const remaining = minIntervalMs - (Date.now() - previous);
    if (remaining > 0) await sleep(remaining);
  }
  lastRequestAt.set(host, Date.now());
}

function normalizeCollectionUrl(url: URL) {
  url.hash = "";
  url.pathname = url.pathname.replace(/\/{2,}/g, "/");
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

function normalizeHost(host: string) {
  return host.toLowerCase().replace(/^www\./, "");
}

function isHttpUrl(url: URL) {
  return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
}

function longestMatchingRule(pathname: string, rules: string[]) {
  return (
    rules.filter((rule) => pathname.startsWith(rule)).sort((a, b) => b.length - a.length)[0] ?? ""
  );
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function retryDelay(response: Response, attempt: number, baseDelayMs: number) {
  const retryAfter = response.headers.get("retry-after");
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  return Number.isFinite(seconds) ? Math.min(seconds * 1000, 10_000) : baseDelayMs * 2 ** attempt;
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match
    ? decodeHtmlEntities(match[1] ?? "")
        .replace(/\s+/g, " ")
        .trim()
    : "";
  return title || null;
}

export function normalizePageText(html: string) {
  const withoutNonContent = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const text = decodeHtmlEntities(withoutNonContent).replace(/\s+/g, " ").trim();
  return text.slice(0, 12_000);
}

export function hashContent(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => safeCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code: string) =>
      safeCodePoint(Number.parseInt(code, 16)),
    );
}

function safeCodePoint(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff
    ? String.fromCodePoint(value)
    : " ";
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
