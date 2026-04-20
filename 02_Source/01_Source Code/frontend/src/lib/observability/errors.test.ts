import { beforeEach, describe, expect, it, vi } from "vitest";

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("./logger", () => ({
  frontendLogger: loggerMock,
}));

import { initializeGlobalErrorHandlers } from "./errors";

describe("initializeGlobalErrorHandlers", () => {
  beforeEach(() => {
    loggerMock.error.mockReset();
  });

  it("logs browser error and unhandled rejection events", () => {
    initializeGlobalErrorHandlers();

    const errorEvent = new ErrorEvent("error", {
      message: "boom",
      filename: "app.ts",
      lineno: 10,
      colno: 3,
      error: new Error("boom"),
    });
    window.dispatchEvent(errorEvent);

    const rejectionEvent = new PromiseRejectionEvent("unhandledrejection", {
      promise: Promise.resolve(),
      reason: "backend down",
    });
    window.dispatchEvent(rejectionEvent);

    expect(loggerMock.error).toHaveBeenNthCalledWith(
      1,
      "frontend.window.error",
      expect.objectContaining({
        message: "boom",
        fileName: "app.ts",
        line: 10,
        column: 3,
      }),
    );
    expect(loggerMock.error).toHaveBeenNthCalledWith(
      2,
      "frontend.window.unhandled_rejection",
      { reason: "backend down" },
    );
  });
});
