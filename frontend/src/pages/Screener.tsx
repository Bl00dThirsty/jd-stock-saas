import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Download, Filter, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/CompanyLogo";
import { ChangeBadge } from "@/components/ChangeBadge";
import { CenteredSpinner } from "@/components/ui/Spinner";
import { formatNaira, formatCompact, formatNumber } from "@/lib/format";
import { useScreener, useStocks, type ScreenerParams } from "@/hooks/useStockData";
import { cn } from "@/lib/utils";
import { VITE_API_BASE_URL } from "@/services/api";

const DEFAULT_PARAMS: ScreenerParams = {
  sort_by: "market_cap",
  sort_dir: "desc",
  limit: 100,
  offset: 0,
};

type SortKey = "symbol" | "last_price" | "change_percent" | "volume" | "market_cap" | "pe_ratio" | "dividend_yield";

export function Screener() {
  const { data: allStocks } = useStocks();
  const sectors = [...new Set((allStocks ?? []).map((s) => s.sector).filter(Boolean))].sort() as string[];

  const [filters, setFilters] = useState<ScreenerParams>(DEFAULT_PARAMS);
  const [showFilters, setShowFilters] = useState(true);
  const { data, isLoading } = useScreener(filters);
  const navigate = useNavigate();

  const set = (patch: Partial<ScreenerParams>) => setFilters((f) => ({ ...f, ...patch, offset: 0 }));
  const clearFilters = () => setFilters(DEFAULT_PARAMS);

  const activeFilterCount = [
    filters.sector, filters.pe_min, filters.pe_max, filters.cap_min, filters.cap_max,
    filters.vol_min, filters.div_yield_min, filters.change_pct_min, filters.change_pct_max,
    filters.week52_pct_from_high,
  ].filter((v) => v !== undefined && v !== "").length;

  const toggleSort = (key: SortKey) => {
    if (filters.sort_by === key) {
      set({ sort_dir: filters.sort_dir === "asc" ? "desc" : "asc" });
    } else {
      set({ sort_by: key, sort_dir: key === "symbol" ? "asc" : "desc" });
    }
  };

  const exportUrl = () => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && v !== null) p.set(k, String(v));
    });
    return `${VITE_API_BASE_URL}/screener/export/csv?${p.toString()}`;
  };

  return (
    <div className="animate-rise space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">Screener</h1>
          <p className="mt-1 text-sm text-muted">
            {data ? `${data.total} results` : "Filter NGX listings by fundamentals."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters((v) => !v)}
            className="gap-1.5"
          >
            <Filter className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="brand" className="ml-0.5 px-1.5 py-0 text-[10px]">{activeFilterCount}</Badge>
            )}
          </Button>
          <a href={exportUrl()} download="ngx_screener.csv">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Download className="size-4" /> Export CSV
            </Button>
          </a>
        </div>
      </div>

      {showFilters && (
        <Card className="shadow-none">
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Sector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Sector</label>
              <select
                value={filters.sector ?? ""}
                onChange={(e) => set({ sector: e.target.value || undefined })}
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm focus-visible:border-ring focus-visible:outline-none"
              >
                <option value="">All sectors</option>
                {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* P/E */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">P/E ratio</label>
              <div className="flex gap-1.5">
                <Input
                  type="number" placeholder="Min" min={0}
                  value={filters.pe_min ?? ""}
                  onChange={(e) => set({ pe_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="h-9"
                />
                <Input
                  type="number" placeholder="Max" min={0}
                  value={filters.pe_max ?? ""}
                  onChange={(e) => set({ pe_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="h-9"
                />
              </div>
            </div>

            {/* Market cap */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Market cap (₦B)</label>
              <div className="flex gap-1.5">
                <Input
                  type="number" placeholder="Min" min={0}
                  value={filters.cap_min != null ? filters.cap_min / 1e9 : ""}
                  onChange={(e) => set({ cap_min: e.target.value ? Number(e.target.value) * 1e9 : undefined })}
                  className="h-9"
                />
                <Input
                  type="number" placeholder="Max" min={0}
                  value={filters.cap_max != null ? filters.cap_max / 1e9 : ""}
                  onChange={(e) => set({ cap_max: e.target.value ? Number(e.target.value) * 1e9 : undefined })}
                  className="h-9"
                />
              </div>
            </div>

            {/* Volume */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Min volume</label>
              <Input
                type="number" placeholder="e.g. 500000" min={0}
                value={filters.vol_min ?? ""}
                onChange={(e) => set({ vol_min: e.target.value ? Number(e.target.value) : undefined })}
                className="h-9"
              />
            </div>

            {/* Dividend yield */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Min div yield (%)</label>
              <Input
                type="number" placeholder="e.g. 3" min={0} max={100} step={0.1}
                value={filters.div_yield_min ?? ""}
                onChange={(e) => set({ div_yield_min: e.target.value ? Number(e.target.value) : undefined })}
                className="h-9"
              />
            </div>

            {/* Change % */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Change % today</label>
              <div className="flex gap-1.5">
                <Input
                  type="number" placeholder="Min" step={0.1}
                  value={filters.change_pct_min ?? ""}
                  onChange={(e) => set({ change_pct_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="h-9"
                />
                <Input
                  type="number" placeholder="Max" step={0.1}
                  value={filters.change_pct_max ?? ""}
                  onChange={(e) => set({ change_pct_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="h-9"
                />
              </div>
            </div>

            {/* 52W proximity */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Within % of 52W high</label>
              <Input
                type="number" placeholder="e.g. 5" min={0} max={100} step={1}
                value={filters.week52_pct_from_high ?? ""}
                onChange={(e) => set({ week52_pct_from_high: e.target.value ? Number(e.target.value) : undefined })}
                className="h-9"
              />
            </div>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <div className="flex items-end">
                <Button size="sm" variant="ghost" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
                  <X className="size-4" /> Clear filters
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {isLoading ? (
        <CenteredSpinner />
      ) : (
        <Card className="overflow-hidden p-0 shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b text-xs">
                  <th className="py-2.5 pl-4 text-left font-medium">Stock</th>
                  <SortTh label="Price" k="last_price" filters={filters} onSort={toggleSort} />
                  <SortTh label="Change" k="change_percent" filters={filters} onSort={toggleSort} />
                  <SortTh label="Volume" k="volume" filters={filters} onSort={toggleSort} />
                  <SortTh label="Mkt cap" k="market_cap" filters={filters} onSort={toggleSort} />
                  <SortTh label="P/E" k="pe_ratio" filters={filters} onSort={toggleSort} />
                  <SortTh label="Div yield" k="dividend_yield" filters={filters} onSort={toggleSort} />
                  <th className="w-10 py-2.5 pr-4" />
                </tr>
              </thead>
              <tbody>
                {(data?.stocks ?? []).map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/stocks/${s.symbol}`)}
                    className="border-border/50 hover:bg-accent/40 cursor-pointer border-b last:border-0"
                  >
                    <td className="py-2.5 pl-4">
                      <div className="flex items-center gap-2.5">
                        <CompanyLogo src={s.logo_url} symbol={s.symbol} size={28} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="num font-semibold">{s.symbol}</span>
                            {s.sector && (
                              <Badge variant="brand" className="hidden px-1.5 py-0 text-[10px] sm:inline-flex">{s.sector}</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground max-w-[180px] truncate text-xs">{s.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="num px-3 py-2.5 text-right font-medium">{formatNaira(s.last_price)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end"><ChangeBadge changePercent={s.change_percent} /></div>
                    </td>
                    <td className="num text-muted-foreground px-3 py-2.5 text-right">{formatCompact(s.volume)}</td>
                    <td className="num text-muted-foreground px-3 py-2.5 text-right">₦{formatCompact(s.market_cap)}</td>
                    <td className="num text-muted-foreground px-3 py-2.5 text-right">{formatNumber(s.pe_ratio, 2)}</td>
                    <td className="num text-muted-foreground px-3 py-2.5 text-right">
                      {s.dividend_yield != null ? `${formatNumber(s.dividend_yield, 2)}%` : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <ChevronRight className="text-muted-foreground ml-auto size-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(data?.stocks ?? []).length === 0 && (
            <p className="text-muted-foreground px-5 py-12 text-center text-sm">
              No stocks match your filters.
            </p>
          )}
        </Card>
      )}

      {/* Pagination */}
      {data && data.total > (filters.limit ?? 100) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {(filters.offset ?? 0) + 1}–{Math.min((filters.offset ?? 0) + (filters.limit ?? 100), data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <Button
              size="sm" variant="outline"
              disabled={(filters.offset ?? 0) === 0}
              onClick={() => set({ offset: Math.max(0, (filters.offset ?? 0) - (filters.limit ?? 100)) })}
            >
              Previous
            </Button>
            <Button
              size="sm" variant="outline"
              disabled={(filters.offset ?? 0) + (filters.limit ?? 100) >= data.total}
              onClick={() => set({ offset: (filters.offset ?? 0) + (filters.limit ?? 100) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortTh({
  label, k, filters, onSort,
}: {
  label: string;
  k: SortKey;
  filters: ScreenerParams;
  onSort: (k: SortKey) => void;
}) {
  const active = filters.sort_by === k;
  return (
    <th className="px-3 py-2.5 text-right font-medium">
      <button
        onClick={() => onSort(k)}
        className={cn("ml-auto inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
      >
        {label}
        <span className={cn("text-[10px] opacity-50", active && "opacity-100")}>
          {active ? (filters.sort_dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}
