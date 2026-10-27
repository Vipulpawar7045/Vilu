import { expect, test } from "@playwright/test";

test("shows the research radar and applies queue filters", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Your research radar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What needs attention" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Due and overdue" })).toBeVisible();

  const freshness = page.getByLabel("Dashboard Freshness filter");
  await freshness.selectOption("Hot");
  await expect(freshness).toHaveValue("Hot");

  const sort = page.getByLabel("Dashboard Sort filter");
  await sort.selectOption("priority");
  await expect(sort).toHaveValue("priority");

  await page.getByLabel("Dashboard Status filter").selectOption("needs-verification");
  await expect(page.getByText(/matching opportunities/)).toBeVisible();
});
