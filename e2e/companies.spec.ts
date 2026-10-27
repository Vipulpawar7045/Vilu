import { expect, test } from "@playwright/test";

test("creates, edits, searches, and archives a company", async ({ page }) => {
  const suffix = Date.now();
  const companyName = `Aurora Orbit ${suffix}`;
  const websiteUrl = `https://aurora-orbit-${suffix}.example`;

  await page.goto("/companies");
  await page.getByRole("button", { name: "Add company" }).click();
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Website URL").fill(websiteUrl);
  await page.getByLabel("Location").fill("Austin, TX");
  await page.getByRole("button", { name: "Create company" }).click();

  await expect(page.getByRole("link", { name: companyName })).toBeVisible();
  await page.getByRole("link", { name: companyName }).click();
  await expect(page.getByRole("heading", { name: companyName })).toBeVisible();
  await expect(page.getByRole("main").getByText("Austin, TX").first()).toBeVisible();

  await page.goto("/companies");
  const card = page.locator("article").filter({ hasText: companyName });
  await card.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Notes").fill("Edited context for the next research pass.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
  await expect(card).toContainText("Priority 3");

  await page.getByLabel("Search companies").fill(companyName);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("link", { name: companyName })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  const archiveResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/companies/") &&
      response.request().method() === "PATCH" &&
      response.request().postDataJSON()?.status === "archived",
  );
  await page
    .locator("article")
    .filter({ hasText: companyName })
    .getByRole("button", { name: "Archive" })
    .click();
  const archiveResult = await archiveResponse;
  expect(archiveResult.status()).toBe(200);
  expect((await archiveResult.json()).company.status).toBe("archived");
  await expect(page.getByRole("link", { name: companyName })).toHaveCount(0);

  await page.getByRole("tab", { name: "Archived" }).click();
  await expect(page.getByRole("tab", { name: "Archived" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("link", { name: companyName })).toBeVisible();
  await expect(page.getByText("Loading companies...", { exact: true })).toHaveCount(0);

  const archivedCard = page.locator("article").filter({ hasText: companyName });
  await archivedCard.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("link", { name: companyName })).toBeVisible();
});
