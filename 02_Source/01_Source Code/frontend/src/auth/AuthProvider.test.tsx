import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./context";

const { keycloakMock } = vi.hoisted(() => ({
  keycloakMock: {
    token: "initial-token",
    tokenParsed: {} as Record<string, unknown>,
    init: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updateToken: vi.fn(),
    onTokenExpired: undefined as (() => void) | undefined,
    onAuthRefreshSuccess: undefined as (() => void) | undefined,
  },
}));

vi.mock("./keycloak", () => ({
  default: keycloakMock,
}));

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="initialized">{String(auth.isInitialized)}</div>
      <div data-testid="authenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="role">{auth.user?.role ?? "none"}</div>
      <div data-testid="token">{auth.token ?? "none"}</div>
      <button onClick={auth.login}>login</button>
      <button onClick={auth.logout}>logout</button>
      <button onClick={() => auth.switchRole("viewer")}>switch-viewer</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    keycloakMock.token = "initial-token";
    keycloakMock.tokenParsed = {};
    keycloakMock.init.mockReset();
    keycloakMock.login.mockReset();
    keycloakMock.logout.mockReset();
    keycloakMock.updateToken.mockReset();
    keycloakMock.onTokenExpired = undefined;
    keycloakMock.onAuthRefreshSuccess = undefined;
  });

  it("initializes auth state and picks highest-priority role", async () => {
    keycloakMock.tokenParsed = {
      sub: "user-1",
      preferred_username: "alice",
      email: "alice@example.com",
      realm_access: {
        roles: ["viewer", "quality_control", "admin"],
      },
    };
    keycloakMock.init.mockResolvedValue(true);

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true"),
    );

    expect(screen.getByTestId("initialized")).toHaveTextContent("true");
    expect(screen.getByTestId("role")).toHaveTextContent("admin");
    expect(screen.getByTestId("token")).toHaveTextContent("initial-token");

    await user.click(screen.getByRole("button", { name: "login" }));
    expect(keycloakMock.login).toHaveBeenCalledWith({
      redirectUri: `${window.location.origin}/`,
    });

    await user.click(screen.getByRole("button", { name: "logout" }));
    expect(keycloakMock.logout).toHaveBeenCalledWith({
      redirectUri: window.location.origin,
    });

    await user.click(screen.getByRole("button", { name: "switch-viewer" }));
    expect(screen.getByTestId("role")).toHaveTextContent("viewer");
  });

  it("resets state when token refresh fails on expiration", async () => {
    keycloakMock.tokenParsed = {
      sub: "user-2",
      preferred_username: "bob",
      email: "bob@example.com",
      realm_access: { roles: ["production"] },
    };
    keycloakMock.init.mockResolvedValue(true);
    keycloakMock.updateToken.mockRejectedValue(new Error("refresh failed"));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true"),
    );

    keycloakMock.onTokenExpired?.();

    await waitFor(() =>
      expect(screen.getByTestId("authenticated")).toHaveTextContent("false"),
    );
    expect(screen.getByTestId("role")).toHaveTextContent("none");
    expect(screen.getByTestId("token")).toHaveTextContent("none");
  });

  it("updates token on auth refresh success", async () => {
    keycloakMock.tokenParsed = {
      sub: "user-3",
      preferred_username: "charlie",
      email: "charlie@example.com",
      realm_access: { roles: ["viewer"] },
    };
    keycloakMock.init.mockResolvedValue(true);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("token")).toHaveTextContent("initial-token"),
    );

    keycloakMock.token = "refreshed-token";
    keycloakMock.onAuthRefreshSuccess?.();

    await waitFor(() =>
      expect(screen.getByTestId("token")).toHaveTextContent("refreshed-token"),
    );
  });

  it("marks provider initialized when keycloak init fails", async () => {
    keycloakMock.init.mockRejectedValue(new Error("init failed"));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("initialized")).toHaveTextContent("true"),
    );
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
  });
});
