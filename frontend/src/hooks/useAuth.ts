import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export function useAuth() {
  const { accessToken, user, setUser, setTokens, logout } = useAuthStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<User> => {
      const { data } = await api.get<User>("/users/me");
      return data;
    },
    enabled: Boolean(accessToken),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  useEffect(() => {
    if (isError) logout();
  }, [isError, logout]);

  const login = () => {
    // Full-page redirect into the backend's Google OAuth flow.
    window.location.href = `${API_BASE}/auth/google/login`;
  };

  const loginWithApple = () => {
    // Full-page redirect into the backend's Sign-in-with-Apple flow.
    window.location.href = `${API_BASE}/auth/apple/login`;
  };

  // Email + password against the local auth endpoints.
  const loginWithPassword = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    setTokens(data.access_token, data.refresh_token);
  };

  const registerWithPassword = async (
    email: string,
    password: string,
    display_name?: string,
  ) => {
    const { data } = await api.post("/auth/register", {
      email,
      password,
      display_name,
    });
    setTokens(data.access_token, data.refresh_token);
  };

  // Development-only: skip Google and get a demo session.
  const devLogin = async () => {
    const { data } = await api.post("/auth/dev-login");
    setTokens(data.access_token, data.refresh_token);
  };

  return {
    user: user ?? data ?? null,
    isAuthenticated: Boolean(accessToken),
    isLoading: Boolean(accessToken) && isLoading,
    login,
    loginWithApple,
    loginWithPassword,
    registerWithPassword,
    devLogin,
    logout,
  };
}
