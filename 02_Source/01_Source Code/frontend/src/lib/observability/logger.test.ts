import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { frontendLogger } from "./logger";

describe("frontendLogger", () => {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    logSpy.mockClear();
    warnSpy.mockClear();
    errorSpy.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes info, warn, and error logs to the expected console methods", () => {
    frontendLogger.info("info.event", { ok: true });
    frontendLogger.warn("warn.event");
    frontendLogger.error("error.event");

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: "info.event", level: "info" }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: "warn.event", level: "warn" }),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: "error.event", level: "error" }),
    );
  });

  it("handles debug logging according to the active dev flag", () => {
    frontendLogger.debug("debug.event");

    if (import.meta.env.DEV) {
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({ event: "debug.event", level: "debug" }),
      );
      return;
    }

    expect(logSpy).not.toHaveBeenCalled();
  });
});
