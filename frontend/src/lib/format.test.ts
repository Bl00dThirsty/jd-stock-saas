import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatNaira,
  formatPercent,
  formatSignedNaira,
  trend,
} from "./format";

describe("format helpers", () => {
  it("formats naira with the ₦ symbol and 2 dp", () => {
    expect(formatNaira(1234.5)).toBe("₦1,234.50");
  });

  it("renders an em dash for nullish values", () => {
    expect(formatNaira(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
    expect(formatCompact(null)).toBe("—");
  });

  it("signs percentages", () => {
    expect(formatPercent(2.5)).toBe("+2.50%");
    expect(formatPercent(-1.2)).toBe("-1.20%");
    expect(formatPercent(0)).toBe("0.00%");
  });

  it("signs naira deltas with absolute value", () => {
    expect(formatSignedNaira(50)).toBe("+₦50.00");
    expect(formatSignedNaira(-50)).toBe("-₦50.00");
  });

  it("derives trend direction", () => {
    expect(trend(1)).toBe("up");
    expect(trend(-1)).toBe("down");
    expect(trend(0)).toBe("flat");
    expect(trend(null)).toBe("flat");
  });

  it("compacts large figures", () => {
    expect(formatCompact(1_500_000)).toBe("1.5M");
  });
});
