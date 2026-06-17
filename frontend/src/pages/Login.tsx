import { type FormEvent, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Apple, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

type Mode = "login" | "register";

function apiError(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
    ?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return "Something went wrong. Please try again.";
}

export function Login() {
  const {
    isAuthenticated,
    login,
    loginWithApple,
    loginWithPassword,
    registerWithPassword,
    devLogin,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useParticles();

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await loginWithPassword(email.trim(), password);
      } else {
        await registerWithPassword(email.trim(), password, displayName.trim() || undefined);
      }
      // Auth store update flips `isAuthenticated` → <Navigate> redirects.
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-background text-foreground fixed inset-0 overflow-hidden">
      <style>{ACCENT_CSS}</style>

      {/* Soft vignette */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(80%_60%_at_50%_30%,color-mix(in_oklab,var(--foreground)_6%,transparent),transparent_60%)]" />

      {/* Animated accent lines */}
      <div className="accent-lines">
        <div className="hline" />
        <div className="hline" />
        <div className="hline" />
        <div className="vline" />
        <div className="vline" />
        <div className="vline" />
      </div>

      {/* Particles */}
      <canvas
        id="login-particles"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
      />

      {/* Header */}
      <header className="border-border/70 absolute inset-x-0 top-0 flex items-center justify-between border-b px-6 py-4">
        <Wordmark />
        <Button variant="outline" size="sm" asChild>
          <a href="mailto:hello@vortex.app">
            Contact
            <ArrowRight className="size-4" />
          </a>
        </Button>
      </header>

      {/* Centered auth card */}
      <div className="grid h-full w-full place-items-center px-4">
        <Card className="card-animate bg-card/70 supports-[backdrop-filter]:bg-card/60 w-full max-w-sm border shadow-lg backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to your Vortex account"
                : "Start tracking the Nigerian Exchange"}
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5">
            <form onSubmit={handleSubmit} className="grid gap-5">
              {mode === "register" && (
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="Ada Lovelace"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={Boolean(error)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-2"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {mode === "login" && (
                <div className="flex items-center justify-between">
                  <label className="text-muted-foreground flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-primary size-4 rounded"
                    />
                    Remember me
                  </label>
                  <a href="#" className="text-foreground/80 hover:text-foreground text-sm">
                    Forgot password?
                  </a>
                </div>
              )}

              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}

              <Button type="submit" className="h-10 w-full" loading={submitting}>
                {mode === "login" ? "Continue" : "Create account"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="bg-border h-px w-full" />
              <span className="bg-card text-muted-foreground absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 text-[11px] uppercase tracking-widest">
                or
              </span>
            </div>

            {/* Social */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-10" onClick={loginWithApple}>
                <Apple className="size-4" />
                Apple
              </Button>
              <Button variant="outline" className="h-10" onClick={login}>
                <GoogleGlyph />
                Google
              </Button>
            </div>

            {import.meta.env.DEV && (
              <Button
                variant="secondary"
                className="h-9"
                onClick={async () => {
                  try {
                    await devLogin();
                  } catch (err) {
                    setError(apiError(err));
                  }
                }}
              >
                Enter demo mode (dev only)
              </Button>
            )}
          </CardContent>

          <CardFooter className="text-muted-foreground justify-center text-sm">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === "login" ? "register" : "login"));
                setError(undefined);
              }}
              className="text-foreground ml-1 font-medium hover:underline"
            >
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-primary text-primary-foreground font-display grid size-7 place-items-center rounded-md text-sm font-bold">
        V
      </span>
      <span className="font-display text-foreground text-base font-semibold tracking-tight">
        Vorte<span className="text-brass">x</span>
      </span>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

/** Upward-drifting particle field, painted in the theme's foreground colour. */
function useParticles() {
  const raf = useRef(0);
  useEffect(() => {
    const canvas = document.getElementById("login-particles") as HTMLCanvasElement | null;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    type P = { x: number; y: number; v: number; o: number };
    const make = (): P => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      v: Math.random() * 0.25 + 0.05,
      o: Math.random() * 0.35 + 0.15,
    });
    let ps: P[] = [];
    const init = () => {
      ps = Array.from(
        { length: Math.floor((canvas.width * canvas.height) / 9000) },
        make,
      );
    };

    const draw = () => {
      const rgb = document.documentElement.classList.contains("dark")
        ? "250,250,250"
        : "24,24,27";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ps.forEach((p) => {
        p.y -= p.v;
        if (p.y < 0) Object.assign(p, make(), { y: canvas.height + Math.random() * 40 });
        ctx.fillStyle = `rgba(${rgb},${p.o})`;
        ctx.fillRect(p.x, p.y, 0.7, 2.2);
      });
      raf.current = requestAnimationFrame(draw);
    };

    const onResize = () => {
      setSize();
      init();
    };
    window.addEventListener("resize", onResize);
    init();
    raf.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf.current);
    };
  }, []);
}

const ACCENT_CSS = `
  .accent-lines{position:absolute;inset:0;pointer-events:none;opacity:.7}
  .hline,.vline{position:absolute;background:var(--border);will-change:transform,opacity}
  .hline{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:drawX .8s cubic-bezier(.22,.61,.36,1) forwards}
  .vline{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0%;animation:drawY .9s cubic-bezier(.22,.61,.36,1) forwards}
  .hline:nth-child(1){top:18%;animation-delay:.12s}
  .hline:nth-child(2){top:50%;animation-delay:.22s}
  .hline:nth-child(3){top:82%;animation-delay:.32s}
  .vline:nth-child(4){left:22%;animation-delay:.42s}
  .vline:nth-child(5){left:50%;animation-delay:.54s}
  .vline:nth-child(6){left:78%;animation-delay:.66s}
  .hline::after,.vline::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,color-mix(in oklab,var(--foreground) 22%,transparent),transparent);opacity:0;animation:shimmer .9s ease-out forwards}
  .hline:nth-child(1)::after{animation-delay:.12s}
  .hline:nth-child(2)::after{animation-delay:.22s}
  .hline:nth-child(3)::after{animation-delay:.32s}
  .vline:nth-child(4)::after{animation-delay:.42s}
  .vline:nth-child(5)::after{animation-delay:.54s}
  .vline:nth-child(6)::after{animation-delay:.66s}
  @keyframes drawX{0%{transform:scaleX(0);opacity:0}60%{opacity:.95}100%{transform:scaleX(1);opacity:.7}}
  @keyframes drawY{0%{transform:scaleY(0);opacity:0}60%{opacity:.95}100%{transform:scaleY(1);opacity:.7}}
  @keyframes shimmer{0%{opacity:0}35%{opacity:.25}100%{opacity:0}}
  .card-animate{opacity:0;transform:translateY(20px);animation:fadeUp .8s cubic-bezier(.22,.61,.36,1) .4s forwards}
  @keyframes fadeUp{to{opacity:1;transform:translateY(0)}}
  @media (prefers-reduced-motion: reduce){
    .hline,.vline,.card-animate{animation:none;opacity:1;transform:none}
    #login-particles{display:none}
  }
`;
