import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuthContext, useAuth, type AuthContextType } from "./context";

function Consumer() {
  const auth = useAuth();
  return <div>{auth.user?.username ?? "no-user"}</div>;
}

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    expect(() => render(<Consumer />)).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });

  it("returns context value when provider is present", () => {
    const value: AuthContextType = {
      isAuthenticated: true,
      isInitialized: true,
      login: () => undefined,
      logout: () => undefined,
      userRoles: ["admin"],
      user: {
        user_id: "1",
        username: "alice",
        email: "alice@example.com",
        role: "admin",
        is_active: true,
        last_login_at: null,
      },
      switchRole: () => undefined,
      token: "token-1",
    };

    const { getByText } = render(
      <AuthContext.Provider value={value}>
        <Consumer />
      </AuthContext.Provider>,
    );

    expect(getByText("alice")).toBeInTheDocument();
  });
});
