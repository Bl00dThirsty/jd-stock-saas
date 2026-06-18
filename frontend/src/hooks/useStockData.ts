import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type {
  Alert,
  AlertDirection,
  MarketSummary,
  NewsItem,
  Portfolio,
  ScreenerResult,
  SectorDetail,
  StockAnalytics,
  StockDetail,
  StockHistory,
  StockRow,
  Watchlist,
  WatchlistSummary,
} from "@/types";

/* ─── Market & stocks ─── */

export function useStocks(
  params: { sector?: string; search?: string; spark?: boolean } = {},
) {
  return useQuery({
    queryKey: ["stocks", params],
    queryFn: async (): Promise<StockRow[]> => {
      const { data } = await api.get<StockRow[]>("/stocks", { params });
      return data;
    },
    staleTime: 60_000,
  });
}

export function useStock(symbol: string) {
  return useQuery({
    queryKey: ["stock", symbol],
    queryFn: async (): Promise<StockDetail> => {
      const { data } = await api.get<StockDetail>(`/stocks/${symbol}`);
      return data;
    },
    enabled: Boolean(symbol),
  });
}

export function useStockHistory(symbol: string, period: string) {
  return useQuery({
    queryKey: ["history", symbol, period],
    queryFn: async (): Promise<StockHistory> => {
      const { data } = await api.get<StockHistory>(`/stocks/${symbol}/history`, {
        params: { period },
      });
      return data;
    },
    enabled: Boolean(symbol),
  });
}

export function useMarketSummary() {
  return useQuery({
    queryKey: ["market-summary"],
    queryFn: async (): Promise<MarketSummary> => {
      const { data } = await api.get<MarketSummary>("/market/summary");
      return data;
    },
    refetchInterval: 60_000,
  });
}

/* ─── Portfolios ─── */

export function usePortfolios() {
  const isAuthed = useAuthStore((s) => Boolean(s.accessToken));
  return useQuery({
    queryKey: ["portfolios"],
    queryFn: async (): Promise<Portfolio[]> => {
      const { data } = await api.get<Portfolio[]>("/portfolio");
      return data;
    },
    enabled: isAuthed,
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post<Portfolio>("/portfolio", { name });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolios"] }),
  });
}

export function useAddHolding(portfolioId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      symbol: string;
      shares: number;
      avg_price: number;
    }) => {
      const { data } = await api.post(`/portfolio/${portfolioId}/holdings`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolios"] }),
  });
}

export function useDeleteHolding(portfolioId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (holdingId: number) =>
      api.delete(`/portfolio/${portfolioId}/holdings/${holdingId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolios"] }),
  });
}

/* ─── Alerts ─── */

export function useAlerts() {
  // Used on the public Dashboard too — only fetch when signed in, otherwise the
  // protected endpoint 401s for anonymous visitors.
  const isAuthed = useAuthStore((s) => Boolean(s.accessToken));
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async (): Promise<Alert[]> => {
      const { data } = await api.get<Alert[]>("/alerts");
      return data;
    },
    enabled: isAuthed,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      symbol: string;
      target_price: number;
      direction: AlertDirection;
    }) => {
      const { data } = await api.post<Alert>("/alerts", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useToggleAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const { data } = await api.patch<Alert>(`/alerts/${id}`, { is_active });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/alerts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

/* ─── News ─── */

export function useNews(params: { stock?: string; sector?: string } = {}) {
  return useQuery({
    queryKey: ["news", params],
    queryFn: async (): Promise<NewsItem[]> => {
      const { data } = await api.get<NewsItem[]>("/news", { params });
      return data;
    },
  });
}

/* ─── Watchlists ─── */

export function useWatchlists() {
  const isAuthed = useAuthStore((s) => Boolean(s.accessToken));
  return useQuery({
    queryKey: ["watchlists"],
    queryFn: async (): Promise<WatchlistSummary[]> => {
      const { data } = await api.get<WatchlistSummary[]>("/watchlists");
      return data;
    },
    enabled: isAuthed,
  });
}

export function useWatchlist(id: number | null) {
  const isAuthed = useAuthStore((s) => Boolean(s.accessToken));
  return useQuery({
    queryKey: ["watchlist", id],
    queryFn: async (): Promise<Watchlist> => {
      const { data } = await api.get<Watchlist>(`/watchlists/${id}`);
      return data;
    },
    enabled: isAuthed && id !== null,
  });
}

export function useDefaultWatchlist() {
  const isAuthed = useAuthStore((s) => Boolean(s.accessToken));
  return useQuery({
    queryKey: ["watchlist", "default"],
    queryFn: async (): Promise<Watchlist> => {
      const { data } = await api.get<Watchlist>("/watchlists/default");
      return data;
    },
    enabled: isAuthed,
  });
}

export function useCreateWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<Watchlist> => {
      const { data } = await api.post<Watchlist>("/watchlists", { name });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

export function useRenameWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }): Promise<WatchlistSummary> => {
      const { data } = await api.patch<WatchlistSummary>(`/watchlists/${id}`, { name });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

export function useDeleteWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/watchlists/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });
}

export function useWatchlistToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      watchlistId,
      symbol,
      add,
    }: {
      watchlistId: number;
      symbol: string;
      add: boolean;
    }): Promise<void> => {
      if (add) {
        await api.post(`/watchlists/${watchlistId}/items/${symbol}`);
      } else {
        await api.delete(`/watchlists/${watchlistId}/items/${symbol}`);
      }
    },
    onSuccess: (_d, { watchlistId }) => {
      qc.invalidateQueries({ queryKey: ["watchlist", watchlistId] });
      qc.invalidateQueries({ queryKey: ["watchlist", "default"] });
      qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });
}

/* ─── Screener ─── */

export interface ScreenerParams {
  sector?: string;
  pe_min?: number;
  pe_max?: number;
  cap_min?: number;
  cap_max?: number;
  vol_min?: number;
  div_yield_min?: number;
  change_pct_min?: number;
  change_pct_max?: number;
  week52_pct_from_high?: number;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/* ─── Analytics ─── */

export function useStockAnalytics(symbol: string) {
  return useQuery({
    queryKey: ["analytics", symbol],
    queryFn: async (): Promise<StockAnalytics> => {
      const { data } = await api.get<StockAnalytics>(`/stocks/${symbol}/analytics`);
      return data;
    },
    enabled: Boolean(symbol),
    staleTime: 5 * 60_000,
  });
}

/* ─── Sectors ─── */

export function useSectors() {
  return useQuery({
    queryKey: ["sectors"],
    queryFn: async (): Promise<SectorDetail[]> => {
      const { data } = await api.get<SectorDetail[]>("/sectors");
      return data;
    },
    staleTime: 60_000,
  });
}

export function useScreener(params: ScreenerParams) {
  return useQuery({
    queryKey: ["screener", params],
    queryFn: async (): Promise<ScreenerResult> => {
      const cleaned = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null),
      );
      const { data } = await api.get<ScreenerResult>("/screener", { params: cleaned });
      return data;
    },
    staleTime: 60_000,
  });
}
