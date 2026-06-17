import { Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { AuthRequired } from "@/components/AuthRequired";

/**
 * Layout route guarding user-scoped pages. Instead of bouncing signed-out
 * visitors to a separate /login screen, it renders an inline {@link AuthRequired}
 * gate within the app shell — they keep the nav and can still browse the market.
 */
export function ProtectedRoute({
  title = "Sign in required",
  description = "Sign in to access this page.",
}: {
  title?: string;
  description?: string;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) {
    return <AuthRequired title={title} description={description} />;
  }
  return <Outlet />;
}
