import { create } from "zustand";

/**
 * Drives the global "sign in to continue" modal.
 *
 * Public pages stay browsable; when an unauthenticated visitor triggers a
 * gated action (watchlist, alerts, portfolio…) we open this prompt instead of
 * letting the request 401 — the Binance-style "browse freely, sign in to act"
 * pattern. `reason` lets the caller explain *why* sign-in is needed.
 */
interface LoginPromptState {
  open: boolean;
  reason: string | null;
  requestLogin: (reason?: string) => void;
  close: () => void;
}

export const useLoginPrompt = create<LoginPromptState>((set) => ({
  open: false,
  reason: null,
  requestLogin: (reason) => set({ open: true, reason: reason ?? null }),
  close: () => set({ open: false, reason: null }),
}));
