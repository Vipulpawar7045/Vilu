import { expect, test } from "@playwright/test";

test("completes the manual MVP workflow from research to reply and export", async ({ page }) => {
  const suffix = Date.now();
  const companyName = `MVP Orbit ${suffix}`;
  const companyUrl = `https://mvp-orbit-${suffix}.example`;
  const sourceUrl = `${companyUrl}/docs/setup`;
  const excerpt = "The setup guide does not explain the first workspace configuration step.";
  const opportunityTitle = `Workspace setup clarity ${suffix}`;
  const contactName = `Maya Pilot ${suffix}`;

  await page.goto("/companies");
  await page.getByRole("button", { name: "Add company" }).click();
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Website URL").fill(companyUrl);
  await page.getByLabel("Industry").fill("SaaS");
  await page.getByRole("button", { name: "Create company" }).click();
  const companyHref = await page.getByRole("link", { name: companyName }).getAttribute("href");
  const companyId = companyHref?.split("/").pop();
  expect(companyId).toBeTruthy();

  await page.goto(`/evidence?companyId=${companyId}`);
  await page.getByRole("button", { name: "Add source" }).click();
  await page.getByLabel("Source URL").fill(sourceUrl);
  await page.getByLabel("Source title").fill("Workspace setup guide");
  await page.getByLabel("Published date").fill("2026-10-25");
  await page.getByLabel("Last checked date").fill("2026-10-26");
  await page.getByRole("button", { name: "Create source" }).click();
  await expect(page.getByText("Workspace setup guide").first()).toBeVisible();

  await page.getByRole("button", { name: "Add evidence" }).click();
  await page.getByLabel("Evidence excerpt").fill(excerpt);
  await page.getByLabel("Observed date").fill("2026-10-26");
  await page.getByLabel("Last verified date").fill("2026-10-26");
  await page.getByRole("button", { name: "Save evidence" }).click();
  await expect(page.getByText(excerpt)).toBeVisible();

  await page.getByRole("link", { name: "Create opportunity" }).click();
  await page.getByLabel("Opportunity title").fill(opportunityTitle);
  await page
    .getByLabel("Evidence-backed hypothesis")
    .fill("The setup experience may be creating avoidable activation friction for new users.");
  await page
    .getByLabel("Possible business impact")
    .fill("Clearer setup guidance may improve activation and reduce support questions.");
  await page
    .getByLabel("Suggested solution")
    .fill("Add a concise first-workspace checklist with contextual examples.");
  await page
    .getByLabel("Expected outcome")
    .fill("More users complete setup without a support handoff.");
  await page.getByRole("checkbox").first().check();
  await page.locator('select[name="impact-score"]').selectOption("4");
  await page.locator('select[name="evidence-score"]').selectOption("4");
  await page.locator('select[name="solution-fit-score"]').selectOption("5");
  await page.locator('select[name="reachability-score"]').selectOption("3");
  await page.getByRole("button", { name: "Create opportunity" }).last().click();
  await expect(page.locator("article").filter({ hasText: opportunityTitle })).toBeVisible();

  for (const [status, label] of [
    ["researching", "Researching"],
    ["verified", "Verified"],
    ["solution-ready", "Solution Ready"],
  ] as const) {
    const card = page.locator("article").filter({ hasText: opportunityTitle });
    await card.getByRole("button", { name: "Edit opportunity" }).click();
    await page.locator('select[name="opportunity-status"]').selectOption(status);
    await page.getByRole("button", { name: "Save opportunity" }).click();
    await expect(page.getByRole("button", { name: "Save opportunity" })).toHaveCount(0);
    await expect(
      page
        .locator("article")
        .filter({ hasText: opportunityTitle })
        .getByText(label, { exact: true }),
    ).toBeVisible();
  }

  await page.goto(`/contacts?companyId=${companyId}`);
  await page.locator('select[name="contact-company"]').selectOption({ label: companyName });
  await page.getByLabel("Contact name").fill(contactName);
  await page.getByLabel("Role").fill("Head of Product");
  await page.getByLabel("Contact method").fill("Email");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { name: contactName })).toBeVisible();
  await page
    .locator("article")
    .filter({ hasText: contactName })
    .getByRole("link", { name: "View outreach" })
    .click();

  const opportunityOption = page
    .locator('select[name="outreach-opportunity"] option')
    .filter({ hasText: opportunityTitle })
    .first();
  const opportunityId = await opportunityOption.getAttribute("value");
  expect(opportunityId).toBeTruthy();
  await page.locator('select[name="outreach-opportunity"]').selectOption(opportunityId!);
  await page.locator('select[name="outreach-contact"]').selectOption({ label: contactName });
  await page.getByRole("button", { name: "Insert respectful template" }).click();
  await page.locator('select[name="outreach-status"]').selectOption("contacted");
  await page.getByLabel("Follow-up date").fill("2026-10-28T14:30");
  await page.getByRole("button", { name: "Save draft" }).click();
  const outreachCard = page
    .locator("article")
    .filter({ hasText: contactName })
    .filter({ hasText: opportunityTitle });
  await expect(outreachCard).toBeVisible();
  await outreachCard.getByRole("button", { name: "Copy message" }).click();
  await expect(outreachCard.getByRole("button", { name: "Copied" })).toBeVisible();

  await outreachCard.getByRole("button", { name: "Edit outreach" }).click();
  await page.locator('select[name="outreach-status"]').selectOption("replied");
  await page.getByLabel("Response summary").fill("Interested in reviewing the setup analysis.");
  await page.getByLabel("Next action").fill("Send the short analysis manually.");
  await page.getByRole("button", { name: "Save outreach" }).click();
  await expect(
    page.getByText("Response: Interested in reviewing the setup analysis.").first(),
  ).toBeVisible();

  const markdown = await page.request.get(`/api/exports/opportunity/${opportunityId}`);
  expect(markdown.ok()).toBe(true);
  expect(await markdown.text()).toContain(opportunityTitle);
});
