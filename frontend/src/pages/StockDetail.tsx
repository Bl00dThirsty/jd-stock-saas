import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangeBadge } from "@/components/ChangeBadge";
import { CompanyLogo } from "@/components/CompanyLogo";
import { StockChart } from "@/components/StockChart";
import { CenteredSpinner } from "@/components/ui/Spinner";
import { useStock, useStockHistory, useStocks } from "@/hooks/useStockData";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useFlash } from "@/hooks/useFlash";
import { cn } from "@/lib/utils";
import {
  formatCompact,
  formatDate,
  formatNaira,
  formatNumber,
} from "@/lib/format";
import type { PricePoint, PriceTick, Stock, StockDetail as TStockDetail } from "@/types";

const PERIODS = [
  { key: "1d", label: "1D" },
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "1y", label: "1Y" },
  { key: "max", label: "Max" },
];

const PANEL = "shadow-none flex flex-col";

export function StockDetail() {
  const { symbol = "" } = useParams();
  const [period, setPeriod] = useState("1m");
  const { data: stock, isLoading } = useStock(symbol);
  const { data: history } = useStockHistory(symbol, period);
  const { data: stocks } = useStocks();
  const { ticks } = useWebSocket();

  if (isLoading || !stock) return <CenteredSpinner />;

  const tick = ticks[symbol];
  const livePrice = tick?.price ?? stock.last_price;
  const points = history?.points ?? [];

  return (
    <div className="animate-rise space-y-2">
      <Link
        to="/market"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Market
      </Link>

      <HeaderBar stock={stock} livePrice={livePrice} points={points} />

      <div className="grid gap-2 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)_minmax(0,300px)] lg:items-stretch">
        {/* Left — Markets watchlist */}
        <Card className={PANEL}>
          <PanelTitle>Markets</PanelTitle>
          <div className="min-h-0 max-h-[60vh] flex-1 overflow-y-auto px-1.5 pb-1.5">
            {(stocks ?? [])
              .filter((s) => s.last_price != null)
              .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
              .map((s) => (
                <RailRow
                  key={s.id}
                  stock={s}
                  tick={ticks[s.symbol]}
                  active={s.symbol === stock.symbol}
                />
              ))}
          </div>
        </Card>

        {/* Center — chart */}
        <Card className={PANEL}>
          <div className="flex items-center gap-1 px-3 pt-3">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "num rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  period === p.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex-1 px-2 pb-2 pt-3">
            <StockChart points={points} period={period} height={440} />
          </div>
        </Card>

        {/* Right — recent closes (trade-feed equivalent) */}
        <Card className={PANEL}>
          <PanelTitle>Recent closes</PanelTitle>
          <RecentCloses points={points} />
        </Card>
      </div>

      <Fundamentals stock={stock} />

      <p className="text-muted-foreground px-1 pt-1 text-xs">
        Want to be notified when {stock.symbol} moves?{" "}
        <Link to="/alerts" className="text-primary font-medium hover:underline">
          Set a price alert →
        </Link>
      </p>
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border/70 flex h-10 shrink-0 items-center border-b px-3">
      <span className="font-display text-sm font-semibold">{children}</span>
    </div>
  );
}

/* ─────────────── Header stats bar ─────────────── */

