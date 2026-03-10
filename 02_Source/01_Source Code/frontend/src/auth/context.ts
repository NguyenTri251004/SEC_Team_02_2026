import { createContext, useContext } from "react";
import type { CurrentUser, UserRole } from "../types";

export interface AuthContextType {
  isAuthenticated: boolean;
  isInitialized: boolean;
  /** Redirects to Keycloak login page */
  login: () => void;
  /** Redirects to Keycloak logout endpoint */
  logout: () => void;
  userRoles: string[];
  user: CurrentUser | null;
  switchRole: (role: UserRole) => void;
  token?: string;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
