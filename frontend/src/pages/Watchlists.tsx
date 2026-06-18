import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Edit2, Plus, Star, Trash2, X } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/CompanyLogo";
import { ChangeBadge } from "@/components/ChangeBadge";
import { CenteredSpinner } from "@/components/ui/Spinner";
import { formatNaira, formatCompact } from "@/lib/format";
import {
  useWatchlist,
  useWatchlists,
  useCreateWatchlist,
  useRenameWatchlist,
  useDeleteWatchlist,
  useWatchlistToggle,
} from "@/hooks/useStockData";
import type { WatchlistSummary } from "@/types";

export function Watchlists() {
  const { data: lists, isLoading } = useWatchlists();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const createWl = useCreateWatchlist();

  const activeId = selectedId ?? lists?.[0]?.id ?? null;

  if (isLoading) return <CenteredSpinner />;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const wl = await createWl.mutateAsync(newName.trim());
    setSelectedId(wl.id);
    setNewName("");
    setCreating(false);
  };

  return (
    <div className="animate-rise space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">Watchlists</h1>
          <p className="mt-1 text-sm text-muted">
            Track stocks across multiple named lists.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
          <Plus className="size-4" /> New list
        </Button>
      </header>

      {creating && (
        <Card>
          <CardBody>
            <p className="mb-3 text-sm font-medium">New watchlist</p>
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="e.g. Banks, Dividends…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="h-9"
              />
              <Button size="sm" onClick={handleCreate} disabled={createWl.isPending || !newName.trim()}>
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-1">
          {(lists ?? []).map((wl) => (
            <WatchlistTab
              key={wl.id}
              wl={wl}
              active={wl.id === activeId}
              onSelect={() => setSelectedId(wl.id)}
            />
          ))}
          {(lists ?? []).length === 0 && (
            <p className="text-muted px-3 py-6 text-center text-sm">No watchlists yet.</p>
          )}
        </aside>

        {/* Items */}
        {activeId !== null && <WatchlistDetail id={activeId} />}
      </div>
    </div>
  );
}

function WatchlistTab({
  wl,
  active,
  onSelect,
}: {
  wl: WatchlistSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(wl.name);
  const rename = useRenameWatchlist();
  const del = useDeleteWatchlist();

  const saveRename = async () => {
    if (name.trim() && name !== wl.name) await rename.mutateAsync({ id: wl.id, name: name.trim() });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex gap-1 px-1">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setEditing(false); }}
          className="h-8 text-sm"
        />
        <Button size="sm" variant="ghost" onClick={saveRename}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={onSelect}
      className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <span className="flex items-center gap-2 truncate">
        <Star className={`size-3.5 shrink-0 ${wl.is_default ? "fill-brass text-brass" : ""}`} />
        <span className="truncate">{wl.name}</span>
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{wl.item_count}</Badge>
      </span>
      <span className="ml-1 flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="rounded p-0.5 hover:text-foreground"
          aria-label="Rename"
        >
          <Edit2 className="size-3" />
        </span>
        {!wl.is_default && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); del.mutate(wl.id); }}
            className="rounded p-0.5 hover:text-destructive"
            aria-label="Delete"
          >
            <Trash2 className="size-3" />
          </span>
        )}
      </span>
    </button>
  );
}

function WatchlistDetail({ id }: { id: number }) {
  const { data: wl, isLoading } = useWatchlist(id);
  const toggle = useWatchlistToggle();
  const navigate = useNavigate();

  if (isLoading) return <CenteredSpinner />;
  if (!wl) return null;

  return (
    <Card className="shadow-none">
      {wl.items.length === 0 ? (
        <CardBody className="py-16 text-center text-sm text-muted">
          No stocks yet. Star a stock from the Market to add it here.
        </CardBody>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs">
                <th className="py-2.5 pl-4 text-left font-medium">Stock</th>
                <th className="px-3 py-2.5 text-right font-medium">Price</th>
                <th className="px-3 py-2.5 text-right font-medium">Change</th>
                <th className="px-3 py-2.5 text-right font-medium">Volume</th>
                <th className="px-3 py-2.5 text-right font-medium">Mkt cap</th>
                <th className="w-10 py-2.5 pr-4" />
              </tr>
            </thead>
            <tbody>
              {wl.items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/stocks/${item.stock.symbol}`)}
                  className="border-border/50 hover:bg-accent/40 cursor-pointer border-b last:border-0"
                >
                  <td className="py-2.5 pl-4">
                    <div className="flex items-center gap-2.5">
                      <CompanyLogo src={item.stock.logo_url} symbol={item.stock.symbol} size={28} />
                      <div>
                        <div className="num font-semibold">{item.stock.symbol}</div>
                        <div className="text-muted-foreground max-w-[180px] truncate text-xs">{item.stock.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num px-3 py-2.5 text-right font-medium">{formatNaira(item.stock.last_price)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end">
                      <ChangeBadge changePercent={item.stock.change_percent} />
                    </div>
                  </td>
                  <td className="num text-muted-foreground px-3 py-2.5 text-right">{formatCompact(item.stock.volume)}</td>
                  <td className="num text-muted-foreground px-3 py-2.5 text-right">₦{formatCompact(item.stock.market_cap)}</td>
                  <td className="py-2.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggle.mutate({ watchlistId: id, symbol: item.stock.symbol, add: false })}
                      aria-label="Remove from watchlist"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
