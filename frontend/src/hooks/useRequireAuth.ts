import { useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { useLoginPrompt } from "@/store/loginPromptStore";

/**
 * Returns a guard that runs `action` when the visitor is authenticated, and
 * otherwise opens the global login prompt with an optional `reason`.
 *
 * Usage:
 *   const requireAuth = useRequireAuth();
 *   <button onClick={() => requireAuth(() => addToWatchlist(s), "Sign in to build your watchlist.")} />
 */
export function useRequireAuth() {
  const isAuthenticated = useAuthStore((s) => Boolean(s.accessToken));
  const requestLogin = useLoginPrompt((s) => s.requestLogin);

  return useCallback(
    (action: () => void, reason?: string) => {
      if (isAuthenticated) action();
      else requestLogin(reason);
    },
    [isAuthenticated, requestLogin],
  );
}
