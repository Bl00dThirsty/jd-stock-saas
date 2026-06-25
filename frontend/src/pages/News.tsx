import { useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NewsCardsSkeleton } from "@/components/Skeletons";
import { ErrorState } from "@/components/ErrorState";
import { useNews } from "@/hooks/useStockData";
import { formatDate } from "@/lib/format";

export function News() {
  const [filter, setFilter] = useState("");
  const { data: news, isLoading, isError, error, refetch, isFetching } = useNews(
    filter.trim() ? { stock: filter.trim().toUpperCase() } : {},
  );

  return (
    <div className="animate-rise space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Market news</h1>
          <p className="mt-1 text-sm text-muted">Headlines across NGX-listed companies.</p>
        </div>
        <div className="w-full sm:w-56">
          <Input
            name="filter"
            placeholder="Filter by ticker…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoComplete="off"
          />
        </div>
      </header>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : isLoading ? (
        <NewsCardsSkeleton />
      ) : (news ?? []).length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint">
              <Newspaper className="size-6" />
            </div>
            <p className="text-sm text-muted">
              No headlines yet. The hourly collector populates this feed as stories break.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-3">
          {news!.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      {item.symbol && <Badge variant="brand">{item.symbol}</Badge>}
                      {item.source && (
                        <span className="text-xs text-faint">{item.source}</span>
                      )}
                      <span className="num text-xs text-faint">
                        {formatDate(item.published_at)}
                      </span>
                    </div>
                    <h3 className="font-display text-base font-semibold leading-snug text-ink group-hover:text-brand-600">
                      {item.title}
                    </h3>
                    {item.summary && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                        {item.summary}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="mt-0.5 size-4 shrink-0 text-faint group-hover:text-brand-600" />
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
