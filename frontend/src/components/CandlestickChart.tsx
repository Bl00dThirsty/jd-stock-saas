import { useEffect, useRef, useState } from "react";
import {
  createChart,
  createTextWatermark,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  AreaSeries,
  LineSeries,
} from "lightweight-charts";
import type {
  IChartApi,
  ISeriesApi,
  ITextWatermarkPluginApi,
  Time,
  UTCTimestamp,
} from "lightweight-charts";
import { BarChart2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompact, formatNaira } from "@/lib/format";
import type { PricePoint } from "@/types";

type ChartMode = "candle" | "area";

export interface CandlestickChartProps {
  points: PricePoint[];
  period: string;
  height?: number;
  theme: "light" | "dark";
  symbol?: string;
}

// ── Palettes ──────────────────────────────────────────────────────────────────

const DARK = {
  text: "#6b7280",
  grid: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  crosshair: "rgba(148,163,184,0.5)",
  crossLabel: "#1e293b",
  up: "#22c55e",
  down: "#ef4444",
  sma20: "#f59e0b",
  sma50: "#60a5fa",
  volUp: "rgba(34,197,94,0.35)",
  volDown: "rgba(239,68,68,0.35)",
  areaLine: "#6366f1",
  areaTop: "rgba(99,102,241,0.20)",
  watermark: "rgba(255,255,255,0.035)",
} as const;

const LIGHT = {
  text: "#9ca3af",
  grid: "rgba(0,0,0,0.05)",
  border: "rgba(0,0,0,0.08)",
  crosshair: "rgba(100,116,139,0.5)",
  crossLabel: "#334155",
  up: "#16a34a",
  down: "#dc2626",
  sma20: "#d97706",
  sma50: "#2563eb",
  volUp: "rgba(22,163,74,0.30)",
  volDown: "rgba(220,38,38,0.30)",
  areaLine: "#6366f1",
  areaTop: "rgba(99,102,241,0.15)",
  watermark: "rgba(0,0,0,0.035)",
} as const;

