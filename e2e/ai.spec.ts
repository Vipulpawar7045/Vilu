import { expect, test } from "@playwright/test";

test("generates, edits, and approves a review-only assistant draft", async ({ page }) => {
  const before = await page.request.get("/api/opportunities?companyId=");
  const beforeOpportunity = (await before.json()).opportunities.find(
    (opportunity: { title: string }) => opportunity.title === "Mobile pricing signup friction",
  );
  expect(beforeOpportunity).toBeTruthy();

  await page.goto("/ai");
  await page.locator('select[aria-label="AI opportunity"]').selectOption({
    label: "Northstar Labs · Mobile pricing signup friction",
  });
  await page.locator('select[aria-label="AI draft action"]').selectOption("summary");
  await page.getByRole("button", { name: "Generate draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft generated");

  const card = page
    .locator("article")
    .filter({ hasText: "Mobile pricing signup friction" })
    .first();
  await expect(card).toBeVisible();
  await expect(card.getByText("Evidence used")).toBeVisible();
  const draft = card.getByRole("textbox", { name: "Edit Summary draft" });
  await draft.fill("Edited local summary — needs review.");
  await card.getByRole("button", { name: "Save edits" }).click();
  await expect(card.getByText("Draft", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Approve draft" }).click();
  await expect(card.getByText("Approved", { exact: true })).toBeVisible();

  const after = await page.request.get("/api/opportunities?companyId=");
  const afterOpportunity = (await after.json()).opportunities.find(
    (opportunity: { title: string }) => opportunity.title === "Mobile pricing signup friction",
  );
  expect(afterOpportunity.status).toBe(beforeOpportunity.status);
});
