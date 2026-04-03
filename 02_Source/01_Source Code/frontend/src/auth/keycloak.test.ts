import { describe, expect, it, vi } from "vitest";

const KeycloakCtor = vi.fn();

vi.mock("keycloak-js", () => ({
  default: KeycloakCtor,
}));

describe("keycloak config", () => {
  it("constructs keycloak with expected fallback values", async () => {
    await import("./keycloak");

    expect(KeycloakCtor).toHaveBeenCalledWith({
      url: "http://localhost:8080",
      realm: "inventory-management",
      clientId: "inventory-frontend",
    });
  });
});
