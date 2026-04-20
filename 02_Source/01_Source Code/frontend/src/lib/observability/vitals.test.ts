import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  loggerMock,
  onCLS,
  onFCP,
  onINP,
  onLCP,
  onTTFB,
} = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}));

vi.mock("./logger", () => ({
  frontendLogger: loggerMock,
}));

vi.mock("web-vitals", () => ({
  onCLS,
  onFCP,
  onINP,
  onLCP,
  onTTFB,
}));

import { initializeWebVitals } from "./vitals";

type WebVitalMetric = {
  name: string;
  value: number;
  rating: string;
};

describe("initializeWebVitals", () => {
  beforeEach(() => {
    loggerMock.info.mockReset();
    onCLS.mockReset();
    onFCP.mockReset();
    onINP.mockReset();
    onLCP.mockReset();
    onTTFB.mockReset();
  });

  it("registers all vitals reporters and logs metric payloads", () => {
    initializeWebVitals();

    const metric: WebVitalMetric = { name: "CLS", value: 0.01, rating: "good" };
    for (const spy of [onCLS, onINP, onLCP, onFCP, onTTFB]) {
      const callback = spy.mock.calls[0]?.[0] as (metric: WebVitalMetric) => void;
      callback(metric);
    }

    expect(onCLS).toHaveBeenCalledOnce();
    expect(onINP).toHaveBeenCalledOnce();
    expect(onLCP).toHaveBeenCalledOnce();
    expect(onFCP).toHaveBeenCalledOnce();
    expect(onTTFB).toHaveBeenCalledOnce();
    expect(loggerMock.info).toHaveBeenCalledWith("frontend.web_vital", {
      metricName: "CLS",
      value: 0.01,
      rating: "good",
    });
  });
});
