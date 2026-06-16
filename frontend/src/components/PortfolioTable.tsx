import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { ChangeBadge } from "@/components/ChangeBadge";
import { CompanyLogo } from "@/components/CompanyLogo";
import { formatNaira, formatNumber, formatSignedNaira } from "@/lib/format";
import type { Holding } from "@/types";

interface PortfolioTableProps {
  holdings: Holding[];
  onDelete: (holdingId: number) => void;
  deletingId?: number;
}

export function PortfolioTable({ holdings, onDelete, deletingId }: PortfolioTableProps) {
  if (holdings.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-faint">
        No positions yet. Add your first holding to start tracking performance.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-faint">
            <th className="px-5 py-3 font-medium">Symbol</th>
            <th className="px-3 py-3 text-right font-medium">Shares</th>
            <th className="px-3 py-3 text-right font-medium">Avg</th>
            <th className="px-3 py-3 text-right font-medium">Price</th>
            <th className="px-3 py-3 text-right font-medium">Value</th>
            <th className="px-3 py-3 text-right font-medium">P/L</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.id} className="border-b border-line/60 last:border-0">
              <td className="px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <CompanyLogo src={h.logo_url} symbol={h.symbol} size={24} />
                  <div>
                    <Link
                      to={`/stocks/${h.symbol}`}
                      className="num font-semibold text-ink hover:text-brand-600"
                    >
                      {h.symbol}
                    </Link>
                    <p className="max-w-[12rem] truncate text-xs text-faint">{h.name}</p>
                  </div>
                </div>
              </td>
              <td className="num px-3 py-3 text-right text-ink">{formatNumber(h.shares)}</td>
              <td className="num px-3 py-3 text-right text-muted">
                {formatNaira(h.avg_price)}
              </td>
              <td className="num px-3 py-3 text-right text-ink">
                {formatNaira(h.last_price)}
              </td>
              <td className="num px-3 py-3 text-right text-ink">
                {formatNaira(h.market_value)}
              </td>
              <td className="px-3 py-3 text-right">
                <div className="flex flex-col items-end gap-0.5">
                  <span
                    className={`num text-sm font-medium ${
                      (h.gain_loss ?? 0) >= 0 ? "text-gain" : "text-loss"
                    }`}
                  >
                    {formatSignedNaira(h.gain_loss)}
                  </span>
                  <ChangeBadge changePercent={h.gain_loss_percent} />
                </div>
              </td>
              <td className="px-5 py-3 text-right">
                <button
                  onClick={() => onDelete(h.id)}
                  disabled={deletingId === h.id}
                  aria-label={`Remove ${h.symbol}`}
                  className="grid size-9 place-items-center rounded-lg text-faint hover:bg-loss-soft hover:text-loss disabled:opacity-40"
                >
                  <Trash2 className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
