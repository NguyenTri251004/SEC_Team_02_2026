import { describe, expect, it } from "vitest";
import { useUIStore } from "./uiStore";

describe("useUIStore", () => {
  it("starts with sidebar expanded", () => {
    useUIStore.setState({ sidebarCollapsed: false });
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it("toggles sidebar collapsed state", () => {
    useUIStore.setState({ sidebarCollapsed: false });
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it("sets sidebar collapsed to an explicit value", () => {
    useUIStore.getState().setSidebarCollapsed(true);
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
  });
});
