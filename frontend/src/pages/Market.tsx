import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { CenteredSpinner } from "@/components/ui/Spinner";
import { useStocks } from "@/hooks/useStockData";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";
import { formatCompact, formatNaira } from "@/lib/format";
import type { Stock } from "@/types";

type SortKey = "symbol" | "last_price" | "change_percent" | "volume";

export function Market() {
  const { data: stocks, isLoading } = useStocks();
  const { ticks } = useWebSocket();
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [asc, setAsc] = useState(true);

  const sectors = useMemo(
    () => Array.from(new Set((stocks ?? []).map((s) => s.sector).filter(Boolean))).sort(),
    [stocks],
  );

  const rows = useMemo(() => {
    let list = stocks ?? [];
    if (sector !== "all") list = list.filter((s) => s.sector === sector);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
      );
    }
    const dir = asc ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? (sortKey === "symbol" ? "" : -Infinity);
      const bv = b[sortKey] ?? (sortKey === "symbol" ? "" : -Infinity);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [stocks, sector, search, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "symbol");
    }
  };

  if (isLoading) return <CenteredSpinner />;

  return (
    <div className="animate-rise space-y-5">
      <header>
        <h1 className="font-display text-3xl text-ink">Market</h1>
        <p className="num mt-1 text-sm text-muted">{rows.length} listings</p>
      </header>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol or company…"
            className="h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />
        </div>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none"
        >
          <option value="all">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s!}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-faint">
                <Th onClick={() => toggleSort("symbol")} active={sortKey === "symbol"}>
                  Symbol
                </Th>
                <th className="px-3 py-3 font-medium">Name</th>
                <Th onClick={() => toggleSort("last_price")} active={sortKey === "last_price"} right>
                  Price
                </Th>
                <Th
                  onClick={() => toggleSort("change_percent")}
                  active={sortKey === "change_percent"}
                  right
                >
                  Change
                </Th>
                <Th onClick={() => toggleSort("volume")} active={sortKey === "volume"} right>
                  Volume
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <Row key={s.id} stock={s} live={ticks[s.symbol]?.price} />
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-faint">
            No stocks match your filters.
          </p>
        )}
      </Card>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  right,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  right?: boolean;
}) {
  return (
    <th className={cn("px-3 py-3 font-medium first:pl-5", right && "text-right")}>
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-ink",
          active && "text-ink",
        )}
      >
        {children}
        <ArrowUpDown className="size-3" />
      </button>
    </th>
  );
}

function Row({ stock, live }: { stock: Stock; live?: number }) {
  const price = live ?? stock.last_price;
  return (
    <tr className="border-b border-line/50 last:border-0 hover:bg-surface-2/50">
      <td className="px-5 py-3">
        <Link
          to={`/stocks/${stock.symbol}`}
          className="num font-semibold text-ink hover:text-brand-600"
        >
          {stock.symbol}
        </Link>
      </td>
      <td className="max-w-[16rem] truncate px-3 py-3 text-muted">{stock.name}</td>
      <td className="num px-3 py-3 text-right text-ink">{formatNaira(price)}</td>
      <td className="px-3 py-3 text-right">
        <ChangeBadge changePercent={stock.change_percent} />
      </td>
      <td className="num px-3 py-3 text-right text-muted">{formatCompact(stock.volume)}</td>
    </tr>
  );
}
