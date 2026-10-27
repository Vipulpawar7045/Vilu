import { expect, test } from "@playwright/test";

test("supports skip navigation, visible focus, and named form controls", async ({ page }) => {
  await page.goto("/dashboard");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeAttached();
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();

  await page.goto("/discovery");
  const unnamedControls = await page.locator("input, select, textarea").evaluateAll((controls) =>
    controls
      .filter((control) => {
        const element = control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (element.offsetParent === null) return false;
        const labelled =
          element.getAttribute("aria-label") ||
          element.getAttribute("aria-labelledby") ||
          (element.id && document.querySelector(`label[for="${element.id}"]`)?.textContent) ||
          element.closest("label")?.textContent;
        return !labelled?.trim();
      })
      .map((control) => control.outerHTML),
  );
  expect(unnamedControls, `Unnamed visible controls: ${unnamedControls.join("\n")}`).toEqual([]);
});
