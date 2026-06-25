import { AxiosError } from "axios";
import { CloudOff, RefreshCw, ServerCrash, ShieldAlert, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Kind = "network" | "server" | "forbidden" | "notfound" | "generic";

interface Derived {
  kind: Kind;
  title: string;
  detail: string;
}

/** Map any thrown error (mostly AxiosError) onto friendly, actionable copy. */
function derive(error: unknown): Derived {
  if (error instanceof AxiosError) {
    // Request made but no response → server unreachable / network down.
    if (!error.response) {
      return {
        kind: "network",
        title: "Can't reach the server",
        detail:
          "We couldn't connect. Check your internet connection and try again.",
      };
    }
    const status = error.response.status;
    const apiDetail = (error.response.data as { detail?: unknown } | undefined)
      ?.detail;
    const detailStr = typeof apiDetail === "string" ? apiDetail : undefined;

    if (status >= 500) {
      return {
        kind: "server",
        title: "Server error",
        detail:
          detailStr ??
          "Something went wrong on our end. Please try again in a moment.",
      };
    }
    if (status === 403) {
      return {
        kind: "forbidden",
        title: "Access denied",
        detail: detailStr ?? "You don't have permission to view this.",
      };
    }
    if (status === 404) {
      return {
        kind: "notfound",
        title: "Not found",
        detail: detailStr ?? "The data you're looking for isn't available.",
      };
    }
    return {
      kind: "generic",
      title: "Couldn't load this",
      detail: detailStr ?? "An unexpected error occurred. Please try again.",
    };
  }
  return {
    kind: "generic",
    title: "Something went wrong",
    detail: "An unexpected error occurred. Please try again.",
  };
}

const ICONS: Record<Kind, React.ComponentType<{ className?: string }>> = {
  network: CloudOff,
  server: ServerCrash,
  forbidden: ShieldAlert,
  notfound: SearchX,
  generic: ServerCrash,
};

interface ErrorStateProps {
  error?: unknown;
  onRetry?: () => void;
  /** True while a retry is in flight — shows a spinner on the button. */
  retrying?: boolean;
  /** Compact inline variant for use inside a card/panel rather than full page. */
  compact?: boolean;
  className?: string;
  /** Override the derived title/detail when you have page-specific copy. */
  title?: string;
  detail?: string;
}

export function ErrorState({
  error,
  onRetry,
  retrying,
  compact,
  className,
  title,
  detail,
}: ErrorStateProps) {
  const d = derive(error);
  const Icon = ICONS[d.kind];

  return (
    <div
      role="alert"
      className={cn(
        "grid place-items-center text-center",
        compact ? "min-h-[180px] p-6" : "min-h-[40vh] p-8",
        className,
      )}
    >
      <div className="flex max-w-sm flex-col items-center gap-3">
        <div
          className={cn(
            "grid place-items-center rounded-full",
            compact ? "size-10" : "size-14",
            d.kind === "server" || d.kind === "network"
              ? "bg-loss/10 text-loss"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className={compact ? "size-5" : "size-7"} />
        </div>
        <div className="space-y-1">
          <h3
            className={cn(
              "font-display font-semibold text-foreground",
              compact ? "text-sm" : "text-base",
            )}
          >
            {title ?? d.title}
          </h3>
          <p className="text-muted-foreground text-sm">{detail ?? d.detail}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={retrying}
            className="mt-1"
          >
            <RefreshCw className={cn("size-4", retrying && "animate-spin")} />
            {retrying ? "Retrying…" : "Try again"}
          </Button>
        )}
      </div>
    </div>
  );
}
