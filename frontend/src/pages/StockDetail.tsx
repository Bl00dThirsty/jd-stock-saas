import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangeBadge } from "@/components/ChangeBadge";
import { StockChart } from "@/components/StockChart";
import { CenteredSpinner } from "@/components/ui/Spinner";
import { useStock, useStockHistory, useStocks } from "@/hooks/useStockData";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";
import {
  formatCompact,
  formatDate,
  formatNaira,
  formatNumber,
} from "@/lib/format";
import type { PricePoint, Stock, StockDetail as TStockDetail } from "@/types";

const PERIODS = [
  { key: "1d", label: "1D" },
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "1y", label: "1Y" },
  { key: "max", label: "Max" },
];

export function StockDetail() {
  const { symbol = "" } = useParams();
  const [period, setPeriod] = useState("1m");
  const { data: stock, isLoading } = useStock(symbol);
  const { data: history } = useStockHistory(symbol, period);
  const { data: stocks } = useStocks();
  const { ticks } = useWebSocket([symbol]);

  if (isLoading || !stock) return <CenteredSpinner />;

  const livePrice = ticks[symbol]?.price ?? stock.last_price;
  const points = history?.points ?? [];

  return (
    <div className="animate-rise space-y-4">
      <Link
        to="/market"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Market
      </Link>

      <HeaderBar stock={stock} livePrice={livePrice} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardBody className="pt-5">
              <div className="mb-4 flex gap-1">
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
              <StockChart points={points} period={period} height={360} />
            </CardBody>
          </Card>

          <Fundamentals stock={stock} />
        </div>

        <div className="space-y-4">
          <Watchlist stocks={stocks ?? []} current={stock.symbol} />
          <RecentCloses points={points} />
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Want to be notified when {stock.symbol} moves?{" "}
        <Link to="/alerts" className="text-primary font-medium hover:underline">
          Set a price alert →
        </Link>
      </p>
    </div>
  );
}

/* ─────────────── Header stats bar ─────────────── */

function HeaderBar({ stock, livePrice }: { stock: TStockDetail; livePrice: number | null }) {
  const up = (stock.change ?? 0) >= 0;
  return (
    <Card>
      <CardBody className="flex flex-col gap-5 pt-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="num font-display text-2xl font-semibold">{stock.symbol}</h1>
              {stock.sector && <Badge variant="brand">{stock.sector}</Badge>}
            </div>
            <p className="text-muted-foreground mt-0.5 max-w-[14rem] truncate text-sm">
              {stock.name}
            </p>
          </div>
          <div className="border-border border-l pl-4">
            <p className={cn("num text-2xl font-semibold", up ? "text-gain" : "text-loss")}>
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

        {/* Stat strip — wraps on small screens */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:ml-auto lg:flex lg:flex-wrap lg:items-center lg:gap-x-7">
          <Stat label="Volume" value={formatCompact(stock.volume)} />
          <Stat label="Market cap" value={`₦${formatCompact(stock.market_cap)}`} />
          <Stat label="52W high" value={formatNaira(stock.week52_high)} />
          <Stat label="52W low" value={formatNaira(stock.week52_low)} />
          <Stat label="P/E" value={formatNumber(stock.pe_ratio, 2)} />
        </div>
      </CardBody>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[11px] tracking-wide uppercase">{label}</p>
      <p className="num text-foreground mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

/* ─────────────── Fundamentals grid ─────────────── */

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
    ["52-week range", `${formatNaira(stock.week52_low)} – ${formatNaira(stock.week52_high)}`],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fundamentals</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        <dl className="grid grid-cols-1 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="border-border/60 flex items-center justify-between border-b py-2.5 text-sm last:border-0 sm:[&:nth-last-child(2)]:border-0"
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="num text-foreground font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

/* ─────────────── Markets watchlist rail ─────────────── */

function Watchlist({ stocks, current }: { stocks: Stock[]; current: string }) {
  const rows = useMemo(
    () =>
      [...stocks]
        .filter((s) => s.last_price != null)
        .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)),
    [stocks],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Markets</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="-mx-1 max-h-[22rem] overflow-y-auto">
          {rows.map((s) => {
            const active = s.symbol === current;
            const up = (s.change_percent ?? 0) >= 0;
            return (
              <Link
                key={s.id}
                to={`/stocks/${s.symbol}`}
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
                  active ? "bg-accent" : "hover:bg-accent/60",
                )}
              >
                <span className="num text-foreground font-medium">{s.symbol}</span>
                <div className="flex items-center gap-2">
                  <span className="num text-foreground">{formatNaira(s.last_price)}</span>
                  <span className={cn("num w-14 text-right text-xs", up ? "text-gain" : "text-loss")}>
                    {up ? "+" : ""}
                    {formatNumber(s.change_percent, 2)}%
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

/* ─────────────── Recent closes ─────────────── */

function RecentCloses({ points }: { points: PricePoint[] }) {
  const rows = useMemo(() => {
    const recent = points.slice(-14);
    return recent
      .map((p, i) => {
        const prev = recent[i - 1]?.price ?? p.open ?? p.price;
        const chg = prev ? ((p.price - prev) / prev) * 100 : 0;
        return { ts: p.timestamp, price: p.price, chg };
      })
      .reverse();
  }, [points]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent closes</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No history available.</p>
        ) : (
          <div className="max-h-[18rem] overflow-y-auto text-sm">
            {rows.map((r) => (
              <div
                key={r.ts}
                className="border-border/60 flex items-center justify-between border-b py-2 last:border-0"
              >
                <span className="num text-muted-foreground text-xs">{formatDate(r.ts)}</span>
                <span className="num text-foreground">{formatNaira(r.price)}</span>
                <span className={cn("num w-14 text-right text-xs", r.chg >= 0 ? "text-gain" : "text-loss")}>
                  {r.chg >= 0 ? "+" : ""}
                  {r.chg.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
