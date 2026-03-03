import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { CurrentUser, UserRole } from "../types";

interface AuthContextValue {
  user: CurrentUser | null;
  /** Temporary: switch role for demo/dev purposes */
  switchRole: (role: UserRole) => void;
  isAuthenticated: boolean;
}

const DEMO_USER: CurrentUser = {
  user_id: "demo-001",
  username: "demo_user",
  email: "demo@example.com",
  role: "admin",
  is_active: true,
  last_login_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextValue>({
  user: DEMO_USER,
  switchRole: () => {},
  isAuthenticated: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(DEMO_USER);

  const switchRole = useCallback((role: UserRole) => {
    setUser((prev) => (prev ? { ...prev, role } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, switchRole, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
