import { expect, test } from "@playwright/test";

test("shows the Vilu landing page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Find the opportunity before it goes stale." }),
  ).toBeVisible();
  await expect(page.getByText("No stale issue gets a free pass.")).toBeVisible();
  await expect(page.getByRole("link", { name: "See the workflow" })).toHaveAttribute(
    "href",
    "#workflow",
  );
  await expect(page.getByRole("link", { name: "Open workspace" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
});

test("shows every workspace route with accessible navigation", async ({ page }) => {
  const routes = [
    ["/dashboard", "Your research radar"],
    ["/companies", "Companies"],
    ["/opportunities", "Opportunities"],
    ["/evidence", "Evidence"],
    ["/contacts", "Contacts"],
    ["/outreach", "Outreach"],
    ["/pilot", "Pilot"],
    ["/collection", "Collect"],
    ["/discovery", "Discover"],
    ["/monitoring", "Monitoring"],
    ["/ai", "Assist"],
    ["/search", "Search"],
    ["/settings", "Settings"],
  ] as const;

  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toBeVisible();
  }
});
