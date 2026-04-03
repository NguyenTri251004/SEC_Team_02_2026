import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins truthy classes with spaces", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters falsy values", () => {
    expect(cn("btn", undefined, null, false, "active")).toBe("btn active");
  });

  it("returns an empty string when no valid classes are provided", () => {
    expect(cn(undefined, null, false)).toBe("");
  });
});
