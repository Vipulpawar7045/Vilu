import { createServer, type Server } from "node:http";

import { expect, test } from "@playwright/test";

test("collects a local public page and puts changes in the review queue", async ({ page }) => {
  let version = 1;
  const fixtureServer = createServer((request, response) => {
    if (request.url === "/robots.txt") {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end(
      `<html><head><title>Fixture pricing</title></head><body><h1>Plans</h1><p>Fixture version ${version}.</p></body></html>`,
    );
  });
  await listen(fixtureServer);

  try {
    const address = fixtureServer.address();
    if (!address || typeof address === "string") throw new Error("Fixture server did not start.");
    const origin = `http://127.0.0.1:${address.port}`;
    const companyResponse = await page.request.post("/api/companies", {
      data: { name: `Collection Fixture ${Date.now()}`, websiteUrl: origin, priority: 3 },
    });
    expect(companyResponse.ok()).toBe(true);
    const { company } = await companyResponse.json();

    const firstResponse = await page.request.post("/api/collection", {
      data: { companyId: company.id, url: `${origin}/pricing` },
    });
    expect(firstResponse.status()).toBe(201);
    const first = await firstResponse.json();
    expect(first.candidate.changeStatus).toBe("new");
    expect(first.candidate.reviewStatus).toBe("pending");
    expect(first.candidate.normalizedText).toContain("Fixture version 1.");

    await page.goto("/collection");
    await expect(page.getByText("Fixture pricing").first()).toBeVisible();
    await page.getByRole("button", { name: "Mark reviewed" }).first().click();
    await expect(page.getByText("Accepted").first()).toBeVisible();

    version = 2;
    const secondResponse = await page.request.post("/api/collection", {
      data: { companyId: company.id, url: `${origin}/pricing` },
    });
    expect(secondResponse.status()).toBe(201);
    const second = await secondResponse.json();
    expect(second.candidate.changeStatus).toBe("changed");
    expect(second.candidate.previousHash).toBe(first.candidate.contentHash);
    expect(second.candidate.reviewStatus).toBe("pending");
    expect(second.candidate.normalizedText).toContain("Fixture version 2.");
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
