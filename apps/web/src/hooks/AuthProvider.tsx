import { useEffect, useState, type ReactNode } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import type { User } from "@/types/api";
import { AuthContext, type AuthContextValue } from "@/hooks/useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const me = await apiFetch<User>("/auth/me");
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else {
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    setUser(null);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value: AuthContextValue = { user, isLoading, refresh, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
