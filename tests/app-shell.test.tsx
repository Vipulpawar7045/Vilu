import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppShell, navigationItems } from "@/components/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/opportunities",
}));

describe("AppShell", () => {
  it("renders all workspace links and marks the current page", () => {
    const { getAllByRole, getByRole, getByText } = render(
      <AppShell>
        <h1>Workspace content</h1>
      </AppShell>,
    );

    expect(getByRole("main")).toContainElement(getByText("Workspace content"));

    for (const item of navigationItems) {
      expect(getAllByRole("link", { name: item.label }).length).toBeGreaterThan(0);
    }

    const opportunityLinks = getByRole("navigation", {
      name: "Workspace navigation",
    }).querySelectorAll('a[href="/opportunities"]');
    expect(opportunityLinks).toHaveLength(1);
    expect(opportunityLinks[0]).toHaveAttribute("aria-current", "page");
  });
});
