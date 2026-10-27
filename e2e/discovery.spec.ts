import { createServer, type Server } from "node:http";

import { expect, test } from "@playwright/test";

test("discovers two permitted source categories and requires review before promotion", async ({
  page,
}) => {
  const fixtureServer = createServer((request, response) => {
    if (request.url === "/robots.txt") {
      response.writeHead(404);
      response.end();
      return;
    }
    if (request.url === "/issues.xml") {
      response.writeHead(200, { "content-type": "application/rss+xml" });
      response.end(
        `<rss><channel><item><title>Users cannot finish setup</title><link>http://127.0.0.1/fixture-review</link><description>Users cannot finish setup workflow.</description><pubDate>Tue, 27 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>`,
      );
      return;
    }
    if (request.url === "/issues.json") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify([
          {
            title: "Users cannot finish setup",
            body: "Users cannot finish setup workflow.",
            html_url: "http://127.0.0.1/fixture-github-issue",
            created_at: "2026-10-26T12:00:00.000Z",
          },
        ]),
      );
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await listen(fixtureServer);

  try {
    const address = fixtureServer.address();
    if (!address || typeof address === "string") throw new Error("Fixture server did not start.");
    const origin = `http://127.0.0.1:${address.port}`;
    const companyResponse = await page.request.post("/api/companies", {
      data: { name: `Discovery Fixture ${Date.now()}`, websiteUrl: origin, priority: 3 },
    });
    expect(companyResponse.ok()).toBe(true);
    const { company } = await companyResponse.json();

    const reviewResponse = await page.request.post("/api/discovery", {
      data: {
        companyId: company.id,
        sourceType: "review",
        adapter: "rss",
        url: `${origin}/issues.xml`,
      },
    });
    expect(reviewResponse.status()).toBe(201);
    const review = await reviewResponse.json();
    expect(review.signals[0].reviewStatus).toBe("discovered");

    const githubResponse = await page.request.post("/api/discovery", {
      data: {
        companyId: company.id,
        sourceType: "github",
        adapter: "github-json",
        url: `${origin}/issues.json`,
      },
    });
    expect(githubResponse.status()).toBe(201);
    const github = await githubResponse.json();
    expect(github.signals[0].independentSourceCount).toBe(2);

    await page.goto(`/discovery?companyId=${company.id}`);
    await expect(page.getByText("Users cannot finish setup").first()).toBeVisible();
    await expect(page.getByText("Independent sources 2").first()).toBeVisible();

    await page.getByRole("button", { name: "Needs verification" }).first().click();
    await page.getByRole("button", { name: "Mark corroborated" }).first().click();
    await page.getByRole("button", { name: "Evidence + opportunity" }).first().click();
    await expect(page.getByText(/Evidence saved and the draft opportunity/)).toBeVisible();

    const evidenceResponse = await page.request.get(`/api/evidence?companyId=${company.id}`);
    expect(evidenceResponse.ok()).toBe(true);
    const evidence = await evidenceResponse.json();
    expect(
      evidence.evidence.some((record: { excerpt: string }) =>
        record.excerpt.includes("setup workflow"),
      ),
    ).toBe(true);
  } finally {
    await close(fixtureServer);
  }
});

test("captures a bounded excerpt, groups a cluster, saves a filter, and reviews a solution match", async ({
  page,
}) => {
  const fixtureServer = createServer((request, response) => {
    if (request.url === "/robots.txt") {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<html><body>Fixture page</body></html>");
  });
  await listen(fixtureServer);

  try {
    const address = fixtureServer.address();
    if (!address || typeof address === "string") throw new Error("Fixture server did not start.");
    const origin = `http://127.0.0.1:${address.port}`;
    const companyResponse = await page.request.post("/api/companies", {
      data: { name: `Intelligence Fixture ${Date.now()}`, websiteUrl: origin, priority: 3 },
    });
    expect(companyResponse.ok()).toBe(true);
    const { company } = await companyResponse.json();

    for (const path of ["/thread-one", "/thread-two"]) {
      const response = await page.request.post("/api/discovery", {
        data: {
          capture: true,
          companyId: company.id,
          url: `${origin}${path}`,
          sourceType: "forum",
          title: "Setup workflow is confusing",
          excerpt: "Users cannot finish the setup workflow without support.",
          sourcePublishedAt: "2026-10-27",
        },
      });
      expect(response.status()).toBe(201);
    }

    const capabilityResponse = await page.request.post("/api/discovery/capabilities", {
      data: {
        name: `Onboarding redesign ${Date.now()}`,
        description: "Improve setup and activation flows.",
        keywords: "setup, onboarding, activation",
        estimatedEffort: "2 weeks",
        expectedOutcome: "More users complete setup",
        nextAction: "Review the setup flow with the operator",
      },
    });
    expect(capabilityResponse.status()).toBe(201);
    const { capability } = await capabilityResponse.json();

    await page.goto(`/discovery?companyId=${company.id}`);
    await expect(page.getByText("Setup workflow is confusing").first()).toBeVisible();
    await expect(page.getByText("Evidence timeline")).toBeVisible();
    await expect(page.getByText("Independent sources 1").first()).toBeVisible();

    const savedSearchName = `Setup review queue ${Date.now()}`;
    const savedSearch = await page.request.post("/api/discovery/saved-searches", {
      data: { name: savedSearchName, companyId: company.id, reviewStatus: "discovered" },
    });
    expect(savedSearch.status()).toBe(201);
    await page.reload();
    await expect(page.getByRole("button", { name: savedSearchName })).toBeVisible();

    const clusterResponse = await page.request.get(`/api/discovery?companyId=${company.id}`);
    const clusterData = await clusterResponse.json();
    expect(clusterData.clusters).toHaveLength(1);
    expect(clusterData.clusters[0].timeline.length).toBeGreaterThanOrEqual(2);

    const matchResponse = await page.request.post(
      `/api/discovery/clusters/${clusterData.clusters[0].id}/matches`,
      { data: { capabilityId: capability.id } },
    );
    expect(matchResponse.status()).toBe(201);
    await page.reload();
    await expect(page.getByText(/Onboarding redesign/).last()).toBeVisible();
    await page.getByRole("button", { name: "Approve fit" }).click();
    await expect(page.getByText(/Solution match marked Approved/)).toBeVisible();

    const cards = page.locator('[data-signal-card="true"]');
    await cards.first().focus();
    await cards.first().press("ArrowDown");
    await expect(cards.nth(1)).toBeFocused();

    await page.getByRole("checkbox", { name: "Select all visible signals" }).check();
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Reject selected" }).click();
    await expect(page.getByText(/Bulk review completed/)).toBeVisible();
  } finally {
    await close(fixtureServer);
  }
});

function listen(server: Server) {
  return new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
}

function close(server: Server) {
  return new Promise<void>((resolve) => server.close(() => resolve()));
}
