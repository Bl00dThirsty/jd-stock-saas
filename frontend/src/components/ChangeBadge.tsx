import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent, trend } from "@/lib/format";

interface ChangeBadgeProps {
  changePercent: number | null | undefined;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Signature element: the gain/loss pill. Direction is encoded by BOTH colour
 * and an arrow icon (never colour alone) and the figure rides the mono
 * tabular rail so columns never jitter.
 */
export function ChangeBadge({ changePercent, className, size = "sm" }: ChangeBadgeProps) {
  const dir = trend(changePercent);
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 rounded-[var(--radius-pill)] font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        dir === "up" && "bg-gain-soft text-gain",
        dir === "down" && "bg-loss-soft text-loss",
        dir === "flat" && "bg-surface-2 text-muted",
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden />
      {formatPercent(changePercent)}
    </span>
  );
}