function HeaderBar({
  stock,
  livePrice,
  points,
}: {
  stock: TStockDetail;
  livePrice: number | null;
  points: PricePoint[];
}) {
  const up = (stock.change ?? 0) >= 0;
  const last = points.at(-1);
  const prevClose = points.at(-2)?.price ?? last?.open ?? null;
  const flash = useFlash(livePrice);

  return (
    <Card className="shadow-none">
      <div className="flex flex-col gap-4 p-3 xl:flex-row xl:items-center">
        <div className="flex items-center gap-3">
          <CompanyLogo src={stock.logo_url} symbol={stock.symbol} size={40} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="num font-display text-xl font-semibold">{stock.symbol}</h1>
              {stock.sector && <Badge variant="brand">{stock.sector}</Badge>}
            </div>
            <p className="text-muted-foreground max-w-[12rem] truncate text-xs">
              {stock.name}
            </p>
          </div>
          <div className="border-border ml-1 border-l pl-4">
            <p
              className={cn(
                "num rounded px-1 text-2xl font-semibold transition-colors duration-500",
                up ? "text-gain" : "text-loss",
                flash === "up" && "bg-gain/15",
                flash === "down" && "bg-loss/15",
              )}
            >
              {formatNaira(livePrice)}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={cn("num text-xs", up ? "text-gain" : "text-loss")}>
                {up ? "+" : ""}
                {formatNaira(stock.change)}
              </span>
              <ChangeBadge changePercent={stock.change_percent} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-5 gap-y-3 sm:grid-cols-4 xl:ml-auto xl:flex xl:flex-wrap xl:items-center xl:gap-x-6">
          <Stat label="Open" value={formatNaira(last?.open)} />
          <Stat label="High" value={formatNaira(last?.high)} />
          <Stat label="Low" value={formatNaira(last?.low)} />
          <Stat label="Prev close" value={formatNaira(prevClose)} />
          <Stat label="Volume" value={formatCompact(stock.volume)} />
          <Stat label="Mkt cap" value={`₦${formatCompact(stock.market_cap)}`} />
          <Stat label="52W H" value={formatNaira(stock.week52_high)} />
          <Stat label="52W L" value={formatNaira(stock.week52_low)} />
          <Stat label="P/E" value={formatNumber(stock.pe_ratio, 2)} />
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</p>
      <p className="num text-foreground mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

/* ─────────────── Markets rail row (live + flash) ─────────────── */

function RailRow({
  stock,
  tick,
  active,
}: {
  stock: Stock;
  tick?: PriceTick;
  active: boolean;
}) {
  const price = tick?.price ?? stock.last_price;
  const chg = tick?.change_percent ?? stock.change_percent;
  const up = (chg ?? 0) >= 0;
  const flash = useFlash(price);

  return (
    <Link
      to={`/stocks/${stock.symbol}`}
      className={cn(
        "flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm transition-colors duration-500",
        active ? "bg-accent" : "hover:bg-accent/60",
        flash === "up" && "bg-gain/15",
        flash === "down" && "bg-loss/15",
      )}
    >
      <CompanyLogo src={stock.logo_url} symbol={stock.symbol} size={22} />
      <span className="num text-foreground flex-1 truncate font-medium">{stock.symbol}</span>
      <span className="num text-foreground text-right">{formatNaira(price)}</span>
      <span className={cn("num w-14 text-right text-xs", up ? "text-gain" : "text-loss")}>
        {up ? "+" : ""}
        {formatNumber(chg, 2)}%
      </span>
    </Link>
  );
}

/* ─────────────── Recent closes ─────────────── */

function RecentCloses({ points }: { points: PricePoint[] }) {
  const rows = useMemo(() => {
    const recent = points.slice(-40);
    return recent
      .map((p, i) => {
        const prev = recent[i - 1]?.price ?? p.open ?? p.price;
        const chg = prev ? ((p.price - prev) / prev) * 100 : 0;
        return { ts: p.timestamp, price: p.price, chg };
      })
      .reverse();
  }, [points]);

  if (rows.length === 0) {
    return <p className="text-muted-foreground p-3 text-sm">No history available.</p>;
  }

  return (
    <div className="min-h-0 max-h-[60vh] flex-1 overflow-y-auto px-3 pb-2 text-sm">
      <div className="text-muted-foreground sticky top-0 grid grid-cols-3 gap-2 bg-card py-1.5 text-[10px] tracking-wide uppercase">
        <span>Date</span>
        <span className="text-right">Close</span>
        <span className="text-right">Chg</span>
      </div>
      {rows.map((r) => (
        <div key={r.ts} className="grid grid-cols-3 gap-2 py-1">
          <span className="num text-muted-foreground text-xs">{formatDate(r.ts)}</span>
          <span className="num text-foreground text-right">{formatNaira(r.price)}</span>
          <span className={cn("num text-right text-xs", r.chg >= 0 ? "text-gain" : "text-loss")}>
            {r.chg >= 0 ? "+" : ""}
            {r.chg.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Fundamentals (full width, dense) ─────────────── */

function Fundamentals({ stock }: { stock: TStockDetail }) {
  const rows: [string, string][] = [
    ["P/E ratio", formatNumber(stock.pe_ratio, 2)],
    ["EPS", formatNaira(stock.eps)],
    [
      "Dividend yield",
      stock.dividend_yield != null ? `${formatNumber(stock.dividend_yield, 2)}%` : "—",
    ],
    ["Shares outstanding", formatCompact(stock.shares_outstanding)],
    ["Market cap", `₦${formatCompact(stock.market_cap)}`],
    ["Sector", stock.sector ?? "—"],
    ["Industry", stock.industry ?? "—"],
    [
      "52-week range",
      `${formatNaira(stock.week52_low)} – ${formatNaira(stock.week52_high)}`,
    ],
  ];
  return (
    <Card className="shadow-none">
      <PanelTitle>Fundamentals</PanelTitle>
      <dl className="grid grid-cols-1 gap-x-6 p-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="border-border/60 flex items-center justify-between gap-2 border-b py-2 text-sm"
          >
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="num text-foreground truncate font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
