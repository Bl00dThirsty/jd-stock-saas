import { Link } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Bell,
  Building2,
  Gauge,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangeBadge } from "@/components/ChangeBadge";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Sparkline } from "@/components/Sparkline";
import { CenteredSpinner } from "@/components/ui/Spinner";
import { useMarketSummary, useAlerts } from "@/hooks/useStockData";
import { cn } from "@/lib/utils";
import { formatCompact, formatNaira, formatPercent } from "@/lib/format";
import type { Alert, MarketMover, MarketSummary, SectorPerf } from "@/types";

const naira = (v: number | null | undefined) => `₦${formatCompact(v)}`;

export function Dashboard() {
  const { data: summary, isLoading } = useMarketSummary();
  const { data: alerts } = useAlerts();

  if (isLoading || !summary) return <CenteredSpinner />;

  const triggered = (alerts ?? []).filter((a) => a.is_triggered);

  return (
    <div className="animate-rise space-y-3">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Market overview</h1>
          <p className="num text-muted-foreground mt-0.5 text-sm">
            Nigerian Exchange
          </p>
        </div>
        <p className="num hidden text-sm text-muted sm:block">
          {new Date().toLocaleDateString("en-NG", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </p>
      </header>

      <KpiBand summary={summary} triggeredCount={triggered.length} />

      <div className="grid gap-3 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SectorCard sectors={summary.sectors} />
        </div>
        <div className="grid gap-3 lg:col-span-3 sm:grid-cols-2">
          <MoversCard
            title="Top gainers"
            icon={<TrendingUp className="size-5 text-gain" />}
            movers={summary.top_gainers}
          />
          <MoversCard
            title="Top losers"
            icon={<TrendingDown className="size-5 text-loss" />}
            movers={summary.top_losers}
          />
        </div>
      </div>

      <AlertsCard alerts={triggered} />
    </div>
  );
}

/* ─────────────── KPI band ─────────────── */

function KpiBand({
  summary,
  triggeredCount,
}: {
  summary: MarketSummary;
  triggeredCount: number;
}) {
  const breadth = summary.advancers + summary.decliners + summary.unchanged || 1;
  const sentiment = summary.avg_change_percent;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        icon={<Building2 className="size-4 text-faint" />}
        label="Total market cap"
        value={naira(summary.total_market_cap)}
        deltaPct={summary.market_cap_change_pct}
        spark={summary.market_cap_series}
      />
      <Kpi
        icon={<Banknote className="size-4 text-faint" />}
        label="Value traded"
        value={naira(summary.total_volume)}
        deltaPct={summary.value_change_pct}
      >
        <p className="mt-2 text-xs text-faint">across {breadth} listings</p>
      </Kpi>

      {/* Market sentiment — breadth-driven, a daily read (no month delta) */}
      <Kpi
        icon={<Gauge className="size-4 text-faint" />}
        label="Market sentiment"
        value={formatPercent(sentiment)}
        valueTone={sentiment > 0 ? "gain" : sentiment < 0 ? "loss" : undefined}
      >
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="bg-gain" style={{ width: `${(summary.advancers / breadth) * 100}%` }} />
          <div className="bg-faint/40" style={{ width: `${(summary.unchanged / breadth) * 100}%` }} />
          <div className="bg-loss" style={{ width: `${(summary.decliners / breadth) * 100}%` }} />
        </div>
        <p className="num mt-2 text-xs text-muted">
          <span className="text-gain">{summary.advancers}↑</span>
          {" · "}
          <span className="text-loss">{summary.decliners}↓</span>
          {" · "}
          <span className="text-faint">{summary.unchanged}→</span>
        </p>
      </Kpi>

      <Link to="/alerts" className="block">
        <Kpi
          icon={<Bell className="size-4 text-brass" />}
          label="Triggered alerts"
          value={String(triggeredCount)}
          accent={triggeredCount > 0}
        >
          <p className="mt-2 text-xs text-faint">
            {triggeredCount ? "tap to review →" : "none firing"}
          </p>
        </Kpi>
      </Link>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  deltaPct,
  deltaLabel = "vs last month",
  valueTone,
  accent,
  spark,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  deltaPct?: number;
  deltaLabel?: string;
  valueTone?: "gain" | "loss";
  accent?: boolean;
  spark?: number[];
  children?: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col p-5",
        accent && "ring-1 ring-brass/40",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-faint">{label}</span>
        {icon}
      </div>

      <p
        className={cn(
          "num mt-2 text-[28px] font-semibold leading-tight",
          valueTone === "gain" ? "text-gain" : valueTone === "loss" ? "text-loss" : "text-ink",
        )}
      >
        {value}
      </p>

      {deltaPct !== undefined && <DeltaCaption pct={deltaPct} label={deltaLabel} />}
      {children}

      {spark && spark.length > 1 && (
        <div className="mt-auto pt-3">
          <Sparkline data={spark} width={220} height={34} className="w-full" />
        </div>
      )}
    </Card>
  );
}

function DeltaCaption({ pct, label }: { pct: number; label: string }) {
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="mt-2 flex items-center gap-1 text-xs">
      <Icon className={cn("size-3.5", up ? "text-gain" : "text-loss")} aria-hidden />
      <span className={cn("num font-medium", up ? "text-gain" : "text-loss")}>
        {formatPercent(pct)}
      </span>
      <span className="text-faint">{label}</span>
    </p>
  );
}

