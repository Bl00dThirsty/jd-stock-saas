import { Navigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GoogleGlyph } from "@/components/GoogleGlyph";

// A small, static taste of the board for the unauthenticated hero.
const TAPE = [
  { s: "DANGCEM", c: 1.84 },
  { s: "GTCO", c: -0.62 },
  { s: "MTNN", c: 0.95 },
  { s: "ZENITHBANK", c: 2.11 },
  { s: "SEPLAT", c: -1.27 },
  { s: "BUACEMENT", c: 0.43 },
  { s: "NESTLE", c: -0.18 },
  { s: "AIRTELAFRI", c: 1.06 },
];

export function Login() {
  const { isAuthenticated, login, devLogin } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* ── Editorial panel ── */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-brand-700 p-12 text-brand-50 lg:flex">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-brand-900 font-display text-lg font-bold text-brand-300">
            V
          </span>
          <span className="font-display text-xl font-semibold">
            Vorte<span className="text-brass">x</span>
          </span>
        </div>

        <div className="max-w-lg">
          <p className="num mb-4 text-xs uppercase tracking-[0.2em] text-brand-300">
            Nigerian Exchange · Lagos
          </p>
          <h1 className="font-display text-5xl leading-[1.05] text-white">
            Read the pulse of the Nigerian market — one board, every ticker.
          </h1>
          <p className="mt-5 text-brand-100/80">
            Prices, portfolios, alerts and headlines for ~146 NGX equities,
            refreshed through the trading day.
          </p>
        </div>

        {/* Signature: a quiet ticker tape */}
        <div className="overflow-hidden rounded-xl border border-brand-600/40 bg-brand-900/40">
          <div className="flex flex-wrap gap-x-6 gap-y-2 px-4 py-3">
            {TAPE.map(({ s, c }) => (
              <span key={s} className="num inline-flex items-center gap-1.5 text-sm">
                <span className="text-brand-100">{s}</span>
                <span className={c >= 0 ? "text-brand-300" : "text-loss"}>
                  {c >= 0 ? "+" : ""}
                  {c.toFixed(2)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Auth panel ── */}
      <section className="flex flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <span className="font-display text-2xl font-semibold text-ink">
              Vorte<span className="text-brass">x</span>
            </span>
          </div>
          <h2 className="mt-6 font-display text-3xl text-ink lg:mt-0">Sign in</h2>
          <p className="mt-2 text-sm text-muted">
            Use your Google account to access your dashboard, portfolios and alerts.
          </p>

          <Button onClick={login} size="lg" variant="outline" className="mt-8 w-full">
            <GoogleGlyph />
            Continue with Google
          </Button>

          {import.meta.env.DEV && (
            <div className="mt-4">
              <div className="my-3 flex items-center gap-3 text-xs text-faint">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>
              <Button onClick={devLogin} size="lg" className="w-full">
                Enter demo mode (no Google)
              </Button>
              <p className="mt-2 text-center text-xs text-faint">
                Development only · signs in as a demo investor
              </p>
            </div>
          )}

          <p className="mt-6 flex items-center gap-1 text-xs text-faint">
            <ArrowUpRight className="size-3.5" />
            Market data via Yahoo Finance &amp; NGXPulse · 5-min refresh, not
            tick-by-tick.
          </p>
        </div>
      </section>
    </div>
  );
}
