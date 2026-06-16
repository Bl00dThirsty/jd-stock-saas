import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("size-5 animate-spin text-muted", className)}
      aria-label="Loading"
    />
  );
}

export function CenteredSpinner() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner className="size-7" />
    </div>
  );
}
