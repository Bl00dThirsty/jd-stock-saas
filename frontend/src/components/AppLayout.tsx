import { NavLink, Outlet } from "react-router-dom";
import {
  Bell,
  Briefcase,
  LayoutDashboard,
  LineChart,
  Moon,
  Newspaper,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useWebSocket } from "@/hooks/useWebSocket";
import { TickerBar } from "@/components/TickerBar";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/market", label: "Market", icon: LineChart, end: false },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase, end: false },
  { to: "/alerts", label: "Alerts", icon: Bell, end: false },
  { to: "/news", label: "News", icon: Newspaper, end: false },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { connected, ticks } = useWebSocket();

  return (
    <div className="min-h-dvh bg-background">
      {/* ── Desktop: centered floating pill nav ── */}
      <header className="glass fixed top-3 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-1 rounded-full py-1.5 pr-1.5 pl-2 lg:flex">
        <div className="px-2">
          <Wordmark />
        </div>

        <nav className="flex items-center gap-0.5">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mx-1 h-6 w-px bg-border" />

        <div className="flex items-center gap-1">
          <ConnectionDot connected={connected} />
          <ThemeToggle theme={theme} toggle={toggle} />
          <UserAvatar
            picture={user?.picture}
            name={user?.display_name ?? user?.email}
          />
          <button
            onClick={logout}
            className="text-muted-foreground hover:bg-foreground/5 hover:text-destructive rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Mobile / tablet: top bar (logo + actions) ── */}
      <header className="glass fixed inset-x-3 top-3 z-40 flex h-14 items-center justify-between rounded-2xl px-3 lg:hidden">
        <Wordmark />
        <div className="flex items-center gap-1">
          <ConnectionDot connected={connected} />
          <ThemeToggle theme={theme} toggle={toggle} />
          <UserAvatar picture={user?.picture} name={user?.display_name ?? user?.email} />
          <button
            onClick={logout}
            aria-label="Sign out"
            className="text-muted-foreground hover:bg-foreground/5 hover:text-destructive rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="px-3 pt-20 pb-28 lg:px-5 lg:pt-24 lg:pb-14">
        <div className="mx-auto w-full max-w-[1800px]">
          <Outlet />
        </div>
      </main>

      {/* ── Desktop: scrolling ticker tape (global footer) ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 hidden lg:block">
        <TickerBar ticks={ticks} />
      </div>

      {/* ── Mobile / tablet: bottom nav ── */}
      <nav className="glass fixed inset-x-3 bottom-3 z-40 flex rounded-2xl p-1 lg:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground",
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function ThemeToggle({ theme, toggle }: { theme: string; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      aria-label="Toggle colour theme"
      className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground grid size-9 place-items-center rounded-full transition-colors"
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

function UserAvatar({ picture, name }: { picture?: string | null; name?: string | null }) {
  if (picture) {
    return (
      <img
        src={picture}
        alt=""
        className="border-border size-8 rounded-full border object-cover"
      />
    );
  }
  return (
    <div className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-full text-sm font-semibold">
      {(name ?? "?")[0]?.toUpperCase()}
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-primary text-primary-foreground font-display grid size-8 place-items-center rounded-lg text-base font-bold">
        V
      </span>
      <span className="font-display text-foreground text-lg font-semibold tracking-tight">
        Vorte<span className="text-brass">x</span>
      </span>
    </div>
  );
}

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span
      title={connected ? "Live feed" : "Reconnecting…"}
      aria-label={connected ? "Live feed connected" : "Reconnecting"}
      className="grid size-9 place-items-center"
    >
      <span
        className={cn(
          "size-2 rounded-full",
          connected ? "bg-gain animate-pulse" : "bg-muted-foreground/50",
        )}
      />
    </span>
  );
}
