import { createServer, type Server } from "node:http";

import { expect, test } from "@playwright/test";

test("rechecks a changed local source, alerts, downgrades, and preserves evidence", async ({
  page,
}) => {
  test.setTimeout(120_000);
  let version = 1;
  let available = true;
  const fixtureServer = createServer((request, response) => {
    if (request.url === "/robots.txt") {
      response.writeHead(404);
      response.end();
      return;
    }
    if (!available) {
      response.writeHead(404);
      response.end("Missing fixture page");
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end(
      `<html><head><title>Monitor pricing</title></head><body><h1>Plans</h1><p>Monitor fixture version ${version}.</p></body></html>`,
    );
  });
  await listen(fixtureServer);

  try {
    const address = fixtureServer.address();
    if (!address || typeof address === "string") throw new Error("Fixture server did not start.");
    const origin = `http://127.0.0.1:${address.port}`;
    const companyName = `Monitoring Fixture ${Date.now()}`;
    const companyResponse = await page.request.post("/api/companies", {
      data: { name: companyName, websiteUrl: origin, priority: 5 },
    });
    expect(companyResponse.ok()).toBe(true);
    const { company } = await companyResponse.json();

    const sourceResponse = await page.request.post("/api/sources", {
      data: {
        companyId: company.id,
        url: `${origin}/pricing`,
        sourceType: "pricing",
        title: "Monitor pricing",
      },
    });
    expect(sourceResponse.status()).toBe(201);
    const { source } = await sourceResponse.json();

    const evidenceResponse = await page.request.post("/api/evidence", {
      data: {
        companyId: company.id,
        sourceId: source.id,
        excerpt: "The pricing page is a preserved monitoring fixture.",
        observedAt: "2026-10-27T12:00:00.000Z",
        lastVerifiedAt: "2026-10-27T12:00:00.000Z",
        snapshotHash: `monitoring-fixture-${Date.now()}`,
        confidence: 4,
      },
    });
    expect(evidenceResponse.status()).toBe(201);
    const { evidence } = await evidenceResponse.json();

    const opportunityResponse = await page.request.post("/api/opportunities", {
      data: {
        companyId: company.id,
        title: `Monitoring opportunity ${Date.now()}`,
        category: "website-conversion",
        hypothesis: "The monitored pricing page may benefit from clearer plan comparison guidance.",
        impactDescription: "Clearer plan comparison may reduce evaluation friction.",
        suggestedSolution: "Add a concise comparison summary above the plan grid.",
        expectedOutcome: "Visitors understand the plan differences more quickly.",
        evidenceIds: [evidence.id],
        impactScore: 4,
        evidenceScore: 4,
        solutionFitScore: 4,
        reachabilityScore: 4,
      },
    });
    expect(opportunityResponse.status()).toBe(201);
    const { opportunity } = await opportunityResponse.json();

    for (const status of ["researching", "verified"]) {
      const response = await page.request.patch(`/api/opportunities/${opportunity.id}`, {
        data: { status },
      });
      expect(response.ok()).toBe(true);
    }

    const firstRun = await page.request.post("/api/monitoring", {
      data: { companyId: company.id },
    });
    expect(firstRun.ok()).toBe(true);
    const firstPayload = await firstRun.json();
    const firstResult = firstPayload.results.find(
      (result: { sourceId: string }) => result.sourceId === source.id,
    );
    expect(firstResult.resultStatus).toBe("unchanged");
    expect(firstResult.reviewStatus).toBe("not-needed");

    version = 2;
    const changedRun = await page.request.post("/api/monitoring", {
      data: { companyId: company.id },
    });
    expect(changedRun.ok()).toBe(true);
    const changedPayload = await changedRun.json();
    const changedResult = changedPayload.results.find(
      (result: { sourceId: string }) => result.sourceId === source.id,
    );
    expect(changedResult.resultStatus).toBe("changed");
    expect(changedResult.reviewStatus).toBe("pending");
    expect(changedResult.downgradedCount).toBe(1);

    const savedOpportunities = await page.request.get(`/api/opportunities?companyId=${company.id}`);
    const savedOpportunity = (await savedOpportunities.json()).opportunities.find(
      (item: { id: string }) => item.id === opportunity.id,
    );
    expect(savedOpportunity.status).toBe("needs-verification");

    await page.goto("/monitoring");
    await expect(page.getByRole("heading", { name: "Monitoring alerts" })).toBeVisible();
    const alertCard = page
      .locator("article")
      .filter({ hasText: companyName })
      .filter({ hasText: "Pending" });
    await expect(alertCard).toBeVisible();
    const acknowledgeResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/monitoring/check/") &&
        response.request().method() === "PATCH",
    );
    await alertCard.getByRole("button", { name: "Acknowledge review" }).click();
    expect((await acknowledgeResponse).ok()).toBe(true);
    await page.reload();
    await expect(alertCard).toHaveCount(0);

    available = false;
    const missingRun = await page.request.post("/api/monitoring", {
      data: { companyId: company.id },
    });
    expect(missingRun.ok()).toBe(true);
    const missingPayload = await missingRun.json();
    const missingResult = missingPayload.results.find(
      (result: { sourceId: string }) => result.sourceId === source.id,
    );
    expect(missingResult.resultStatus).toBe("missing");

    const evidenceAfterMissing = await page.request.get(`/api/evidence?companyId=${company.id}`);
    expect((await evidenceAfterMissing.json()).evidence).toHaveLength(1);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Changed sources" })).toBeVisible();
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
