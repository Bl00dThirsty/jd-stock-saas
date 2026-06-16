import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PricePoint } from "@/types";
import { formatNaira } from "@/lib/format";

interface StockChartProps {
  points: PricePoint[];
  period: string;
  height?: number;
}

export function StockChart({ points, period, height = 320 }: StockChartProps) {
  const data = useMemo(
    () =>
      points.map((p) => ({
        t: new Date(p.timestamp).getTime(),
        price: p.price,
      })),
    [points],
  );

  if (data.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-[var(--radius-card)] border border-dashed border-line text-sm text-faint"
        style={{ height }}
      >
        No price history available yet for this period.
      </div>
    );
  }

  const rising = data[data.length - 1].price >= data[0].price;
  const stroke = rising ? "var(--color-gain)" : "var(--color-loss)";

  const tickFmt = (t: number) => {
    const d = new Date(t);
    if (period === "1d") {
      return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-NG", { day: "2-digit", month: "short" });
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          domain={["dataMin", "dataMax"]}
          scale="time"
          tickFormatter={tickFmt}
          tick={{ fill: "var(--color-faint)", fontSize: 11 }}
          stroke="var(--color-line)"
          minTickGap={40}
        />
        <YAxis
          domain={["auto", "auto"]}
          tickFormatter={(v) => formatNaira(v, 0)}
          tick={{ fill: "var(--color-faint)", fontSize: 11 }}
          stroke="var(--color-line)"
          width={64}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 10,
            fontSize: 12,
            color: "var(--color-ink)",
          }}
          labelFormatter={(t) => new Date(Number(t)).toLocaleString("en-NG")}
          formatter={(v: number) => [formatNaira(v), "Price"]}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={stroke}
          strokeWidth={2}
          fill="url(#priceFill)"
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
