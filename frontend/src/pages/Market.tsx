import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, ChevronRight, Search, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Sparkline } from "@/components/Sparkline";
import { ChangeBadge } from "@/components/ChangeBadge";
import { CenteredSpinner } from "@/components/ui/Spinner";
import { useDefaultWatchlist, useStocks, useWatchlistToggle } from "@/hooks/useStockData";
import { useAuthStore } from "@/store/authStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useFlash } from "@/hooks/useFlash";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import { formatCompact, formatNaira, formatNumber } from "@/lib/format";
import type { PriceTick, StockRow } from "@/types";

type SortKey = "symbol" | "last_price" | "change_percent" | "volume" | "market_cap" | "pe_ratio";
type Tab = "all" | "gainers" | "losers" | "active" | "watch";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "gainers", label: "Gainers" },
  { key: "losers", label: "Losers" },
  { key: "active", label: "Most active" },
  { key: "watch", label: "Watchlist" },
];

const WATCH_KEY = "ngx-watchlist";

function useWatchlist() {
  const [set, setSet] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(WATCH_KEY) ?? "[]"));
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    localStorage.setItem(WATCH_KEY, JSON.stringify([...set]));
  }, [set]);
  const toggle = (sym: string) =>
    setSet((prev) => {
      const next = new Set(prev);
      next.has(sym) ? next.delete(sym) : next.add(sym);
      return next;
    });
  return { set, toggle };
}

function useServerWatchlist() {
  const isAuthed = useAuthStore((s) => Boolean(s.accessToken));
  const { data: wl } = useDefaultWatchlist();
  const toggle = useWatchlistToggle();
  const symbols = new Set((wl?.items ?? []).map((i) => i.stock.symbol));
  return {
    set: symbols,
    toggle: (sym: string) => {
      if (!wl) return;
      toggle.mutate({ watchlistId: wl.id, symbol: sym, add: !symbols.has(sym) });
    },
    ready: isAuthed,
  };
}

export function Market() {
  const { data: stocks, isLoading } = useStocks({ spark: true });
  const { ticks } = useWebSocket();
  const isAuthed = useAuthStore((s) => Boolean(s.accessToken));
  const localWatch = useWatchlist();
  const serverWatch = useServerWatchlist();
  const watch = isAuthed ? serverWatch : localWatch;
  const requireAuth = useRequireAuth();
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("all");
  const [tab, setTab] = useState<Tab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [asc, setAsc] = useState(false);

  const sectors = useMemo(
    () => Array.from(new Set((stocks ?? []).map((s) => s.sector).filter(Boolean))).sort(),
    [stocks],
  );

  const rows = useMemo(() => {
    let list = stocks ?? [];
    if (sector !== "all") list = list.filter((s) => s.sector === sector);
    if (tab === "gainers") list = list.filter((s) => (s.change_percent ?? 0) > 0);
    else if (tab === "losers") list = list.filter((s) => (s.change_percent ?? 0) < 0);
    else if (tab === "watch") list = list.filter((s) => watch.set.has(s.symbol));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
      );
    }
    const key: SortKey = tab === "active" ? "volume" : sortKey;
    const dir = (tab === "active" ? false : asc) ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[key] ?? (key === "symbol" ? "" : -Infinity);
      const bv = b[key] ?? (key === "symbol" ? "" : -Infinity);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [stocks, sector, tab, search, sortKey, asc, watch.set]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "symbol");
    }
  };

  if (isLoading) return <CenteredSpinner />;

  return (
    <div className="animate-rise space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Market</h1>
          <p className="num text-muted-foreground mt-0.5 text-sm">
            {rows.length} of {stocks?.length ?? 0} listings · Nigerian Exchange
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-9 w-44 pl-8"
            />
          </div>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <option value="all">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s!}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="border-border flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="bg-primary absolute inset-x-2 -bottom-px h-0.5 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden p-0 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs">
                <th className="w-8 py-2.5 pl-3" />
                <th className="py-2.5 pr-3 text-left font-medium">Token</th>
                <SortTh label="Price" k="last_price" sortKey={sortKey} asc={asc} on={toggleSort} />
                <SortTh label="Change" k="change_percent" sortKey={sortKey} asc={asc} on={toggleSort} />
                <th className="px-3 py-2.5 text-left font-medium">52W range</th>
                <SortTh label="Volume" k="volume" sortKey={sortKey} asc={asc} on={toggleSort} />
                <SortTh label="Mkt cap" k="market_cap" sortKey={sortKey} asc={asc} on={toggleSort} />
                <SortTh label="P/E" k="pe_ratio" sortKey={sortKey} asc={asc} on={toggleSort} />
                <th className="px-3 py-2.5 text-right font-medium">Div yield</th>
                <th className="px-3 py-2.5 text-center font-medium">Chart</th>
                <th className="w-10 py-2.5 pr-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <MarketRow
                  key={s.id}
                  stock={s}
                  tick={ticks[s.symbol]}
                  starred={watch.set.has(s.symbol)}
                  onStar={() =>
                    requireAuth(
                      () => watch.toggle(s.symbol),
                      "Sign in to build your watchlist and keep it across devices.",
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="text-muted-foreground px-5 py-12 text-center text-sm">
            No stocks match your filters.
          </p>
        )}
      </Card>
    </div>
  );
}

