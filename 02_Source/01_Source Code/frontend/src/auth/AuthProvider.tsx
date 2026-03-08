import { useEffect, useState, useCallback, type ReactNode } from "react";
import keycloak from "./keycloak";
import type { CurrentUser, UserRole } from "../types";
import { AuthContext } from "./context";
import { ROLE_TAG } from "../constants/roles";

/** Read from env variable VITE_BYPASS_KEYCLOAK.
 *  Set to "true" to enable role switching in UI (demo mode);
 *  Set to "false" to use Keycloak login/logout (production).
 *  Defaults to true if not set (for backwards compatibility).
 */
export const BYPASS_KEYCLOAK = (import.meta.env.VITE_BYPASS_KEYCLOAK ?? "true") !== "false";

let didInit = false;

/** Extract UserRole list from ROLE_TAG */
const APP_ROLES = Object.keys(ROLE_TAG) as UserRole[];

const DEMO_USER: CurrentUser = {
  user_id: "demo-001",
  username: "demo_user",
  email: "demo@example.com",
  role: "admin",
  is_active: true,
  last_login_at: new Date().toISOString(),
};

function resolveUserRoleFromRealmRoles(realmRoles: string[]): UserRole {
  const matchedRole = APP_ROLES.find((role) => realmRoles.includes(role));
  return matchedRole ?? "viewer";
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isInitialized, setIsInitialized] = useState(BYPASS_KEYCLOAK);
  const [isAuthenticated, setIsAuthenticated] = useState(BYPASS_KEYCLOAK);
  const [userRoles, setUserRoles] = useState<string[]>(
    BYPASS_KEYCLOAK ? [DEMO_USER.role] : [],
  );
  const [user, setUser] = useState<CurrentUser | null>(
    BYPASS_KEYCLOAK ? DEMO_USER : null,
  );

  const switchRole = useCallback((role: UserRole) => {
    if (!BYPASS_KEYCLOAK) {
      console.warn(
        "Role switching disabled. Enable BYPASS_KEYCLOAK to allow demo mode.",
      );
      return;
    }
    setUser((prev) => (prev ? { ...prev, role } : prev));
    setUserRoles((prev) => {
      const next = prev.filter((item) => !APP_ROLES.includes(item as UserRole));
      return [role, ...next];
    });
  }, []);

  useEffect(() => {
    if (BYPASS_KEYCLOAK) return;

    if (didInit) return;
    didInit = true;

    keycloak
      .init({
        onLoad: "login-required",
        checkLoginIframe: false,
      })
      .then((authenticated) => {
        setIsAuthenticated(authenticated);

        if (authenticated) {
          const realmRoles = keycloak.tokenParsed?.realm_access?.roles ?? [];
          setUserRoles(realmRoles);

          const role = resolveUserRoleFromRealmRoles(realmRoles);
          setUser({
            user_id: String(keycloak.tokenParsed?.sub ?? ""),
            username: String(
              keycloak.tokenParsed?.preferred_username ??
                keycloak.tokenParsed?.name ??
                "user",
            ),
            email: String(keycloak.tokenParsed?.email ?? ""),
            role,
            is_active: true,
            last_login_at: new Date().toISOString(),
          });

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        } else {
          setUser(null);
          setUserRoles([]);
        }

        setIsInitialized(true);
      })
      .catch((error) => {
        console.error("Keycloak initialization failed:", error);
        setIsInitialized(true);
      });

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        console.warn("Session expired. Automatically logging out.");
        keycloak.logout({ redirectUri: window.location.origin });
      });
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
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
        switchRole,
        login: () => {
          if (BYPASS_KEYCLOAK) return;
          keycloak.login({ redirectUri: window.location.href });
        },
        logout: () => {
          if (BYPASS_KEYCLOAK) {
            setIsAuthenticated(false);
            setUser(null);
            setUserRoles([]);
            return;
          }
          keycloak.logout({ redirectUri: window.location.origin });
        },
        token: keycloak.token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
