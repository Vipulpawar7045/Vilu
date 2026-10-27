import { expect, test } from "@playwright/test";

test("creates a contact, drafts manual outreach, copies it, and records a reply", async ({
  page,
}) => {
  const name = `Jordan Lee ${Date.now()}`;

  await page.goto("/contacts");
  await page.getByRole("button", { name: "Add contact" }).click();
  await page.locator('select[name="contact-company"]').selectOption({ label: "Northstar Labs" });
  await page.getByLabel("Contact name").fill(name);
  await page.getByLabel("Role").fill("Head of Product");
  await page.getByLabel("Contact method").fill("Email");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  await page
    .locator("article")
    .filter({ hasText: name })
    .getByRole("link", { name: "View outreach" })
    .click();
  const opportunityOption = page
    .locator('select[name="outreach-opportunity"] option')
    .filter({ hasText: "Mobile pricing signup friction" })
    .first();
  const opportunityValue = await opportunityOption.getAttribute("value");
  expect(opportunityValue).toBeTruthy();
  await page.locator('select[name="outreach-opportunity"]').selectOption(opportunityValue!);
  await page.locator('select[name="outreach-contact"]').selectOption({ label: name });
  await page.getByRole("button", { name: "Insert respectful template" }).click();
  await page.locator('select[name="outreach-status"]').selectOption("contacted");
  await page.getByLabel("Follow-up date").fill("2026-10-28T14:30");
  await page.getByRole("button", { name: "Save draft" }).click();

  const card = page
    .locator("article")
    .filter({ hasText: name })
    .filter({ hasText: "Mobile pricing signup friction" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Copy message" }).click();
  await expect(card.getByRole("button", { name: "Copied" })).toBeVisible();

  await card.getByRole("button", { name: "Edit outreach" }).click();
  await page.locator('select[name="outreach-status"]').selectOption("replied");
  await page.getByLabel("Response summary").fill("Interested in reviewing the short analysis.");
  await page.getByRole("button", { name: "Save outreach" }).click();
  await expect(
    page.getByText("Response: Interested in reviewing the short analysis.").first(),
  ).toBeVisible();
});
