import { type FormEvent, useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PortfolioTable } from "@/components/PortfolioTable";
import { PortfolioSkeleton } from "@/components/Skeletons";
import { ErrorState } from "@/components/ErrorState";
import {
  useAddHolding,
  useCreatePortfolio,
  useDeleteHolding,
  usePortfolios,
} from "@/hooks/useStockData";
import { formatNaira, formatSignedNaira } from "@/lib/format";
import type { Portfolio as TPortfolio } from "@/types";

export function Portfolio() {
  const { data: portfolios, isLoading, isError, error, refetch, isFetching } =
    usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");

  if (isError)
    return <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} />;
  if (isLoading) return <PortfolioSkeleton />;

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createPortfolio.mutate(name.trim(), {
      onSuccess: () => {
        setName("");
        setShowCreate(false);
      },
    });
  };

  return (
    <div className="animate-rise space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-foreground">Portfolio</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="size-4" />
          New portfolio
        </Button>
      </header>

      {(portfolios ?? []).length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-6">
          {portfolios!.map((p) => (
            <PortfolioBlock key={p.id} portfolio={p} />
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New portfolio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Portfolio name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Long-term holds"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button type="submit" loading={createPortfolio.isPending} className="w-full">
              Create
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PortfolioBlock({ portfolio }: { portfolio: TPortfolio }) {
  const addHolding = useAddHolding(portfolio.id);
  const deleteHolding = useDeleteHolding(portfolio.id);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ symbol: "", shares: "", avg_price: "" });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    addHolding.mutate(
      {
        symbol: form.symbol.trim().toUpperCase(),
        shares: Number(form.shares),
        avg_price: Number(form.avg_price),
      },
      {
        onSuccess: () => {
          setForm({ symbol: "", shares: "", avg_price: "" });
          setShowAdd(false);
        },
      },
    );
  };

  const pl = portfolio.total_gain_loss;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>{portfolio.name}</CardTitle>
        <div className="flex items-center gap-5">
          <Metric label="Value" value={formatNaira(portfolio.total_value)} />
          <Metric label="Cost" value={formatNaira(portfolio.total_cost)} muted />
          <Metric
            label="P/L"
            value={formatSignedNaira(pl)}
            tone={pl >= 0 ? "gain" : "loss"}
          />
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </CardHeader>
      <PortfolioTable
        holdings={portfolio.holdings}
        onDelete={(id) => deleteHolding.mutate(id)}
        deletingId={deleteHolding.isPending ? deleteHolding.variables : undefined}
      />

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add position · {portfolio.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="symbol">Ticker</Label>
              <Input
                id="symbol"
                name="symbol"
                placeholder="DANGCEM"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shares">Shares</Label>
                <Input
                  id="shares"
                  name="shares"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={form.shares}
                  onChange={(e) => setForm({ ...form, shares: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="avg_price">Avg price (₦)</Label>
                <Input
                  id="avg_price"
                  name="avg_price"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={form.avg_price}
                  onChange={(e) => setForm({ ...form, avg_price: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" loading={addHolding.isPending} className="w-full">
              Add position
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: string;
  tone?: "gain" | "loss";
  muted?: boolean;
}) {
  return (
    <div className="text-right">
      <p className="text-muted-foreground text-[11px] uppercase tracking-wide">{label}</p>
      <p
        className={`num text-sm font-semibold ${
          tone === "gain"
            ? "text-gain"
            : tone === "loss"
              ? "text-loss"
              : muted
                ? "text-muted-foreground"
                : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-accent text-primary">
          <Wallet className="size-6" />
        </div>
        <p className="font-display text-foreground text-lg">No portfolios yet</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Create a portfolio to track holdings and see live gains and losses across
          the NGX board.
        </p>
        <Button onClick={onCreate} className="mt-2">
          <Plus className="size-4" />
          Create your first portfolio
        </Button>
      </CardBody>
    </Card>
  );
}
