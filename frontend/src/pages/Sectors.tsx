import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CompanyLogo } from "@/components/CompanyLogo";
import { SectorsSkeleton } from "@/components/Skeletons";
import { ErrorState } from "@/components/ErrorState";
import { formatCompact, formatNaira, formatNumber } from "@/lib/format";
import { useSectors } from "@/hooks/useStockData";
import { cn } from "@/lib/utils";
import type { SectorDetail } from "@/types";

export function Sectors() {
  const { data: sectors, isLoading, isError, error, refetch, isFetching } =
    useSectors();
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  if (isError)
    return <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} />;
  if (isLoading) return <SectorsSkeleton />;
  if (!sectors?.length) return <p className="text-muted p-8 text-center text-sm">No sector data available.</p>;

  const totalCap = sectors.reduce((s, x) => s + x.total_market_cap, 0);
  const advancing = sectors.filter((s) => s.avg_change_percent > 0).length;

  const selectedSector = sectors.find((s) => s.sector === selected) ?? null;

  return (
    <div className="animate-rise space-y-5">
      <header>
        <h1 className="font-display text-3xl text-ink">Sectors</h1>
        <p className="mt-1 text-sm text-muted">
          {sectors.length} sectors · {advancing} advancing · {sectors.length - advancing} declining
        </p>
      </header>

      {/* Market cap summary strip */}
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {sectors.map((s) => (
          <div
            key={s.sector}
            style={{ width: `${totalCap > 0 ? (s.total_market_cap / totalCap) * 100 : 0}%` }}
            className={cn(
              "h-full transition-opacity",
              s.avg_change_percent > 1 ? "bg-gain" :
              s.avg_change_percent > 0 ? "bg-gain/60" :
              s.avg_change_percent < -1 ? "bg-loss" : "bg-loss/50"
            )}
            title={`${s.sector}: ${s.avg_change_percent >= 0 ? "+" : ""}${s.avg_change_percent}%`}
          />
        ))}
      </div>

      <div className={cn("grid gap-4", selectedSector ? "lg:grid-cols-[1fr_360px]" : "")}>
        {/* Trading-board grid — solid green/red tiles, sharp angles, theme-aware gutters */}
        <div className="grid grid-cols-2 gap-[3px] self-start bg-border p-[3px] sm:grid-cols-3 xl:grid-cols-4">
          {sectors.map((s) => (
            <SectorTile
              key={s.sector}
              sector={s}
              active={selected === s.sector}
              onClick={() => setSelected(selected === s.sector ? null : s.sector)}
            />
          ))}
        </div>

        {/* Detail panel */}
        {selectedSector && (
          <SectorPanel
            sector={selectedSector}
            onClose={() => setSelected(null)}
            onViewAll={() => navigate(`/market?sector=${encodeURIComponent(selectedSector.sector)}`)}
          />
        )}
      </div>
    </div>
  );
}

function SectorTile({
  sector: s,
  active,
  onClick,
}: {
  sector: SectorDetail;
  active: boolean;
  onClick: () => void;
}) {
  const pct = s.avg_change_percent;
  const up = pct >= 0;

  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: up ? "#0f9d4f" : "#d12b22" }}
      className={cn(
        "relative flex min-h-[132px] flex-col justify-between overflow-hidden p-3 text-left text-white transition-[filter] hover:brightness-110",
        active && "z-10 ring-2 ring-inset ring-white",
      )}
    >
      {/* glossy board sheen */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/15" />

      {/* sector + listings */}
      <div className="relative">
        <p className="text-sm font-semibold uppercase leading-tight tracking-wide">{s.sector}</p>
        <p className="text-[11px] text-white/70">{s.stock_count} listings</p>
      </div>

      {/* headline: average change % + direction triangle */}
      <p className="num relative flex items-center gap-1.5 text-3xl font-bold leading-none">
        {up ? "+" : ""}
        {pct.toFixed(2)}%
        <span className="text-xl leading-none">{up ? "▲" : "▼"}</span>
      </p>

      {/* board-style sub-stats */}
      <div className="relative grid grid-cols-3 gap-2">
        <BoardStat label="Adv" value={String(s.advancers)} />
        <BoardStat label="Dec" value={String(s.decliners)} />
        <BoardStat label="Mkt Cap" value={`₦${formatCompact(s.total_market_cap)}`} />
      </div>
    </button>
  );
}

function BoardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="leading-tight">
      <p className="text-[9px] uppercase tracking-wide text-white/55">{label}</p>
      <p className="num text-[11px] font-semibold text-white">{value}</p>
    </div>
  );
}

function SectorPanel({
  sector: s,
  onClose,
  onViewAll,
}: {
  sector: SectorDetail;
  onClose: () => void;
  onViewAll: () => void;
}) {
  const up = s.avg_change_percent >= 0;
  return (
    <Card className="shadow-none self-start sticky top-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-semibold">{s.sector}</h2>
            <p className="text-muted-foreground text-sm">{s.stock_count} listed companies</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2">
          <Kpi label="Avg change" value={`${up ? "+" : ""}${s.avg_change_percent.toFixed(2)}%`} color={up ? "text-gain" : "text-loss"} />
          <Kpi label="Market cap" value={`₦${formatCompact(s.total_market_cap)}`} />
          <Kpi label="Advancers" value={String(s.advancers)} color="text-gain" />
          <Kpi label="Decliners" value={String(s.decliners)} color="text-loss" />
          {s.avg_pe_ratio && <Kpi label="Avg P/E" value={formatNumber(s.avg_pe_ratio, 1)} />}
          {s.avg_dividend_yield && <Kpi label="Avg div yield" value={`${formatNumber(s.avg_dividend_yield, 2)}%`} />}
        </div>

        {/* Advancers/Decliners bar */}
        <div>
          <p className="text-muted-foreground mb-1 text-xs">Market breadth</p>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gain rounded-l-full"
              style={{ width: `${s.stock_count > 0 ? (s.advancers / s.stock_count) * 100 : 0}%` }}
            />
            <div
              className="h-full bg-loss rounded-r-full"
              style={{ width: `${s.stock_count > 0 ? (s.decliners / s.stock_count) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Top by cap */}
        {s.top_by_cap.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Top by market cap</p>
            <div className="space-y-1">
              {s.top_by_cap.slice(0, 4).map((stock) => (
                <MiniRow key={stock.symbol} stock={stock} />
              ))}
            </div>
          </div>
        )}

        {/* Movers */}
        <div className="grid grid-cols-2 gap-3">
          {s.top_gainers.length > 0 && (
            <div>
              <p className="text-gain mb-1.5 flex items-center gap-1 text-xs font-medium">
                <TrendingUp className="size-3" /> Gainers
              </p>
              {s.top_gainers.map((stock) => (
                <MiniRow key={stock.symbol} stock={stock} compact />
              ))}
            </div>
          )}
          {s.top_losers.length > 0 && (
            <div>
              <p className="text-loss mb-1.5 flex items-center gap-1 text-xs font-medium">
                <TrendingDown className="size-3" /> Losers
              </p>
              {s.top_losers.map((stock) => (
                <MiniRow key={stock.symbol} stock={stock} compact />
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onViewAll}
          className="text-primary hover:underline w-full text-center text-sm font-medium"
        >
          View all {s.stock_count} stocks →
        </button>
      </div>
    </Card>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2">
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <p className={cn("num mt-0.5 text-sm font-semibold", color ?? "text-foreground")}>{value}</p>
    </div>
  );
}

function MiniRow({ stock: s, compact }: { stock: { symbol: string; name: string; logo_url: string | null; last_price: number | null; change_percent: number | null }; compact?: boolean }) {
  const navigate = useNavigate();
  const up = (s.change_percent ?? 0) >= 0;
  return (
    <button
      onClick={() => navigate(`/stocks/${s.symbol}`)}
      className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 hover:bg-accent/50 text-left"
    >
      <CompanyLogo src={s.logo_url} symbol={s.symbol} size={20} />
      <span className="num text-foreground flex-1 truncate text-xs font-medium">{s.symbol}</span>
      {!compact && <span className="num text-muted-foreground text-xs">{formatNaira(s.last_price)}</span>}
      <span className={cn("num text-xs font-medium", up ? "text-gain" : "text-loss")}>
        {up ? "+" : ""}{formatNumber(s.change_percent, 2)}%
      </span>
    </button>
  );
}
