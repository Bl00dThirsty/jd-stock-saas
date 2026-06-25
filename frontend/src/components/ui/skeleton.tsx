import { cn } from "@/lib/utils";

/**
 * Base shimmer block. Compose it into content-shaped placeholders so the
 * loading state mirrors the real layout (no jarring spinner → content jump).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted/70 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

/** A single text line. `w` is any Tailwind width class. */
function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn("h-3.5 rounded", className)} />;
}

/** A circle — logos, avatars, icon chips. */
function SkeletonCircle({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-full", className)} />;
}

export { Skeleton, SkeletonText, SkeletonCircle };
