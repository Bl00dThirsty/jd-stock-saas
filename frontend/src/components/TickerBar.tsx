import { Link } from "react-router-dom";
import { useStocks } from "@/hooks/useStockData";
import { formatNaira, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Stock } from "@/types";

/**
 * Binance-style scrolling ticker tape. Seamlessly loops a duplicated row of
 * symbols (price + % change). Pauses on hover; degrades to a horizontally
 * scrollable strip when the user prefers reduced motion.
 */
export function TickerBar() {
  const { data: stocks } = useStocks();
  const items = (stocks ?? []).filter((s) => s.last_price != null);
  if (items.length === 0) return null;

  return (
    <div className="ticker-mask group bg-card/80 border-border overflow-hidden border-t backdrop-blur">
      <div className="ticker-track flex w-max gap-6 px-4 py-2 group-hover:[animation-play-state:paused]">
        {[...items, ...items].map((s, i) => (
          <TickerItem key={`${s.symbol}-${i}`} stock={s} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ stock }: { stock: Stock }) {
  const up = (stock.change_percent ?? 0) >= 0;
  return (
    <Link
      to={`/stocks/${stock.symbol}`}
      className="num flex shrink-0 items-center gap-2 text-xs whitespace-nowrap"
      tabIndex={-1}
    >
      <span className="text-muted-foreground">{stock.symbol}</span>
      <span className="text-foreground">{formatNaira(stock.last_price)}</span>
      <span className={cn(up ? "text-gain" : "text-loss")}>
        {formatPercent(stock.change_percent)}
      </span>
    </Link>
  );
}
