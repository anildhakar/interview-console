import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreChip, StatusBadge } from "@/components/badges";
import { fmtDate } from "@/lib/client";

/**
 * Proves the test harness itself works: the `@/` alias resolves, JSX compiles,
 * jsdom renders, and jest-dom matchers are available.
 *
 * If this file fails, the problem is your setup — not your ticket.
 */
describe("test harness", () => {
  it("renders a component from the app", () => {
    render(<StatusBadge status="selected" />);
    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  it("renders derived values", () => {
    render(<ScoreChip score={4.25} />);
    expect(screen.getByText("4.3")).toBeInTheDocument();
  });

  it("imports plain utilities", () => {
    expect(fmtDate(null)).toBe("—");
  });
});
