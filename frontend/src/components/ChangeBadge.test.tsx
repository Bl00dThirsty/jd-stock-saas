import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChangeBadge } from "./ChangeBadge";

describe("ChangeBadge", () => {
  it("formats a positive change with a leading +", () => {
    render(<ChangeBadge changePercent={1.5} />);
    expect(screen.getByText("+1.50%")).toBeInTheDocument();
  });

  it("formats a negative change", () => {
    render(<ChangeBadge changePercent={-2.345} />);
    expect(screen.getByText("-2.35%")).toBeInTheDocument();
  });

  it("renders an em dash for null", () => {
    render(<ChangeBadge changePercent={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("applies the gain tone for upward moves", () => {
    const { container } = render(<ChangeBadge changePercent={3} />);
    expect(container.querySelector(".text-gain")).not.toBeNull();
  });

  it("applies the loss tone for downward moves", () => {
    const { container } = render(<ChangeBadge changePercent={-3} />);
    expect(container.querySelector(".text-loss")).not.toBeNull();
  });
});
