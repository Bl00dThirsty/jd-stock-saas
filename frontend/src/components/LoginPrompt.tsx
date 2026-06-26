import { ArrowUpRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GoogleGlyph } from "@/components/GoogleGlyph";
import appleLogo from "@/assets/icons/apple-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useLoginPrompt } from "@/store/loginPromptStore";

/**
 * Global sign-in modal, mounted once in {@link AppLayout}. Opened from anywhere
 * via {@link useLoginPrompt}/`useRequireAuth` when a gated action is attempted.
 */
export function LoginPrompt() {
  const { open, reason, close } = useLoginPrompt();
  const { login, loginWithApple, devLogin } = useAuth();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in to continue</DialogTitle>
          <DialogDescription>
            {reason ?? "Create an account or sign in to use this feature."}
          </DialogDescription>
        </DialogHeader>

        <Button onClick={login} size="lg" variant="outline" className="w-full">
          <GoogleGlyph />
          Continue with Google
        </Button>

        <Button onClick={loginWithApple} size="lg" variant="outline" className="w-full">
          <img src={appleLogo} alt="" className="size-4 dark:invert" />
          Continue with Apple
        </Button>

        {import.meta.env.DEV && (
          <Button
            onClick={async () => {
              await devLogin();
              close();
            }}
            size="lg"
            className="w-full"
          >
            Enter demo mode (no Google)
          </Button>
        )}

        <p className="text-faint flex items-center gap-1 text-xs">
          <ArrowUpRight className="size-3.5" />
          Browsing the market stays free — sign in only to save alerts &amp;
          portfolios.
        </p>
      </DialogContent>
    </Dialog>
  );
}
