import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Vilu landing page", () => {
  it("explains the product and its recency-first workflow", () => {
    const { getByRole, getByText } = render(<Home />);

    expect(
      getByRole("heading", { name: "Find the opportunity before it goes stale." }),
    ).toBeInTheDocument();
    expect(getByText("From public signal to useful conversation.")).toBeInTheDocument();
    expect(getByText("Freshness is a feature")).toBeInTheDocument();
    expect(getByText("Manual first. Recent always.")).toBeInTheDocument();
  });
});
