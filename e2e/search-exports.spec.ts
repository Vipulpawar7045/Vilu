import { expect, test } from "@playwright/test";

test("searches the workspace and exposes export controls", async ({ page }) => {
  await page.goto("/search");
  await page.getByLabel("Global search").fill("Northstar");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("heading", { name: /Results for/ })).toBeVisible();
  await expect(page.getByText("Northstar Labs").first()).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("link", { name: "Companies CSV" })).toHaveAttribute(
    "href",
    "/api/exports?type=companies",
  );
  await expect(page.getByRole("link", { name: "Pilot outcomes CSV" })).toHaveAttribute(
    "href",
    "/api/exports?type=pilot",
  );
  await expect(page.getByRole("link", { name: "Full JSON backup" })).toHaveAttribute(
    "href",
    "/api/exports?type=backup",
  );
  await expect(page.getByText("Validate before importing")).toBeVisible();

  const csv = await page.request.get("/api/exports?type=companies");
  expect(csv.ok()).toBe(true);
  expect(await csv.text()).toContain("websiteUrl");
  const pilotCsv = await page.request.get("/api/exports?type=pilot");
  expect(pilotCsv.ok()).toBe(true);
  expect(await pilotCsv.text()).toContain("sourceCategory");
  const backupResponse = await page.request.get("/api/exports?type=backup");
  const backup = await backupResponse.json();
  const preview = await page.request.post("/api/import/validate", { data: backup });
  expect(preview.ok()).toBe(true);
  expect((await preview.json()).valid).toBe(true);
});