type Palette = { [K in keyof typeof DARK]: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeSMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

const toTs = (ts: string) =>
  Math.floor(new Date(ts).getTime() / 1000) as UTCTimestamp;

// Compact ₦ axis labels: no decimals above ₦1k, two below.
function nairaAxis(price: number): string {
  if (price >= 1000)
    return "₦" + price.toLocaleString("en-NG", { maximumFractionDigits: 0 });
  return "₦" + price.toFixed(2);
}

// Per-candle volume colour driven by candle direction (close vs open).
function volumeColor(p: PricePoint, prevClose: number, c: Palette): string {
  const open = p.open ?? prevClose;
  return p.price >= open ? c.volUp : c.volDown;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface OhlcvLegend {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  chgPct: number;
}

export function CandlestickChart({
  points,
  period,
  height = 420,
  theme,
  symbol,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const areaRef = useRef<ISeriesApi<"Area"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const sma20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const watermarkRef = useRef<ITextWatermarkPluginApi<Time> | null>(null);
  // Latest points + a time→previous-close lookup for the hover legend.
  const pointsRef = useRef<PricePoint[]>(points);
  const prevCloseRef = useRef<Map<number, number>>(new Map());

  const [mode, setMode] = useState<ChartMode>("candle");
  const [legend, setLegend] = useState<OhlcvLegend | null>(null);

  // ── Mount: create chart + all series + watermark ─────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const c = theme === "dark" ? DARK : LIGHT;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: c.text,
        attributionLogo: false,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
      },
      localization: { locale: "en-NG", priceFormatter: nairaAxis },
      grid: {
        vertLines: { color: c.grid, style: LineStyle.Solid },
        horzLines: { color: c.grid, style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: c.crosshair,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: c.crossLabel,
        },
        horzLine: {
          color: c.crosshair,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: c.crossLabel,
        },
      },
      rightPriceScale: {
        borderColor: c.border,
        scaleMargins: { top: 0.08, bottom: 0.24 },
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: c.border,
        timeVisible: period === "1d",
        rightOffset: 4,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      width: el.clientWidth,
      height,
      handleScroll: { vertTouchDrag: false },
    });

    const priceFormat = {
      type: "price" as const,
      precision: 2,
      minMove: 0.01,
    };

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: c.up,
      downColor: c.down,
      borderUpColor: c.up,
      borderDownColor: c.down,
      wickUpColor: c.up,
      wickDownColor: c.down,
      priceFormat,
      priceLineStyle: LineStyle.Dashed,
      priceLineWidth: 1,
    });

    const area = chart.addSeries(AreaSeries, {
      lineColor: c.areaLine,
      topColor: c.areaTop,
      bottomColor: "transparent",
      lineWidth: 2,
      priceFormat,
      priceLineStyle: LineStyle.Dashed,
      priceLineWidth: 1,
      visible: false,
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: "volume",
      priceFormat: { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.84, bottom: 0 },
    });

    const sma20 = chart.addSeries(LineSeries, {
      color: c.sma20,
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    const sma50 = chart.addSeries(LineSeries, {
      color: c.sma50,
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    // Faint symbol watermark — signature trading-terminal touch.
    const watermark = createTextWatermark(chart.panes()[0], {
      horzAlign: "center",
      vertAlign: "center",
      lines: [
        {
          text: symbol ?? "",
          color: c.watermark,
          fontSize: 64,
          fontStyle: "bold",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        },
      ],
    });

    chart.subscribeCrosshairMove((param) => {
      const bar = param.seriesData.get(candle) as
        | { open: number; high: number; low: number; close: number }
        | undefined;
      if (!param.time || !bar) {
        setLegend(null);
        return;
      }
      const vol = param.seriesData.get(volume) as { value: number } | undefined;
      const pc = prevCloseRef.current.get(param.time as number) ?? bar.open;
      setLegend({
        time: param.time as number,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: vol?.value ?? 0,
        chgPct: pc ? ((bar.close - pc) / pc) * 100 : 0,
      });
    });

    const ro = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: entry.contentRect.width });
    });
    ro.observe(el);

    chartRef.current = chart;
    candleRef.current = candle;
    areaRef.current = area;
    volumeRef.current = volume;
    sma20Ref.current = sma20;
    sma50Ref.current = sma50;
    watermarkRef.current = watermark;

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // ── Feed data whenever points / period change ─────────────────────────────
  useEffect(() => {
    pointsRef.current = points;
    if (!chartRef.current || points.length === 0) return;

    const c = theme === "dark" ? DARK : LIGHT;
    const closes = points.map((p) => p.price);

    // Rebuild time→prevClose lookup for the hover legend.
    const pcMap = new Map<number, number>();
    points.forEach((p, i) => {
      if (i > 0) pcMap.set(toTs(p.timestamp), points[i - 1].price);
    });
    prevCloseRef.current = pcMap;

    candleRef.current?.setData(
      points.map((p) => ({
        time: toTs(p.timestamp),
        open: p.open ?? p.price,
        high: p.high ?? p.price,
        low: p.low ?? p.price,
        close: p.price,
      })),
    );

    // Colour the last-price line by the day's direction.
    const lastUp = points[points.length - 1].price >= points[0].price;
    candleRef.current?.applyOptions({
      priceLineColor: lastUp ? c.up : c.down,
    });

    areaRef.current?.setData(
      points.map((p) => ({ time: toTs(p.timestamp), value: p.price })),
    );
    areaRef.current?.applyOptions({
      lineColor: lastUp ? c.up : c.down,
      topColor: lastUp ? "rgba(34,197,94,0.20)" : "rgba(239,68,68,0.18)",
      priceLineColor: lastUp ? c.up : c.down,
    });

    volumeRef.current?.setData(
      points.map((p, i) => ({
        time: toTs(p.timestamp),
        value: p.volume ?? 0,
        color: volumeColor(p, i > 0 ? points[i - 1].price : p.price, c),
      })),
    );

    const sma20Data = computeSMA(closes, 20)
      .map((v, i) =>
        v !== null ? { time: toTs(points[i].timestamp), value: v } : null,
      )
      .filter((x): x is { time: UTCTimestamp; value: number } => x !== null);
    sma20Ref.current?.setData(sma20Data);

    const sma50Data = computeSMA(closes, 50)
      .map((v, i) =>
        v !== null ? { time: toTs(points[i].timestamp), value: v } : null,
      )
      .filter((x): x is { time: UTCTimestamp; value: number } => x !== null);
    sma50Ref.current?.setData(sma50Data);

    chartRef.current.timeScale().applyOptions({ timeVisible: period === "1d" });
    chartRef.current.timeScale().fitContent();
    setLegend(null);
    // theme handled by the dedicated effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, period]);

  // ── Toggle candle / area ──────────────────────────────────────────────────
  useEffect(() => {
    candleRef.current?.applyOptions({ visible: mode === "candle" });
    areaRef.current?.applyOptions({ visible: mode === "area" });
    sma20Ref.current?.applyOptions({ visible: mode === "candle" });
    sma50Ref.current?.applyOptions({ visible: mode === "candle" });
  }, [mode]);

  // ── Update watermark text when the symbol changes ─────────────────────────
  useEffect(() => {
    watermarkRef.current?.applyOptions({ lines: [{ text: symbol ?? "" }] });
  }, [symbol]);

  // ── Sync palette on theme toggle ──────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    const c = theme === "dark" ? DARK : LIGHT;

    chartRef.current.applyOptions({
      layout: { textColor: c.text },
      grid: {
        vertLines: { color: c.grid },
        horzLines: { color: c.grid },
      },
      crosshair: {
        vertLine: { color: c.crosshair, labelBackgroundColor: c.crossLabel },
        horzLine: { color: c.crosshair, labelBackgroundColor: c.crossLabel },
      },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border },
    });

    candleRef.current?.applyOptions({
      upColor: c.up,
      downColor: c.down,
      borderUpColor: c.up,
      borderDownColor: c.down,
      wickUpColor: c.up,
      wickDownColor: c.down,
    });
    sma20Ref.current?.applyOptions({ color: c.sma20 });
    sma50Ref.current?.applyOptions({ color: c.sma50 });
    watermarkRef.current?.applyOptions({ lines: [{ color: c.watermark }] });

    // Re-colour volume bars for the new theme.
    const pts = pointsRef.current;
    if (pts.length > 0 && volumeRef.current) {
      volumeRef.current.setData(
        pts.map((p, i) => ({
          time: toTs(p.timestamp),
          value: p.volume ?? 0,
          color: volumeColor(p, i > 0 ? pts[i - 1].price : p.price, c),
        })),
      );
    }
  }, [theme]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (points.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground"
        style={{ height }}
      >
        No price history available for this period.
      </div>
    );
  }

  const hasOHLC = points.some((p) => p.open !== null);
  const last = points[points.length - 1];
  const prevClose = points[points.length - 2]?.price ?? last.open ?? last.price;
  const displayed: OhlcvLegend = legend ?? {
    time: toTs(last.timestamp),
    open: last.open ?? last.price,
    high: last.high ?? last.price,
    low: last.low ?? last.price,
    close: last.price,
    volume: last.volume ?? 0,
    chgPct: prevClose ? ((last.price - prevClose) / prevClose) * 100 : 0,
  };
  const up = displayed.close >= displayed.open;

  return (
    <div className="relative select-none">
      {/* ── OHLCV legend (top-left) ── */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
        <span className="text-muted-foreground mr-0.5 hidden font-medium sm:inline">
          {formatLegendDate(displayed.time, period)}
        </span>
        <LegendLabel label="O" value={formatNaira(displayed.open)} up={up} />
        <LegendLabel label="H" value={formatNaira(displayed.high)} up={up} />
        <LegendLabel label="L" value={formatNaira(displayed.low)} up={up} />
        <LegendLabel
          label="C"
          value={formatNaira(displayed.close)}
          up={up}
          bold
        />
        <span className={cn("num font-medium", up ? "text-gain" : "text-loss")}>
          {displayed.chgPct >= 0 ? "+" : ""}
          {displayed.chgPct.toFixed(2)}%
        </span>
        <span className="hidden text-muted-foreground sm:inline">
          · Vol {formatCompact(displayed.volume)}
        </span>
      </div>

      {/* ── Top-right: SMA badge + mode toggle ── */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        {mode === "candle" && (
          <div className="hidden items-center gap-2 text-[10px] sm:flex">
            <SmaLegend color="bg-amber-500" label="SMA 20" />
            <SmaLegend color="bg-blue-400" label="SMA 50" />
          </div>
        )}

        {hasOHLC && (
          <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
            <ModeBtn
              active={mode === "candle"}
              onClick={() => setMode("candle")}
              title="Candlestick"
            >
              <BarChart2 className="size-3.5" />
            </ModeBtn>
            <ModeBtn
              active={mode === "area"}
              onClick={() => setMode("area")}
              title="Area"
            >
              <TrendingUp className="size-3.5" />
            </ModeBtn>
          </div>
        )}
      </div>

      <div ref={containerRef} style={{ height }} />
    </div>
  );
}

// ── Small presentational sub-components ──────────────────────────────────────

function formatLegendDate(tsSeconds: number, period: string): string {
  const d = new Date(tsSeconds * 1000);
  if (period === "1d") {
    return d.toLocaleString("en-NG", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function LegendLabel({
  label,
  value,
  up,
  bold,
}: {
  label: string;
  value: string;
  up: boolean;
  bold?: boolean;
}) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(up ? "text-gain" : "text-loss", bold && "font-semibold")}
      >
        {value}
      </span>
    </>
  );
}

function SmaLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("inline-block h-0.5 w-4 rounded-full", color)} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function ModeBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "grid place-items-center rounded-md p-1.5 transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
