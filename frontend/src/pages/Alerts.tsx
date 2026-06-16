import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, BellPlus, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertForm } from "@/components/AlertForm";
import { CenteredSpinner } from "@/components/ui/Spinner";
import {
  useAlerts,
  useCreateAlert,
  useDeleteAlert,
  useToggleAlert,
} from "@/hooks/useStockData";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/lib/format";

export function Alerts() {
  const { data: alerts, isLoading } = useAlerts();
  const createAlert = useCreateAlert();
  const toggleAlert = useToggleAlert();
  const deleteAlert = useDeleteAlert();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <CenteredSpinner />;

  return (
    <div className="animate-rise space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Alerts</h1>
          <p className="mt-1 text-sm text-muted">
            Get flagged when a stock crosses your target price.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <BellPlus className="size-4" />
          New alert
        </Button>
      </header>

      {(alerts ?? []).length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center text-sm text-muted">
            No alerts set. Create one to monitor a price level.
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-3">
          {alerts!.map((a) => (
            <Card key={a.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-lg",
                    a.direction === "above"
                      ? "bg-gain-soft text-gain"
                      : "bg-loss-soft text-loss",
                  )}
                >
                  {a.direction === "above" ? (
                    <ArrowUpRight className="size-5" />
                  ) : (
                    <ArrowDownRight className="size-5" />
                  )}
                </span>
                <div>
                  <p className="num text-sm font-semibold text-ink">{a.symbol}</p>
                  <p className="text-xs text-muted">
                    {a.direction} <span className="num">{formatNaira(a.target_price)}</span>
                  </p>
                </div>
                {a.is_triggered && <Badge variant="brass">Triggered</Badge>}
              </div>

              <div className="flex items-center gap-2">
                <Toggle
                  on={a.is_active}
                  onChange={(v) => toggleAlert.mutate({ id: a.id, is_active: v })}
                />
                <button
                  onClick={() => deleteAlert.mutate(a.id)}
                  aria-label={`Delete alert for ${a.symbol}`}
                  className="grid size-9 place-items-center rounded-lg text-faint hover:bg-loss-soft hover:text-loss"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New price alert</DialogTitle>
          </DialogHeader>
          <AlertForm
            submitting={createAlert.isPending}
            onSubmit={(payload) =>
              createAlert.mutate(payload, { onSuccess: () => setShowForm(false) })
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label="Toggle alert active"
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        on ? "bg-brand-600" : "bg-line",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-white transition-transform",
          on ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
