import { expect, test } from "@playwright/test";

test("creates and edits an evidence-linked scored opportunity", async ({ page }) => {
  const title = `Signup clarity opportunity ${Date.now()}`;

  await page.goto("/opportunities");
  await page.getByRole("button", { name: "Create opportunity" }).click();
  await page
    .locator('select[name="opportunity-company"]')
    .selectOption({ label: "Northstar Labs" });
  await page.getByLabel("Opportunity title").fill(title);
  await page
    .getByLabel("Evidence-backed hypothesis")
    .fill("The public pricing flow may be losing qualified mobile signup intent.");
  await page
    .getByLabel("Possible business impact")
    .fill("A clearer path may improve qualified signup conversion.");
  await page
    .getByLabel("Suggested solution")
    .fill("Review the mobile pricing hierarchy and move the primary action above the fold.");
  await page
    .getByLabel("Expected outcome")
    .fill("A shorter path from pricing evaluation to signup.");
  await page.getByRole("checkbox").first().check();
  await page.locator('select[name="impact-score"]').selectOption("4");
  await page.locator('select[name="evidence-score"]').selectOption("4");
  await page.locator('select[name="solution-fit-score"]').selectOption("5");
  await page.locator('select[name="reachability-score"]').selectOption("4");
  await page.getByRole("button", { name: "Create opportunity" }).last().click();

  const card = page.locator("article").filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(card.getByText("Priority", { exact: true })).toBeVisible();
  await expect(card.getByText("Confidence Medium", { exact: true })).toBeVisible();

  await card.getByRole("button", { name: "Edit opportunity" }).click();
  await page.locator('select[name="opportunity-status"]').selectOption("researching");
  await page
    .getByLabel("Verification notes")
    .fill("Manually reviewed the linked public pricing observation.");
  await page.getByRole("button", { name: "Save opportunity" }).click();
  await expect(
    page.locator("article").filter({ hasText: title }).getByText("Researching", { exact: true }),
  ).toBeVisible();
});
