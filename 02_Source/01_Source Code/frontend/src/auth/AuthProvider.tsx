import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import keycloak from './keycloak';

interface AuthContextType {
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: () => void;
  logout: () => void;
  userRoles: string[];
  token?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

let didInit = false;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const BYPASS_KEYCLOAK = true;

  const [isInitialized, setIsInitialized] = useState(BYPASS_KEYCLOAK);
  const [isAuthenticated, setIsAuthenticated] = useState(BYPASS_KEYCLOAK);
  const [userRoles, setUserRoles] = useState<string[]>(BYPASS_KEYCLOAK ? ['inventory_manager', 'admin'] : []);

  // Temporary bypass for development without Keycloak.

  // const [isInitialized, setIsInitialized] = useState(false);
  // const [isAuthenticated, setIsAuthenticated] = useState(false);
  // const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    // Temporary bypass for development without Keycloak.
    if (BYPASS_KEYCLOAK) return;

    if (didInit) return;
    didInit = true;

    keycloak.init({
      onLoad: 'login-required', 
      checkLoginIframe: false 
    }).then((authenticated) => {
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        if (keycloak.tokenParsed?.realm_access?.roles) {
          setUserRoles(keycloak.tokenParsed.realm_access.roles);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      setIsInitialized(true);
    }).catch((error) => {
      console.error("Keycloak initialization failed:", error);
      setIsInitialized(true); 
    });

    // Automatically check when token expires. If refresh fails, boot them out.
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
    <AuthContext.Provider value={{
      isAuthenticated,
      isInitialized,
      userRoles,
      login: () => keycloak.login({ redirectUri: window.location.href }),
      logout: () => keycloak.logout({ redirectUri: window.location.origin }),
      token: keycloak.token
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};