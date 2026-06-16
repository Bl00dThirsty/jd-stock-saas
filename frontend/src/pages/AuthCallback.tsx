import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

/**
 * Lands here after Google OAuth. The backend appends tokens as a URL
 * fragment (#access_token=…&refresh_token=…) so they never hit a server log.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access = params.get("access_token");
    const refresh = params.get("refresh_token");

    if (access && refresh) {
      setTokens(access, refresh);
      window.history.replaceState(null, "", window.location.pathname);
      navigate("/", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate, setTokens]);

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas text-muted">
      <p className="num text-sm">Authenticating…</p>
    </div>
  );
}
