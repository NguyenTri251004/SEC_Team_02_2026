import { useEffect, useState, useCallback, type ReactNode } from "react";
import type { CurrentUser, UserRole } from "../types";
import { AuthContext } from "./context";

const TOKEN_KEY = "ims_token";
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Keep exported so AppLayout can still reference it (always false now = no demo role switcher)
export const BYPASS_KEYCLOAK = false;

function parseToken(token: string): CurrentUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as {
      user_id?: string;
      username?: string;
      email?: string;
      role?: string;
    };
    if (!payload.user_id || !payload.username || !payload.role) return null;
    return {
      user_id: payload.user_id,
      username: payload.username,
      email: payload.email ?? "",
      role: payload.role as UserRole,
      is_active: true,
      last_login_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      const parsed = parseToken(stored);
      if (parsed) {
        setUser(parsed);
        setToken(stored);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsInitialized(true);
  }, []);

  const loginWithCredentials = useCallback(
    async (username: string, password: string) => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as {
        success: boolean;
        token?: string;
        user?: { user_id: string; username: string; email: string; role: string };
        error?: string;
      };
      if (!res.ok || !data.success || !data.token || !data.user) {
        throw new Error(data.error ?? "Đăng nhập thất bại");
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser({
        user_id: data.user.user_id,
        username: data.user.username,
        email: data.user.email ?? "",
        role: data.user.role as UserRole,
        is_active: true,
        last_login_at: new Date().toISOString(),
      });
      setIsAuthenticated(true);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(undefined);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  if (!isInitialized) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f2f5",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid #1677ff",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isInitialized,
        userRoles: user ? [user.role] : [],
        user,
        loginWithCredentials,
        login: () => {},
        logout,
        switchRole: () => {},
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
