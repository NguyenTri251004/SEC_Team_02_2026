import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import keycloak from "./keycloak";
import type { CurrentUser, UserRole } from "../types";
import { AuthContext } from "./context";
import { frontendLogger } from "@/lib/observability/logger";

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

function hasAuthCallbackParams(): boolean {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const keys = ["code", "state", "session_state", "error"];

  return keys.some((key) => search.has(key) || hash.has(key));
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [roleOverride, setRoleOverride] = useState<UserRole | null>(null);
  const hasInitializedKeycloak = useRef(false);

  useEffect(() => {
    // React StrictMode runs effects twice in development. Guarding prevents
    // duplicate Keycloak init calls that can race and leave auth state false.
    if (hasInitializedKeycloak.current) {
      return;
    }
    hasInitializedKeycloak.current = true;

    const isAuthCallback = hasAuthCallbackParams();

    // For callback URLs containing auth params, skip check-sso and let Keycloak
    // process the callback directly. For normal app loads, keep silent SSO check.
    keycloak
      .init(
        isAuthCallback
          ? {
              checkLoginIframe: false,
              pkceMethod: "S256",
            }
          : {
              onLoad: "check-sso",
              silentCheckSsoRedirectUri:
                window.location.origin + "/silent-check-sso.html",
              checkLoginIframe: false,
              pkceMethod: "S256",
            },
      )
      .then((authenticated) => {
        frontendLogger.info("frontend.auth.keycloak_initialized", {
          authenticated,
          isAuthCallback,
        });

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
      .catch((error: unknown) => {
        frontendLogger.error("frontend.auth.keycloak_init_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
        setIsInitialized(true);
      });

    // Proactively refresh the token before it expires
    keycloak.onTokenExpired = () => {
      frontendLogger.warn("frontend.auth.token_expired");
      keycloak.updateToken(60).catch(() => {
        frontendLogger.error("frontend.auth.token_refresh_failed");
        // Refresh failed — session has ended; reset state
        setIsAuthenticated(false);
        setUser(null);
        setUserRoles([]);
        setToken(undefined);
      });
    };

    keycloak.onAuthRefreshSuccess = () => {
      frontendLogger.info("frontend.auth.token_refresh_success");
      setToken(keycloak.token);
    };
  }, []);

  // Redirect to Keycloak login page
  const login = useCallback(() => {
    keycloak.login({ redirectUri: window.location.origin + "/" });
  }, []);

  // Redirect to Keycloak logout endpoint and return to app root
  const logout = useCallback(() => {
    keycloak.logout({ redirectUri: window.location.origin });
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setRoleOverride(role);
  }, []);

  // Build effective user with overridden role
  const effectiveUser = user && roleOverride
    ? { ...user, role: roleOverride }
    : user;

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
        user: effectiveUser,
        login,
        logout,
        switchRole,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
