import { createServer, type Server } from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import {
  classifyCollectionPageType,
  collectPublicPage,
  fetchWithRetry,
  hashContent,
  isAllowedByRobots,
  normalizePageText,
  validateCollectionUrl,
} from "@/lib/collection-service";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
});

describe("public page collection rules", () => {
  it("classifies only the explicit page types and enforces the company domain", () => {
    expect(classifyCollectionPageType("https://example.com/pricing")).toBe("pricing");
    expect(classifyCollectionPageType("https://example.com/docs/getting-started")).toBe(
      "documentation",
    );
    expect(classifyCollectionPageType("https://example.com/blog/launch")).toBeNull();
    expect(validateCollectionUrl("https://example.com", "https://example.com/careers")).toEqual({
      success: true,
      data: { url: "https://example.com/careers", pageType: "careers" },
    });
    expect(validateCollectionUrl("https://example.com", "https://other.example/pricing")).toEqual({
      success: false,
      errors: { url: "The page must use the company website domain allowlist." },
    });
  });

  it("uses the longest robots rule and allows a more specific exception", () => {
    const robots = ["User-agent: *", "Disallow: /", "Allow: /pricing/public"].join("\n");
    expect(isAllowedByRobots("/pricing/public", robots)).toBe(true);
    expect(isAllowedByRobots("/pricing/private", robots)).toBe(false);
  });

  it("retries transient responses with backoff", async () => {
    let calls = 0;
    const waits: number[] = [];
    const response = await fetchWithRetry("https://example.com", {
      fetchImpl: async () => {
        calls += 1;
        return new Response(calls === 1 ? "busy" : "ready", { status: calls === 1 ? 503 : 200 });
      },
      maxRetries: 2,
      baseDelayMs: 7,
      sleep: async (milliseconds) => {
        waits.push(milliseconds);
      },
    });
    expect(response.status).toBe(200);
    expect(calls).toBe(2);
    expect(waits).toEqual([7]);
  });

  it("normalizes readable text and hashes the normalized snapshot", () => {
    const html =
      "<html><head><title>Pricing</title><script>ignore()</script></head><body><h1>Plans<h2>Simple &amp; clear.";
    expect(normalizePageText(html)).toBe("Pricing Plans Simple & clear.");
    expect(normalizePageText("<p>Bad &#99999999; markup")).toBe("Bad markup");
    expect(hashContent("Pricing Plans Simple & clear.")).toHaveLength(64);
  });

  it("collects a local fixture page with a timestamp and content hash", async () => {
    const server = createServer((request, response) => {
      if (request.url === "/robots.txt") {
        response.writeHead(404);
        response.end();
        return;
      }
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        "<html><head><title>Fixture pricing</title></head><body><h1>Plans</h1><p>Local fixture page.</p></body></html>",
      );
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Fixture server did not start.");
    const origin = `http://127.0.0.1:${address.port}`;

    const result = await collectPublicPage(`${origin}/`, `${origin}/pricing`, {
      minIntervalMs: 0,
      maxRetries: 0,
      timeoutMs: 10_000,
    });

    expect(result.ok).toBe(true);
    expect(result.responseStatus).toBe(200);
    expect(result.title).toBe("Fixture pricing");
    expect(result.normalizedText).toContain("Local fixture page.");
    expect(result.contentHash).toHaveLength(64);
    expect(result.fetchedAt).toBeInstanceOf(Date);
  }, 30_000);

  it("stops before the page fetch when robots.txt disallows the path", async () => {
    let pageCalls = 0;
    const result = await collectPublicPage("https://example.com", "https://example.com/pricing", {
      minIntervalMs: 0,
      maxRetries: 0,
      fetchImpl: async () => new Response("User-agent: *\nDisallow: /pricing", { status: 200 }),
      pageFetcher: async () => {
        pageCalls += 1;
        return { status: 200, finalUrl: "https://example.com/pricing", html: "<p>Never used</p>" };
      },
    });
    expect(result.blockedByRobots).toBe(true);
    expect(result.errorMessage).toContain("robots.txt");
    expect(pageCalls).toBe(0);
  });

  it("retries robots.txt through a local mock server", async () => {
    let robotsCalls = 0;
    const server = createServer((request, response) => {
      if (request.url === "/robots.txt") {
        robotsCalls += 1;
        response.writeHead(robotsCalls === 1 ? 503 : 404);
        response.end();
        return;
      }
      response.writeHead(200);
      response.end();
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Fixture server did not start.");
    const origin = `http://127.0.0.1:${address.port}`;

    const result = await collectPublicPage(`${origin}/`, `${origin}/pricing`, {
      maxRetries: 1,
      minIntervalMs: 0,
      sleep: async () => undefined,
      pageFetcher: async () => ({
        status: 200,
        finalUrl: `${origin}/pricing`,
        html: "<h1>Retried fixture</h1>",
      }),
    });
    expect(result.ok).toBe(true);
    expect(robotsCalls).toBe(2);
  });

  it("rejects redirects outside the company allowlist and returns timeouts for review", async () => {
    const redirected = await collectPublicPage(
      "https://example.com",
      "https://example.com/pricing",
      {
        minIntervalMs: 0,
        maxRetries: 0,
        fetchImpl: async () => new Response(null, { status: 404 }),
        pageFetcher: async () => ({
          status: 200,
          finalUrl: "https://outside.example/pricing",
          html: "<h1>Redirected</h1>",
        }),
      },
    );
    expect(redirected.ok).toBe(false);
    expect(redirected.errorMessage).toContain("outside the company domain");

    const timedOut = await collectPublicPage("https://example.com", "https://example.com/status", {
      minIntervalMs: 0,
      maxRetries: 0,
      fetchImpl: async () => new Response(null, { status: 404 }),
      pageFetcher: async () => {
        throw new Error("page timeout");
      },
    });
    expect(timedOut.ok).toBe(false);
    expect(timedOut.errorMessage).toBe("page timeout");
  });

  it("keeps a 404 as a failed review candidate instead of treating it as evidence", async () => {
    const result = await collectPublicPage("https://example.com", "https://example.com/status", {
      minIntervalMs: 0,
      maxRetries: 0,
      fetchImpl: async () => new Response(null, { status: 404 }),
      pageFetcher: async () => ({
        status: 404,
        finalUrl: "https://example.com/status",
        html: "<h1>Missing</h1>",
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.responseStatus).toBe(404);
    expect(result.normalizedText).toBe("Missing");
    expect(result.errorMessage).toContain("HTTP 404");
  });
});
