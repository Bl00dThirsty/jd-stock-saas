import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { Login } from "@/pages/Login";
import { AuthCallback } from "@/pages/AuthCallback";
import { Dashboard } from "@/pages/Dashboard";
import { Market } from "@/pages/Market";
import { StockDetail } from "@/pages/StockDetail";
import { Portfolio } from "@/pages/Portfolio";
import { Alerts } from "@/pages/Alerts";
import { News } from "@/pages/News";
import { Sessions } from "@/pages/Sessions";
import { Privacy } from "@/pages/Privacy";
import { Watchlists } from "@/pages/Watchlists";
import { Screener } from "@/pages/Screener";
import { Sectors } from "@/pages/Sectors";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* The app shell is always reachable. Market data is browsable by anyone;
          user-scoped pages sit behind an inline ProtectedRoute gate. */}
      <Route element={<AppLayout />}>
        {/* Public — browse freely */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/market" element={<Market />} />
        <Route path="/stocks/:symbol" element={<StockDetail />} />
        <Route path="/news" element={<News />} />
        <Route path="/screener" element={<Screener />} />
        <Route path="/sectors" element={<Sectors />} />

        {/* Protected — sign in to act */}
        <Route
          element={
            <ProtectedRoute
              title="Your portfolio is private"
              description="Sign in to create portfolios and track your holdings across the NGX board."
            />
          }
        >
          <Route path="/portfolio" element={<Portfolio />} />
        </Route>
        <Route
          element={
            <ProtectedRoute
              title="Your alerts are private"
              description="Sign in to set price alerts and get notified when a stock hits your target."
            />
          }
        >
          <Route path="/alerts" element={<Alerts />} />
        </Route>
        <Route
          element={
            <ProtectedRoute
              title="Session management"
              description="Sign in to view and manage your active sessions."
            />
          }
        >
          <Route path="/sessions" element={<Sessions />} />
        </Route>
        <Route
          element={
            <ProtectedRoute
              title="Privacy settings"
              description="Sign in to manage your data and privacy preferences."
            />
          }
        >
          <Route path="/privacy" element={<Privacy />} />
        </Route>
        <Route
          element={
            <ProtectedRoute
              title="Your watchlists are private"
              description="Sign in to create named watchlists and track your favourite stocks."
            />
          }
        >
          <Route path="/watchlists" element={<Watchlists />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
