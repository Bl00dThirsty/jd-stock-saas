import { Link } from "react-router-dom";
import { useStocks } from "@/hooks/useStockData";
import { CompanyLogo } from "@/components/CompanyLogo";
import { formatNaira, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PriceTick, Stock } from "@/types";

/**
 * Binance-style scrolling ticker tape. Seamlessly loops a duplicated row of
 * symbols (live price + % change). Pauses on hover; degrades to a horizontally
 * scrollable strip under prefers-reduced-motion. Live prices come from the
 * WebSocket `ticks` map, falling back to the cached snapshot.
 */
export function TickerBar({ ticks = {} }: { ticks?: Record<string, PriceTick> }) {
  const { data: stocks } = useStocks();
  const items = (stocks ?? []).filter((s) => s.last_price != null);
  if (items.length === 0) return null;

  return (
    <div className="ticker-mask group bg-card/85 border-border overflow-hidden border-t backdrop-blur">
      <div className="ticker-track flex w-max gap-6 px-4 py-1.5 group-hover:[animation-play-state:paused]">
        {[...items, ...items].map((s, i) => (
          <TickerItem key={`${s.symbol}-${i}`} stock={s} tick={ticks[s.symbol]} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ stock, tick }: { stock: Stock; tick?: PriceTick }) {
  const price = tick?.price ?? stock.last_price;
  const chg = tick?.change_percent ?? stock.change_percent;
  const up = (chg ?? 0) >= 0;
  return (
    <Link
      to={`/stocks/${stock.symbol}`}
      className="num flex shrink-0 items-center gap-2.5 text-xs whitespace-nowrap"
      tabIndex={-1}
    >
      <CompanyLogo src={stock.logo_url} symbol={stock.symbol} size={18} />
      <span className="text-muted-foreground">{stock.symbol}</span>
      <span className="text-foreground">{formatNaira(price)}</span>
      <span className={cn(up ? "text-gain" : "text-loss")}>{formatPercent(chg)}</span>
    </Link>
  );
}
