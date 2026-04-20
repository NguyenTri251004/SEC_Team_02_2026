import { beforeEach, describe, expect, it, vi } from "vitest";

const { loggerMock, errorsMock, tracingMock, vitalsMock } = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  errorsMock: vi.fn(),
  tracingMock: vi.fn(),
  vitalsMock: vi.fn(),
}));

vi.mock("./logger", () => ({
  frontendLogger: loggerMock,
}));

vi.mock("./errors", () => ({
  initializeGlobalErrorHandlers: errorsMock,
}));

vi.mock("./tracing", () => ({
  initializeTracing: tracingMock,
}));

vi.mock("./vitals", () => ({
  initializeWebVitals: vitalsMock,
}));

describe("initializeObservability", () => {
  beforeEach(() => {
    vi.resetModules();
    loggerMock.info.mockReset();
    errorsMock.mockReset();
    tracingMock.mockReset();
    vitalsMock.mockReset();
  });

  it("initializes observability only once", async () => {
    const { initializeObservability } = await import("./index");

    initializeObservability();
    initializeObservability();

    expect(tracingMock).toHaveBeenCalledOnce();
    expect(errorsMock).toHaveBeenCalledOnce();
    expect(vitalsMock).toHaveBeenCalledOnce();
    expect(loggerMock.info).toHaveBeenCalledOnce();
  });
});
