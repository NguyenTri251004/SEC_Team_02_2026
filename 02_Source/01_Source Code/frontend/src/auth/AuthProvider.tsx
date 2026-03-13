import { useEffect, useState, useCallback, type ReactNode } from "react";
import keycloak from "./keycloak";
import type { CurrentUser, UserRole } from "../types";
import { AuthContext } from "./context";

// Ordered from most to least privileged — used to pick a primary role
// when a Keycloak user holds multiple realm roles.
const ROLE_PRIORITY: UserRole[] = [
  "admin",
  "inventory_manager",
  "quality_control",
  "production",
  "viewer",
];

function pickPrimaryRole(roles: string[]): UserRole {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return "viewer";
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    // check-sso: silently checks whether the user already has an active Keycloak
    // session. If they do, the app initialises as authenticated without a redirect.
    // If they don't, isAuthenticated stays false and the Login page is shown.
    keycloak
      .init({ onLoad: "check-sso" })
      .then((authenticated) => {
        if (authenticated && keycloak.tokenParsed) {
          const parsed = keycloak.tokenParsed as Record<string, unknown>;
          const roles: string[] =
            (parsed["realm_access"] as { roles?: string[] } | undefined)
              ?.roles ?? [];
          setUser({
            user_id: (parsed["sub"] as string) ?? "",
            username: (parsed["preferred_username"] as string) ?? "",
            email: (parsed["email"] as string) ?? "",
            role: pickPrimaryRole(roles),
            is_active: true,
            last_login_at: new Date().toISOString(),
          });
          setUserRoles(roles);
          setToken(keycloak.token);
          setIsAuthenticated(true);
        }
        setIsInitialized(true);
      })
      .catch(() => setIsInitialized(true));

    // Proactively refresh the token before it expires
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(60).catch(() => {
        // Refresh failed — session has ended; reset state
        setIsAuthenticated(false);
        setUser(null);
        setUserRoles([]);
        setToken(undefined);
      });
    };

    keycloak.onAuthRefreshSuccess = () => {
      setToken(keycloak.token);
    };
  }, []);

  // Redirect to Keycloak login page
  const login = useCallback(() => {
    keycloak.login({ redirectUri: window.location.origin });
  }, []);

  // Redirect to Keycloak logout endpoint and return to app root
  const logout = useCallback(() => {
    keycloak.logout({ redirectUri: window.location.origin });
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
        userRoles,
        user,
        login,
        logout,
        switchRole: () => {},
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
