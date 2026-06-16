/** Naira-aware formatting helpers. NGX prices are quoted in ₦. */

const NAIRA = "₦"; // ₦

export function formatNaira(value: number | null | undefined, dp = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${NAIRA}${value.toLocaleString("en-NG", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })}`;
}

export function formatNumber(value: number | null | undefined, dp = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-NG", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/** Compact large figures: 1.2B, 340.5M, 12.3K. */
export function formatCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-NG", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatSignedNaira(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatNaira(Math.abs(value))}`;
}

/** Direction of a change: "up" | "down" | "flat". */
export function trend(value: number | null | undefined): "up" | "down" | "flat" {
  if (value == null || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
