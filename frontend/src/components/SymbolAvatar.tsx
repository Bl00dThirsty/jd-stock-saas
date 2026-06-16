import { cn } from "@/lib/utils";

function hue(symbol: string): number {
  let h = 0;
  for (const ch of symbol) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/**
 * Circular avatar placeholder for a stock "logo" — deterministic colour from
 * the symbol + its first letters. Stands in until real brand assets exist.
 */
export function SymbolAvatar({
  symbol,
  size = 32,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        backgroundColor: `oklch(0.58 0.14 ${hue(symbol)})`,
      }}
    >
      {symbol.slice(0, 2)}
    </span>
  );
}
