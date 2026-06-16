import { useId, useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Override the auto-derived colour (defaults to gain/loss by trend). */
  color?: string;
  className?: string;
}

/**
 * Tiny inline trend line — no axes, no chrome. Colour follows the series
 * direction (emerald up / terracotta down) so a glance reads the trend; the
 * exact numbers live on the card itself.
 */
export function Sparkline({ data, width = 96, height = 32, color, className }: SparklineProps) {
  const gradientId = useId();

  const { line, area, stroke } = useMemo(() => {
    if (data.length < 2) {
      return { line: "", area: "", stroke: color ?? "var(--color-faint)" };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const stepX = width / (data.length - 1);
    const pad = 2;
    const usableH = height - pad * 2;

    const points = data.map((v, i) => {
      const x = i * stepX;
      const y = pad + usableH - ((v - min) / span) * usableH;
      return [x, y] as const;
    });

    const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${line} L${width},${height} L0,${height} Z`;
    const rising = data[data.length - 1] >= data[0];
    const stroke = color ?? (rising ? "var(--color-gain)" : "var(--color-loss)");
    return { line, area, stroke };
  }, [data, width, height, color]);

  if (data.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden role="img">
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--color-line)"
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      role="img"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
