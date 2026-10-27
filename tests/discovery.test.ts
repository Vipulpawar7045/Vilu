import { describe, expect, it } from "vitest";

import {
  calculateDiscoveryRankingScore,
  canonicalizeDiscoveryUrl,
  corroborationScore,
  makeDiscoveryGroupKey,
  parseDiscoveryPayload,
  scoreDiscoveryItem,
} from "@/domain/discovery";
import { fetchPublicDiscoverySource, validateDiscoveryUrl } from "@/lib/discovery-service";

describe("public issue discovery", () => {
  it("canonicalizes tracking parameters without changing the public source identity", () => {
    expect(canonicalizeDiscoveryUrl("https://Example.com/issues/42/?utm_source=test#reply")).toBe(
      "https://example.com/issues/42",
    );
  });

  it("parses RSS entries into short, dated review signals", () => {
    const items = parseDiscoveryPayload(
      `<rss><channel><item><title>Users cannot finish setup</title><link>https://example.com/issues/1</link><description><![CDATA[The setup guide stops at step two.]]></description><pubDate>Tue, 27 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>`,
      "rss",
      "https://example.com/issues.xml",
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Users cannot finish setup",
      excerpt: "The setup guide stops at step two.",
      url: "https://example.com/issues/1",
    });
    expect(items[0]?.sourcePublishedAt).toBeInstanceOf(Date);
  });

  it("parses GitHub-style public JSON without collecting author profiles", () => {
    const items = parseDiscoveryPayload(
      JSON.stringify([
        {
          title: "Export fails for large workspaces",
          body: "A customer reports a timeout after selecting a large workspace.",
          html_url: "https://github.com/example/app/issues/7",
          created_at: "2026-10-25T12:00:00.000Z",
          user: { login: "should-not-be-stored" },
        },
      ]),
      "github-json",
      "https://api.github.com/repos/example/app/issues",
    );
    expect(items[0]).toMatchObject({
      title: "Export fails for large workspaces",
      url: "https://github.com/example/app/issues/7",
    });
    expect(JSON.stringify(items[0])).not.toContain("should-not-be-stored");
  });

  it("ignores malformed numeric HTML entities instead of throwing", () => {
    const items = parseDiscoveryPayload(
      "<rss><item><title>Broken &#99999999; entry</title><description>Still reviewable</description></item></rss>",
      "rss",
      "https://example.com/issues.xml",
    );
    expect(items[0]?.title).toBe("Broken entry");
  });

  it("groups repeated complaint wording and exposes the corroboration boundary", () => {
    const first = {
      url: "https://example.com/a",
      title: "Mobile setup is confusing",
      excerpt: "Users cannot finish the setup workflow.",
      sourcePublishedAt: new Date("2026-10-27T12:00:00.000Z"),
      sourceUpdatedAt: null,
    };
    const second = { ...first, url: "https://forum.example.com/thread/2" };
    expect(makeDiscoveryGroupKey(first)).toBe(makeDiscoveryGroupKey(second));
    expect(corroborationScore(1)).toBe(1);
    expect(corroborationScore(2)).toBe(3);
    expect(corroborationScore(3)).toBe(5);
  });

  it("ranks recent, specific, corroborated signals higher with visible components", () => {
    const recent = scoreDiscoveryItem(
      {
        url: "https://github.com/example/app/issues/1",
        title: "Export fails for large workspaces",
        excerpt: "Users report a timeout when exporting a large workspace.",
        sourcePublishedAt: new Date("2026-10-25T12:00:00.000Z"),
        sourceUpdatedAt: null,
      },
      "github",
      3,
      new Date("2026-10-27T12:00:00.000Z"),
    );
    const stale = scoreDiscoveryItem(
      {
        url: "https://example.com/old",
        title: "Maybe an issue",
        excerpt: "There may be a problem.",
        sourcePublishedAt: new Date("2025-01-01T12:00:00.000Z"),
        sourceUpdatedAt: null,
      },
      "forum",
      1,
      new Date("2026-10-27T12:00:00.000Z"),
    );
    expect(recent.rankingScore).toBeGreaterThan(stale.rankingScore);
    expect(calculateDiscoveryRankingScore(recent)).toBe(recent.rankingScore);
    expect(recent.recencyScore).toBe(5);
    expect(recent.corroborationScore).toBe(5);
  });

  it("requires the company domain or a permitted public provider", () => {
    expect(
      validateDiscoveryUrl("https://example.com", "https://example.com/issues.xml", "forum", "rss")
        .success,
    ).toBe(true);
    expect(
      validateDiscoveryUrl(
        "https://example.com",
        "https://not-allowlisted.invalid/issues.xml",
        "forum",
        "rss",
      ).success,
    ).toBe(false);
    expect(
      validateDiscoveryUrl(
        "https://example.com",
        "https://api.github.com/repos/a/b/issues",
        "github",
        "github-json",
      ).success,
    ).toBe(true);
  });

  it("checks robots.txt before fetching a discovery source", async () => {
    let sourceCalls = 0;
    const result = await fetchPublicDiscoverySource(
      "https://example.com",
      "https://example.com/issues.xml",
      "forum",
      "rss",
      {
        minIntervalMs: 0,
        maxRetries: 0,
        fetchImpl: async (input) => {
          const url = typeof input === "string" ? input : input.toString();
          if (url.endsWith("robots.txt"))
            return new Response("User-agent: *\nDisallow: /issues", { status: 200 });
          sourceCalls += 1;
          return new Response("<rss />", { status: 200 });
        },
      },
    );
    expect(result.ok).toBe(false);
    expect(result.blockedByRobots).toBe(true);
    expect(sourceCalls).toBe(0);
  });
});
