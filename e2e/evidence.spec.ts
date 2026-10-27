import { expect, test } from "@playwright/test";

test("captures a source and dated evidence for a company", async ({ page }) => {
  const suffix = Date.now();
  const companyName = `Signal Orbit ${suffix}`;
  const companyUrl = `https://signal-orbit-${suffix}.example`;
  const sourceUrl = `${companyUrl}/docs/setup?version=2`;
  const excerpt = "The setup guide does not explain how to rotate an API key.";

  await page.goto("/companies");
  await page.getByRole("button", { name: "Add company" }).click();
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Website URL").fill(companyUrl);
  await page.getByRole("button", { name: "Create company" }).click();

  const companyHref = await page.getByRole("link", { name: companyName }).getAttribute("href");
  const companyId = companyHref?.split("/").pop();
  expect(companyId).toBeTruthy();

  await page.goto(`/evidence?companyId=${companyId}`);
  await page.getByRole("button", { name: "Add source" }).click();
  await page.getByLabel("Source URL").fill(sourceUrl);
  await page.getByLabel("Source title").fill("Setup guide");
  await page.getByLabel("Published date").fill("2026-10-20");
  await page.getByLabel("Last checked date").fill("2026-10-26");
  await page.getByRole("button", { name: "Create source" }).click();

  await expect(page.getByText("Setup guide").first()).toBeVisible();
  await page.getByRole("button", { name: "Add evidence" }).click();
  await page.getByLabel("Observed date").fill("2026-10-26");
  await page.getByLabel("Evidence excerpt").fill(excerpt);
  await page.getByRole("button", { name: "Save evidence" }).click();

  await expect(page.getByText(excerpt)).toBeVisible();
  await page.goto(`/companies/${companyId}`);
  await expect(page.getByRole("heading", { name: "Recent evidence" })).toBeVisible();
  await expect(page.getByText(excerpt)).toBeVisible();
});
