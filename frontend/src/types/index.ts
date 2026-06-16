export interface User {
  id: string;
  email: string;
  display_name: string | null;
  picture: string | null;
  email_verified: boolean;
  created_at: string;
}

export interface Stock {
  id: number;
  symbol: string;
  name: string;
  sector: string | null;
  logo_url: string | null;
  last_price: number | null;
  change: number | null;
  change_percent: number | null;
  volume: number | null;
  market_cap: number | null;
}

export interface StockDetail extends Stock {
  industry: string | null;
  shares_outstanding: number | null;
  pe_ratio: number | null;
  eps: number | null;
  dividend_yield: number | null;
  week52_high: number | null;
  week52_low: number | null;
  last_updated: string | null;
}

export interface StockRow extends StockDetail {
  spark: number[];
}

export interface PricePoint {
  timestamp: string;
  price: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
}

export interface StockHistory {
  symbol: string;
  period: string;
  points: PricePoint[];
}

export interface MarketMover {
  symbol: string;
  name: string;
  logo_url: string | null;
  last_price: number | null;
  change: number | null;
  change_percent: number | null;
  volume: number | null;
  market_cap: number | null;
  spark: number[];
}

export interface SectorPerf {
  sector: string;
  avg_change_percent: number;
  advancers: number;
  decliners: number;
  total_market_cap: number;
  count: number;
}

export interface MarketSummary {
  total_volume: number;
  total_market_cap: number;
  avg_change_percent: number;
  market_cap_change_pct: number;
  value_change_pct: number;
  market_cap_series: number[];
  advancers: number;
  decliners: number;
  unchanged: number;
  top_gainers: MarketMover[];
  top_losers: MarketMover[];
  sectors: SectorPerf[];
}

export interface Holding {
  id: number;
  symbol: string;
  name: string;
  logo_url: string | null;
  shares: number;
  avg_price: number;
  last_price: number | null;
  market_value: number | null;
  cost_basis: number;
  gain_loss: number | null;
  gain_loss_percent: number | null;
}

export interface Portfolio {
  id: number;
  name: string;
  created_at: string;
  holdings: Holding[];
  total_value: number;
  total_cost: number;
  total_gain_loss: number;
}

export type AlertDirection = "above" | "below";

export interface Alert {
  id: number;
  symbol: string;
  name: string;
  target_price: number;
  direction: AlertDirection;
  is_active: boolean;
  is_triggered: boolean;
  created_at: string;
}

export interface NewsItem {
  id: number;
  title: string;
  url: string;
  source: string | null;
  summary: string | null;
  published_at: string | null;
  symbol: string | null;
}

export interface PriceTick {
  symbol: string;
  price: number;
  change: number | null;
  change_percent: number | null;
  volume: number | null;
  timestamp: string;
}
