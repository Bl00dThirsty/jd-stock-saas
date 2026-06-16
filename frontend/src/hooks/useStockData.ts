import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/services/api";
import type {
  Alert,
  AlertDirection,
  MarketSummary,
  NewsItem,
  Portfolio,
  Stock,
  StockDetail,
  StockHistory,
} from "@/types";

/* ─── Market & stocks ─── */

export function useStocks(params: { sector?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["stocks", params],
    queryFn: async (): Promise<Stock[]> => {
      const { data } = await api.get<Stock[]>("/stocks", { params });
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
  return useQuery({
    queryKey: ["portfolios"],
    queryFn: async (): Promise<Portfolio[]> => {
      const { data } = await api.get<Portfolio[]>("/portfolio");
      return data;
    },
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
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async (): Promise<Alert[]> => {
      const { data } = await api.get<Alert[]>("/alerts");
      return data;
    },
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
