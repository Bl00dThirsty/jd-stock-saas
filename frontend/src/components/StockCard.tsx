import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ChangeBadge } from "@/components/ChangeBadge";
import { CompanyLogo } from "@/components/CompanyLogo";
import { formatNaira } from "@/lib/format";
import type { Stock } from "@/types";

export function StockCard({ stock, livePrice }: { stock: Stock; livePrice?: number }) {
  const price = livePrice ?? stock.last_price;
  return (
    <Link to={`/stocks/${stock.symbol}`} className="block">
      <Card className="p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <CompanyLogo src={stock.logo_url} symbol={stock.symbol} size={28} />
            <div>
              <p className="num text-sm font-semibold text-ink">{stock.symbol}</p>
              <p className="truncate text-xs text-muted">{stock.name}</p>
            </div>
          </div>
          <ChangeBadge changePercent={stock.change_percent} />
        </div>
        <p className="num mt-3 text-xl font-semibold text-ink">{formatNaira(price)}</p>
        {stock.sector && <p className="mt-1 text-xs text-faint">{stock.sector}</p>}
      </Card>
    </Link>
  );
}
