import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangeBadge } from "@/components/ChangeBadge";
import { CompanyLogo } from "@/components/CompanyLogo";
import { CandlestickChart } from "@/components/CandlestickChart";
import { StockDetailSkeleton } from "@/components/Skeletons";
import { ErrorState } from "@/components/ErrorState";
import { useStock, useStockAnalytics, useStockHistory, useStocks } from "@/hooks/useStockData";
import { useTheme } from "@/hooks/useTheme";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useFlash } from "@/hooks/useFlash";
import { cn } from "@/lib/utils";
import {
  formatCompact,
  formatDate,
  formatNaira,
  formatNumber,
} from "@/lib/format";
import type { PricePoint, PriceTick, ReturnMetrics, SRLevel, Stock, StockDetail as TStockDetail, VolumeAnomaly } from "@/types";

const CHART_PERIODS = [
  { key: "1d", label: "1D" },
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "1y", label: "1Y" },
  { key: "max", label: "Max" },
];

const BOTTOM_TABS = [
  { key: "fundamentals", label: "Fundamentals" },
  { key: "analytics", label: "Analytics" },
];

const PANEL = "shadow-none flex flex-col";

export function StockDetail() {
  const { symbol = "" } = useParams();
  const [period, setPeriod] = useState("1m");
  const [bottomTab, setBottomTab] = useState<"fundamentals" | "analytics">("fundamentals");
  const { data: stock, isLoading, isError, error, refetch, isFetching } =
    useStock(symbol);
  const { data: history } = useStockHistory(symbol, period);
  const { data: analytics } = useStockAnalytics(symbol);
  const { data: stocks } = useStocks();
  const { ticks } = useWebSocket();
  const { theme } = useTheme();

  if (isError)
    return <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} />;
  if (isLoading || !stock) return <StockDetailSkeleton />;

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

      <HeaderBar stock={stock} livePrice={livePrice} points={points} volumeAnomaly={analytics?.volume_anomaly ?? null} />

      <div className="grid gap-2 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)_minmax(0,300px)] lg:items-stretch">
        {/* Left — Markets rail */}
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
            {CHART_PERIODS.map((p) => (
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
            <CandlestickChart
                points={points}
                period={period}
                height={440}
                theme={theme as "light" | "dark"}
                symbol={stock.symbol}
              />
          </div>
        </Card>

        {/* Right — recent closes */}
        <Card className={PANEL}>
          <PanelTitle>Recent closes</PanelTitle>
          <RecentCloses points={points} />
        </Card>
      </div>

      {/* Bottom tab bar */}
      <div className="border-border flex gap-1 border-b">
        {BOTTOM_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setBottomTab(t.key as "fundamentals" | "analytics")}
            className={cn(
              "relative px-4 py-2 text-sm font-medium transition-colors",
              bottomTab === t.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.key === "analytics" && analytics?.volume_anomaly?.is_anomaly && (
              <span className="ml-1 inline-flex size-1.5 rounded-full bg-amber-500" />
            )}
            {bottomTab === t.key && (
              <span className="bg-primary absolute inset-x-2 -bottom-px h-0.5 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {bottomTab === "fundamentals" && <Fundamentals stock={stock} />}
      {bottomTab === "analytics" && <AnalyticsPanel analytics={analytics} currentPrice={livePrice} />}

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
  volumeAnomaly,
}: {
  stock: TStockDetail;
  livePrice: number | null;
  points: PricePoint[];
  volumeAnomaly: VolumeAnomaly | null;
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
          {volumeAnomaly?.is_anomaly && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5">
              <Zap className="size-3.5 text-amber-500 shrink-0" />
              <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
                Volume {volumeAnomaly.direction} · z={volumeAnomaly.z_score.toFixed(1)}
              </span>
            </div>
          )}
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

/* ─────────────── Analytics panel ─────────────── */

const PERIOD_LABELS: Record<string, string> = { "1y": "1 Year", "3y": "3 Years", "5y": "5 Years", "max": "All time" };

function AnalyticsPanel({
  analytics,
  currentPrice,
}: {
  analytics: { returns: ReturnMetrics[]; volume_anomaly: VolumeAnomaly | null; support_resistance: SRLevel[] } | undefined;
  currentPrice: number | null;
}) {
  if (!analytics) return <div className="py-10 text-center text-sm text-muted">Loading analytics…</div>;

  return (
    <div className="space-y-4">
      {/* Return metrics grid */}
      {analytics.returns.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {analytics.returns.map((m) => (
            <ReturnCard key={m.period} metrics={m} />
          ))}
        </div>
      ) : (
        <Card className="shadow-none">
          <div className="py-10 text-center text-sm text-muted">Not enough price history for return metrics.</div>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Volume anomaly */}
        {analytics.volume_anomaly && (
          <Card className="shadow-none">
            <PanelTitle>Volume analysis</PanelTitle>
            <VolumeAnomalyCard anomaly={analytics.volume_anomaly} />
          </Card>
        )}

        {/* Support / resistance */}
        {analytics.support_resistance.length > 0 && (
          <Card className="shadow-none">
            <PanelTitle>Support &amp; resistance</PanelTitle>
            <SRTable levels={analytics.support_resistance} currentPrice={currentPrice} />
          </Card>
        )}
      </div>
    </div>
  );
}

function ReturnCard({ metrics: m }: { metrics: ReturnMetrics }) {
  const positive = m.cagr_pct >= 0;
  return (
    <Card className="shadow-none">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{PERIOD_LABELS[m.period] ?? m.period}</span>
          {!m.data_sufficient && (
            <span className="text-amber-500 text-[10px]">Limited data</span>
          )}
        </div>

        <div>
          <p className="text-muted-foreground text-[10px]">Total return</p>
          <p className={cn("num text-2xl font-bold", positive ? "text-gain" : "text-loss")}>
            {positive ? "+" : ""}{m.total_return_pct.toFixed(1)}%
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <MetricRow label="CAGR" value={`${m.cagr_pct >= 0 ? "+" : ""}${m.cagr_pct.toFixed(1)}%`} color={m.cagr_pct >= 0 ? "text-gain" : "text-loss"} />
          <MetricRow label="Volatility" value={`${m.annualized_vol_pct.toFixed(1)}%`} />
          <MetricRow label="Sharpe" value={m.sharpe_ratio.toFixed(2)} color={m.sharpe_ratio >= 1 ? "text-gain" : m.sharpe_ratio < 0 ? "text-loss" : undefined} />
          <MetricRow label="Max DD" value={`${m.max_drawdown_pct.toFixed(1)}%`} color="text-loss" />
          <MetricRow label="Best day" value={`+${m.best_day_pct.toFixed(1)}%`} color="text-gain" />
          <MetricRow label="Worst day" value={`${m.worst_day_pct.toFixed(1)}%`} color="text-loss" />
        </div>

        <p className="text-muted-foreground text-[10px]">{m.trading_days} trading sessions</p>
      </div>
    </Card>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <p className={cn("num font-semibold", color ?? "text-foreground")}>{value}</p>
    </div>
  );
}

function VolumeAnomalyCard({ anomaly: a }: { anomaly: VolumeAnomaly }) {
  const color = a.direction === "spike" ? "text-amber-500" : a.direction === "drought" ? "text-blue-500" : "text-muted-foreground";
  const bgColor = a.direction === "spike" ? "bg-amber-500/10" : a.direction === "drought" ? "bg-blue-500/10" : "bg-muted/30";
  const Icon = a.direction === "spike" ? TrendingUp : a.direction === "drought" ? TrendingDown : Zap;
  return (
    <div className="p-3 space-y-3">
      <div className={cn("flex items-center gap-2 rounded-lg p-3", bgColor)}>
        <Icon className={cn("size-5 shrink-0", color)} />
        <div>
          <p className={cn("font-semibold text-sm capitalize", color)}>
            {a.is_anomaly ? `Volume ${a.direction}` : "Normal volume"}
          </p>
          <p className="text-muted-foreground text-xs">z-score: {a.z_score.toFixed(2)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Current vol.</p>
          <p className="num font-semibold">{formatCompact(a.current_volume)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">20-day avg</p>
          <p className="num font-semibold">{formatCompact(a.avg_volume_20d)}</p>
        </div>
      </div>
      {/* z-score bar */}
      <div>
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("absolute top-0 h-full rounded-full transition-all", a.z_score >= 0 ? "bg-amber-500" : "bg-blue-500")}
            style={{
              left: a.z_score >= 0 ? "50%" : `${Math.max(0, 50 + (a.z_score / 4) * 50)}%`,
              width: `${Math.min(50, (Math.abs(a.z_score) / 4) * 50)}%`,
            }}
          />
          <div className="absolute top-0 left-1/2 h-full w-px bg-border" />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>Drought</span><span>Normal</span><span>Spike</span>
        </div>
      </div>
    </div>
  );
}

function SRTable({ levels, currentPrice }: { levels: SRLevel[]; currentPrice: number | null }) {
  const supports = levels.filter((l) => l.level_type === "support").sort((a, b) => b.price - a.price);
  const resistances = levels.filter((l) => l.level_type === "resistance").sort((a, b) => a.price - b.price);

  return (
    <div className="p-3 space-y-3">
      {currentPrice && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm">
          <span className="text-muted-foreground text-xs">Current</span>
          <span className="num font-bold">{formatNaira(currentPrice)}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-loss mb-1.5 text-xs font-medium uppercase tracking-wide">Resistance</p>
          <div className="space-y-1">
            {resistances.slice(0, 4).map((l) => (
              <SRRow key={l.price} level={l} />
            ))}
            {resistances.length === 0 && <p className="text-muted text-xs">—</p>}
          </div>
        </div>
        <div>
          <p className="text-gain mb-1.5 text-xs font-medium uppercase tracking-wide">Support</p>
          <div className="space-y-1">
            {supports.slice(0, 4).map((l) => (
              <SRRow key={l.price} level={l} />
            ))}
            {supports.length === 0 && <p className="text-muted text-xs">—</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SRRow({ level: l }: { level: SRLevel }) {
  const isRes = l.level_type === "resistance";
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-accent/40 text-xs">
      <span className="num font-medium">{formatNaira(l.price)}</span>
      <div className="flex items-center gap-1.5">
        <span className={cn("text-[10px]", isRes ? "text-loss" : "text-gain")}>
          {l.distance_pct >= 0 ? "+" : ""}{l.distance_pct.toFixed(1)}%
        </span>
        <span className="text-muted-foreground text-[10px]">×{l.strength}</span>
      </div>
    </div>
  );
}

/* ─────────────── Fundamentals ─────────────── */

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
