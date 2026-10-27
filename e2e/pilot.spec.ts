import { expect, test } from "@playwright/test";

test("creates a pilot entry, blocks unreviewed outreach, and compares outcomes", async ({
  page,
}) => {
  const pilotName = `SaaS pilot ${Date.now()}`;
  await page.goto("/pilot");
  await page.getByRole("button", { name: "New pilot" }).click();
  await page.getByLabel("Pilot name").fill(pilotName);
  await page.getByRole("button", { name: "Create pilot" }).click();
  await expect(page.getByRole("heading", { name: pilotName })).toBeVisible();

  await page.getByLabel("Company").selectOption({ label: "Northstar Labs" });
  await page.getByLabel("Source URL").fill("https://northstar-labs.example/pricing");
  await page.getByLabel("Evidence date").fill("2026-10-25");
  await page.getByLabel("Observed date").fill("2026-10-26");
  await page.getByLabel("Last verified date").fill("2026-10-27");
  await page
    .getByLabel("Proposed solution")
    .fill("Clarify the mobile pricing hierarchy and signup action.");
  await page.getByLabel("Message sent date").fill("2026-10-27");
  await page.getByRole("button", { name: "Add pilot entry" }).click();
  await expect(
    page.getByText(
      "Confirm the opportunity was manually reviewed before recording a sent message.",
    ),
  ).toBeVisible();

  await page.getByRole("checkbox", { name: /Manually reviewed/ }).check();
  await page.getByLabel("Reply status").selectOption("positive");
  await page.getByLabel("Meeting date").fill("2026-10-28");
  await page.getByLabel("Outcome status").selectOption("meeting-booked");
  await page.getByRole("button", { name: "Add pilot entry" }).click();

  await expect(
    page.getByText("Companies researched").locator("..").getByText("1/25"),
  ).toBeVisible();
  await expect(page.getByText("Messages sent").locator("..").getByText("1/10")).toBeVisible();
  await expect(page.getByText("What produced useful conversations?")).toBeVisible();
  await expect(page.getByRole("row", { name: /Website/ }).first()).toContainText("1");
});
