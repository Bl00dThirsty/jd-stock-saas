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

export interface UserSession {
  id: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
}

export interface ConsentStatus {
  consent_given: boolean;
  consent_given_at: string | null;
}

export interface WatchlistItem {
  id: number;
  stock_id: number;
  added_at: string;
  stock: StockRow;
}

export interface WatchlistSummary {
  id: number;
  name: string;
  is_default: boolean;
  created_at: string;
  item_count: number;
}

export interface Watchlist {
  id: number;
  name: string;
  is_default: boolean;
  created_at: string;
  items: WatchlistItem[];
}

export interface ScreenerResult {
  total: number;
  stocks: StockRow[];
}

export interface ReturnMetrics {
  period: string;
  total_return_pct: number;
  cagr_pct: number;
  annualized_vol_pct: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  max_drawdown_start: string | null;
  max_drawdown_end: string | null;
  best_day_pct: number;
  worst_day_pct: number;
  trading_days: number;
  data_sufficient: boolean;
}

export interface VolumeAnomaly {
  z_score: number;
  avg_volume_20d: number;
  current_volume: number;
  is_anomaly: boolean;
  direction: "spike" | "drought" | "normal";
}

export interface SRLevel {
  price: number;
  strength: number;
  level_type: "support" | "resistance";
  distance_pct: number;
}

export interface StockAnalytics {
  symbol: string;
  returns: ReturnMetrics[];
  volume_anomaly: VolumeAnomaly | null;
  support_resistance: SRLevel[];
}

export interface SectorStockRow {
  symbol: string;
  name: string;
  logo_url: string | null;
  last_price: number | null;
  change_percent: number | null;
  market_cap: number | null;
  volume: number | null;
}

export interface SectorDetail {
  sector: string;
  stock_count: number;
  avg_change_percent: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  total_market_cap: number;
  total_volume: number;
  avg_pe_ratio: number | null;
  avg_dividend_yield: number | null;
  top_by_cap: SectorStockRow[];
  top_gainers: SectorStockRow[];
  top_losers: SectorStockRow[];
}
