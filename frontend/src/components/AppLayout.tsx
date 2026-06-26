import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Briefcase,
  LayoutDashboard,
  LineChart,
  LogOut,
  MoreHorizontal,
  Moon,
  Newspaper,
  PieChart,
  Shield,
  SlidersHorizontal,
  Star,
  Sun,
  UserCog,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLoginPrompt } from "@/store/loginPromptStore";
import { TickerBar } from "@/components/TickerBar";
import { LoginPrompt } from "@/components/LoginPrompt";
import { Button } from "@/components/ui/button";

// Desktop pill nav — all items
const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/market", label: "Market", icon: LineChart, end: false },
  { to: "/screener", label: "Screener", icon: SlidersHorizontal, end: false },
  { to: "/sectors", label: "Sectors", icon: PieChart, end: false },
  { to: "/watchlists", label: "Watchlists", icon: Star, end: false },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase, end: false },
  { to: "/alerts", label: "Alerts", icon: Bell, end: false },
  { to: "/news", label: "News", icon: Newspaper, end: false },
];

// Mobile bottom bar — 4 primary tabs + More
const PRIMARY_NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/market", label: "Market", icon: LineChart, end: false },
  { to: "/watchlists", label: "Watchlists", icon: Star, end: false },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase, end: false },
];

const MORE_NAV = [
  { to: "/screener", label: "Screener", icon: SlidersHorizontal },
  { to: "/sectors", label: "Sectors", icon: PieChart },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/news", label: "News", icon: Newspaper },
];

export function AppLayout() {
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
          <AuthControls />
        </div>
      </header>

      {/* ── Mobile / tablet: top bar (logo + actions) ── */}
      <header className="glass fixed inset-x-3 top-3 z-40 flex h-14 items-center justify-between rounded-2xl px-3 lg:hidden">
        <Wordmark />
        <div className="flex items-center gap-1">
          <ConnectionDot connected={connected} />
          <ThemeToggle theme={theme} toggle={toggle} />
          <AuthControls />
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
      <MobileNav />

      {/* Global "sign in to continue" modal — opened by gated actions / pages. */}
      <LoginPrompt />
    </div>
  );
}

/* ─────────────── Mobile nav + More sheet ─────────────── */

function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  // Close the sheet whenever the route changes (after tapping a More item).
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const moreIsActive = MORE_NAV.some((item) => location.pathname.startsWith(item.to));

  return (
    <>
      <nav className="glass fixed inset-x-3 bottom-3 z-40 flex rounded-2xl p-1 lg:hidden">
        {PRIMARY_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}

        {/* More button */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors",
            moreOpen || moreIsActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
          )}
        >
          <MoreHorizontal className="size-5" />
          More
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} activePathname={location.pathname} />
    </>
  );
}

function MoreSheet({
  open,
  onClose,
  activePathname,
}: {
  open: boolean;
  onClose: () => void;
  activePathname: string;
}) {
  const navigate = useNavigate();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed inset-x-3 bottom-[5.5rem] z-50 rounded-2xl border bg-card p-4 shadow-2xl transition-all duration-300 ease-out lg:hidden",
          open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
        )}
      >
        {/* Handle + close */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">More</p>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {MORE_NAV.map(({ to, label, icon: Icon }) => {
            const isActive = activePathname.startsWith(to);
            return (
              <button
                key={to}
                onClick={() => { navigate(to); onClose(); }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-3 text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ─────────────── Auth controls ─────────────── */

function AuthControls() {
  const { isAuthenticated, user, logout } = useAuth();
  const requestLogin = useLoginPrompt((s) => s.requestLogin);
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <Button size="sm" onClick={() => requestLogin()} className="ml-1">
        Log in
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
      >
        <UserAvatar picture={user?.picture} name={user?.display_name ?? user?.email} />
        <span className="hidden lg:inline">{user?.display_name ?? user?.email}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border bg-card p-1.5 shadow-lg">
            <DropdownItem to="/sessions" icon={Shield} label="Sessions" onClick={() => setOpen(false)} />
            <DropdownItem to="/privacy" icon={UserCog} label="Privacy & Data" onClick={() => setOpen(false)} />
            <div className="my-1 border-t" />
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DropdownItem({ to, icon: Icon, label, onClick }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => { navigate(to); onClick(); }}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <Icon className="size-4" />
      {label}
    </button>
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
