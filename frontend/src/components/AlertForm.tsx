import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AlertDirection } from "@/types";

interface AlertFormProps {
  onSubmit: (payload: {
    symbol: string;
    target_price: number;
    direction: AlertDirection;
  }) => void;
  submitting?: boolean;
}

export function AlertForm({ onSubmit, submitting }: AlertFormProps) {
  const [symbol, setSymbol] = useState("");
  const [price, setPrice] = useState("");
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [error, setError] = useState<string>();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const target = Number(price);
    if (!symbol.trim()) return setError("Enter a ticker symbol.");
    if (!Number.isFinite(target) || target <= 0)
      return setError("Enter a target price greater than zero.");
    setError(undefined);
    onSubmit({ symbol: symbol.trim().toUpperCase(), target_price: target, direction });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="symbol">Ticker</Label>
        <Input
          id="symbol"
          name="symbol"
          placeholder="e.g. DANGCEM"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Trigger when price is</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["above", "below"] as AlertDirection[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={cn(
                "h-9 rounded-md border text-sm font-medium capitalize transition-colors",
                direction === d
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-input text-muted-foreground hover:bg-accent",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="target_price">Target price (₦)</Label>
        <Input
          id="target_price"
          name="target_price"
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          aria-invalid={Boolean(error)}
        />
        {error && (
          <p role="alert" className="text-destructive text-xs">
            {error}
          </p>
        )}
      </div>

      <Button type="submit" loading={submitting} className="w-full">
        Create alert
      </Button>
    </form>
  );
}
