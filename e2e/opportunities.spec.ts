import { expect, test } from "@playwright/test";

test("shows freshness, re-verifies, resolves, and reopens an opportunity", async ({ page }) => {
  await page.goto("/opportunities");

  const title = "Mobile pricing signup friction";
  const card = page.locator("article").filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(card.getByText("Hot", { exact: true })).toBeVisible();

  await card.getByRole("button", { name: "Mark needs verification" }).click();
  await page.getByRole("tab", { name: "Needs verification" }).click();
  const verificationCard = page.locator("article").filter({ hasText: title });
  await expect(verificationCard.getByText("Needs verification", { exact: true })).toBeVisible();

  await verificationCard.getByRole("button", { name: "Re-verify" }).click();
  await verificationCard
    .getByLabel("Re-verification note")
    .fill("Checked the pricing flow again and confirmed the observation.");
  await verificationCard.getByRole("button", { name: "Confirm re-verification" }).click();
  await expect(page.locator("article").filter({ hasText: title })).toHaveCount(0);

  await page.getByRole("tab", { name: "Current work" }).click();
  const currentCard = page.locator("article").filter({ hasText: title });
  await expect(currentCard).toBeVisible();
  await page.once("dialog", (dialog) => dialog.accept());
  await currentCard.getByRole("button", { name: "Resolve" }).click();
  await expect(currentCard).toHaveCount(0);

  await page.getByRole("tab", { name: "Resolved" }).click();
  const resolvedCard = page.locator("article").filter({ hasText: title });
  await expect(resolvedCard).toBeVisible();
  await resolvedCard.getByRole("button", { name: "Reopen for research" }).click();
  await expect(page.locator("article").filter({ hasText: title })).toHaveCount(0);

  await page.getByRole("tab", { name: "Current work" }).click();
  await expect(page.locator("article").filter({ hasText: title })).toBeVisible();
});
