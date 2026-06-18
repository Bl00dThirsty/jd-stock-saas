import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Monitor, Smartphone, Trash2 } from "lucide-react";
import { api } from "@/services/api";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CenteredSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/format";
import type { UserSession } from "@/types";

export function Sessions() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data } = await api.get<UserSession[]>("/users/me/sessions");
      return data;
    },
  });

  if (isLoading) return <CenteredSpinner />;

  return (
    <div className="animate-rise space-y-6">
      <header>
        <h1 className="font-display text-3xl text-ink">Sessions</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your active login sessions across devices.
        </p>
      </header>

      {(sessions ?? []).length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center text-sm text-muted">
            No sessions found.
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sessions!.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: UserSession }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const revoke = useMutation({
    mutationFn: async () => {
      await api.delete(`/users/me/sessions/${session.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const isCurrent = user?.id && session.ip_address === window.location.hostname;
  const isMobile = session.user_agent
    ? /mobile|android|iphone|ipad/i.test(session.user_agent)
    : false;

  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3">
        <span
          className={`grid size-10 place-items-center rounded-lg ${
            session.is_active
              ? "bg-gain-soft text-gain"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isMobile ? <Smartphone className="size-5" /> : <Monitor className="size-5" />}
        </span>
        <div>
          <p className="text-sm font-semibold text-ink flex items-center gap-2">
            {isMobile ? "Mobile" : "Desktop"}
            {session.is_active ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gain-soft px-2 py-0.5 text-[11px] font-medium text-gain">
                <span className="size-1.5 rounded-full bg-gain" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Inactive
              </span>
            )}
            {isCurrent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brass-soft px-2 py-0.5 text-[11px] font-medium text-brass">
                Current
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            <Globe className="mr-0.5 inline size-3 align-text-top" />
            {session.ip_address ?? "Unknown IP"}
            <span className="mx-1.5 text-faint">·</span>
            {formatDate(session.created_at)}
          </p>
          {session.user_agent && (
            <p className="mt-0.5 max-w-md truncate text-[11px] text-faint">
              {session.user_agent}
            </p>
          )}
        </div>
      </div>

      {session.is_active && (
        <Button
          variant="ghost"
          size="sm"
          loading={revoke.isPending}
          onClick={() => revoke.mutate()}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="hidden sm:inline">Revoke</span>
        </Button>
      )}
    </Card>
  );
}