/* ─────────────── Sector performance ─────────────── */

function SectorCard({ sectors }: { sectors: SectorPerf[] }) {
  const maxAbs = Math.max(0.5, ...sectors.map((s) => Math.abs(s.avg_change_percent)));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4 text-brand-600" />
          Sector performance
        </CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        {sectors.length === 0 ? (
          <p className="text-sm text-faint">Awaiting the first price collection.</p>
        ) : (
          <ul className="space-y-2.5">
            {sectors.map((s) => {
              const up = s.avg_change_percent >= 0;
              const width = (Math.abs(s.avg_change_percent) / maxAbs) * 50;
              return (
                <li key={s.sector} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-ink">{s.sector}</span>
                      <span className="num text-xs text-faint">{s.count}</span>
                    </div>
                    {/* Diverging bar centred at 0 */}
                    <div className="relative mt-1 h-1.5 rounded-full bg-surface-2">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
                      <div
                        className={cn(
                          "absolute inset-y-0 rounded-full",
                          up ? "bg-gain" : "bg-loss",
                        )}
                        style={
                          up
                            ? { left: "50%", width: `${width}%` }
                            : { right: "50%", width: `${width}%` }
                        }
                      />
                    </div>
                  </div>
                  <span
                    className={cn(
                      "num w-16 text-right text-sm font-medium",
                      up ? "text-gain" : "text-loss",
                    )}
                  >
                    {formatPercent(s.avg_change_percent)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/* ─────────────── Movers ─────────────── */

function MoversCard({
  title,
  icon,
  movers,
}: {
  title: string;
  icon: React.ReactNode;
  movers: MarketMover[];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        {movers.length === 0 ? (
          <p className="text-sm text-faint">Awaiting the first price collection.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {movers.map((m, i) => (
              <li key={m.symbol}>
                <Link
                  to={`/stocks/${m.symbol}`}
                  className="flex items-center gap-3 py-2.5 hover:opacity-90"
                >
                  <span className="num w-4 text-xs text-faint">{i + 1}</span>
                  <CompanyLogo src={m.logo_url} symbol={m.symbol} size={20} />
                  <div className="min-w-0 flex-1">
                    <p className="num text-sm font-semibold text-ink">{m.symbol}</p>
                    <p className="num truncate text-[11px] text-faint">
                      Vol {formatCompact(m.volume)} · {naira(m.market_cap)}
                    </p>
                  </div>
                  <Sparkline data={m.spark} width={64} height={26} />
                  <div className="w-[5.5rem] text-right">
                    <p className="num text-sm text-ink">{formatNaira(m.last_price)}</p>
                    <ChangeBadge changePercent={m.change_percent} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/* ─────────────── Triggered alerts ─────────────── */

function AlertsCard({ alerts }: { alerts: Alert[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4 text-brass" />
          Triggered alerts
        </CardTitle>
        <Link to="/alerts" className="text-sm font-medium text-brand-600 hover:underline">
          Manage
        </Link>
      </CardHeader>
      <CardBody>
        {alerts.length === 0 ? (
          <p className="text-sm text-faint">
            No alerts have triggered. Set price alerts to get notified here.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-line bg-surface-2/40 px-3 py-2"
              >
                <span className="num text-sm font-medium text-ink">{a.symbol}</span>
                <Badge variant="brass">
                  {a.direction} {formatNaira(a.target_price)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
