import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonCircle } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ───────────────────────── shared building blocks ───────────────────────── */

function PageHeader({ wide }: { wide?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className={cn("h-7", wide ? "w-56" : "w-40")} />
        <Skeleton className="h-4 w-36" />
      </div>
      <Skeleton className="h-9 w-28" />
    </div>
  );
}

function StatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="space-y-3 p-4 shadow-none">
          <div className="flex items-center gap-2">
            <SkeletonCircle className="size-4" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </Card>
      ))}
    </div>
  );
}

/** Generic table card: a leading logo column + N text columns per row. */
export function TableSkeleton({
  rows = 9,
  cols = 6,
  withLogo = true,
}: {
  rows?: number;
  cols?: number;
  withLogo?: boolean;
}) {
  return (
    <Card className="overflow-hidden p-0 shadow-none">
      {/* header row */}
      <div className="border-border flex items-center gap-4 border-b px-4 py-3">
        {withLogo && <div className="w-7" />}
        <Skeleton className="h-3 w-28" />
        <div className="ml-auto flex gap-8">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-12" />
          ))}
        </div>
      </div>
      {/* body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="border-border/50 flex items-center gap-4 border-b px-4 py-3 last:border-0"
        >
          {withLogo && <SkeletonCircle className="size-7 shrink-0" />}
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-2.5 w-28" />
          </div>
          <div className="ml-auto flex items-center gap-8">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-12" />
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}

function Tabs({ count = 5 }: { count?: number }) {
  return (
    <div className="border-border flex gap-4 border-b pb-1">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-5 w-16" />
      ))}
    </div>
  );
}

/* ───────────────────────────── page skeletons ───────────────────────────── */

export function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      <PageHeader wide />
      <StatCards count={4} />
      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="space-y-3 p-4 shadow-none lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-12" />
            </div>
          ))}
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-3">
          {Array.from({ length: 2 }).map((_, c) => (
            <Card key={c} className="space-y-3 p-4 shadow-none">
              <Skeleton className="h-4 w-28" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <SkeletonCircle className="size-7 shrink-0" />
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="ml-auto h-3.5 w-14" />
                </div>
              ))}
            </Card>
          ))}
        </div>
      </div>
      <Card className="h-20 shadow-none" />
    </div>
  );
}

export function MarketSkeleton() {
  return (
    <div className="space-y-3">
      <PageHeader wide />
      <Tabs count={5} />
      <TableSkeleton rows={10} cols={6} />
    </div>
  );
}

export function ScreenerSkeleton() {
  return (
    <div className="space-y-4">
      <PageHeader wide />
      {/* filter bar */}
      <Card className="flex flex-wrap gap-3 p-4 shadow-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-36" />
        ))}
      </Card>
      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}

export function SectorsSkeleton() {
  // Tiles of varying widths, mirroring the market-cap treemap.
  const widths = [240, 180, 150, 200, 130, 160, 220, 140, 190, 170, 150, 210];
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
      <div className="flex flex-wrap gap-3">
        {widths.map((w, i) => (
          <Skeleton
            key={i}
            className="h-[100px] rounded-xl"
            style={{ width: w }}
          />
        ))}
      </div>
    </div>
  );
}

/** Cards only — for inline use below a persistent page header/filter. */
export function NewsCardsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="space-y-2.5 p-4 shadow-none">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
        </Card>
      ))}
    </div>
  );
}

export function ListSkeleton({
  rows = 6,
  title = true,
}: {
  rows?: number;
  title?: boolean;
}) {
  return (
    <div className="space-y-4">
      {title && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-60" />
        </div>
      )}
      <Card className="divide-border divide-y p-0 shadow-none">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <SkeletonCircle className="size-9 shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-40" />
            </div>
            <Skeleton className="ml-auto h-8 w-20" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function PortfolioSkeleton() {
  return (
    <div className="space-y-4">
      <PageHeader wide />
      <StatCards count={3} />
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}

export function WatchlistsSkeleton() {
  return (
    <div className="space-y-4">
      <PageHeader wide />
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="space-y-2 p-3 shadow-none">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </Card>
        <TableSkeleton rows={7} cols={4} />
      </div>
    </div>
  );
}

export function AlertsSkeleton() {
  return <ListSkeleton rows={6} />;
}

export function SettingsSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i} className="space-y-4 p-5 shadow-none">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-full max-w-md" />
          </div>
          <Skeleton className="h-9 w-36" />
        </Card>
      ))}
    </div>
  );
}

export function StockDetailSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      {/* header bar */}
      <Card className="shadow-none">
        <div className="flex flex-col gap-4 p-3 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <SkeletonCircle className="size-10 shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="border-border ml-1 space-y-2 border-l pl-4">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-5 gap-y-3 sm:grid-cols-4 xl:ml-auto">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </Card>
      {/* 3-column working area */}
      <div className="grid gap-2 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)_minmax(0,300px)]">
        <Card className="space-y-2 p-2 shadow-none">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <SkeletonCircle className="size-5 shrink-0" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="ml-auto h-3 w-12" />
            </div>
          ))}
        </Card>
        <Card className="space-y-3 p-3 shadow-none">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-10" />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </Card>
        <Card className="space-y-2 p-3 shadow-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