function SortTh({
  label,
  k,
  sortKey,
  asc,
  on,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  asc: boolean;
  on: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <th className="px-3 py-2.5 text-right font-medium">
      <button
        onClick={() => on(k)}
        className={cn(
          "ml-auto inline-flex items-center gap-1 hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <ArrowUpDown className={cn("size-3", active && asc && "rotate-180")} />
      </button>
    </th>
  );
}

function MarketRow({
  stock,
  tick,
  starred,
  onStar,
}: {
  stock: StockRow;
  tick?: PriceTick;
  starred: boolean;
  onStar: () => void;
}) {
  const navigate = useNavigate();
  const price = tick?.price ?? stock.last_price;
  const chg = tick?.change_percent ?? stock.change_percent;
  const flash = useFlash(price);
  const go = () => navigate(`/stocks/${stock.symbol}`);

  return (
    <tr
      onClick={go}
      className="border-border/50 hover:bg-accent/40 cursor-pointer border-b last:border-0"
    >
      <td className="py-2.5 pl-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onStar}
          aria-label={starred ? "Remove from watchlist" : "Add to watchlist"}
          className="text-muted-foreground hover:text-brass grid place-items-center"
        >
          <Star className={cn("size-4", starred && "fill-brass text-brass")} />
        </button>
      </td>

      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2.5">
          <CompanyLogo src={stock.logo_url} symbol={stock.symbol} size={28} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="num text-foreground font-semibold">{stock.symbol}</span>
              {stock.sector && (
                <Badge variant="brand" className="hidden px-1.5 py-0 text-[10px] sm:inline-flex">
                  {stock.sector}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground max-w-[14rem] truncate text-xs">{stock.name}</p>
          </div>
        </div>
      </td>

      <td
        className={cn(
          "num px-3 py-2.5 text-right font-medium transition-colors duration-500",
          flash === "up" && "bg-gain/15",
          flash === "down" && "bg-loss/15",
        )}
      >
        {formatNaira(price)}
      </td>

      <td className="px-3 py-2.5 text-right">
        <div className="flex justify-end">
          <ChangeBadge changePercent={chg} />
        </div>
      </td>

      <td className="px-3 py-2.5">
        <RangeBar low={stock.week52_low} high={stock.week52_high} price={price} />
      </td>

      <td className="num text-foreground px-3 py-2.5 text-right">{formatCompact(stock.volume)}</td>
      <td className="num text-foreground px-3 py-2.5 text-right">
        ₦{formatCompact(stock.market_cap)}
      </td>
      <td className="num text-muted-foreground px-3 py-2.5 text-right">
        {formatNumber(stock.pe_ratio, 2)}
      </td>
      <td className="num text-muted-foreground px-3 py-2.5 text-right">
        {stock.dividend_yield != null ? `${formatNumber(stock.dividend_yield, 2)}%` : "—"}
      </td>

      <td className="px-3 py-2.5">
        <div className="flex justify-center">
          <Sparkline data={stock.spark} width={88} height={30} />
        </div>
      </td>

      <td className="py-2.5 pr-3 text-right">
        <ChevronRight className="text-muted-foreground ml-auto size-4" />
      </td>
    </tr>
  );
}

function RangeBar({
  low,
  high,
  price,
}: {
  low: number | null;
  high: number | null;
  price: number | null;
}) {
  if (low == null || high == null || price == null || high <= low) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const pct = Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100));
  return (
    <div className="w-32">
      <div className="bg-muted relative h-1.5 rounded-full">
        <div
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="num text-muted-foreground mt-1 flex justify-between text-[10px]">
        <span>{formatCompact(low)}</span>
        <span>{formatCompact(high)}</span>
      </div>
    </div>
  );
}
