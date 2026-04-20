import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  batchSpanProcessorCtor,
  documentLoadInstrumentationCtor,
  loggerMock,
  otlpTraceExporterCtor,
  registerInstrumentations,
  resourceFromAttributes,
  webTracerProviderCtor,
  zoneContextManagerCtor,
} = vi.hoisted(() => ({
  batchSpanProcessorCtor: vi.fn(),
  documentLoadInstrumentationCtor: vi.fn(),
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  otlpTraceExporterCtor: vi.fn(),
  registerInstrumentations: vi.fn(),
  resourceFromAttributes: vi.fn((attributes) => attributes),
  webTracerProviderCtor: vi.fn(),
  zoneContextManagerCtor: vi.fn(),
}));

vi.mock("./logger", () => ({
  frontendLogger: loggerMock,
}));

vi.mock("@opentelemetry/context-zone", () => ({
  ZoneContextManager: function ZoneContextManager() {
    zoneContextManagerCtor();
  },
}));

vi.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: function OTLPTraceExporter(config: unknown) {
    otlpTraceExporterCtor(config);
  },
}));

vi.mock("@opentelemetry/instrumentation-document-load", () => ({
  DocumentLoadInstrumentation: function DocumentLoadInstrumentation() {
    documentLoadInstrumentationCtor();
  },
}));

vi.mock("@opentelemetry/instrumentation", () => ({
  registerInstrumentations,
}));

vi.mock("@opentelemetry/resources", () => ({
  resourceFromAttributes,
}));

vi.mock("@opentelemetry/sdk-trace-base", () => ({
  BatchSpanProcessor: function BatchSpanProcessor(exporter: unknown) {
    batchSpanProcessorCtor(exporter);
  },
}));

vi.mock("@opentelemetry/sdk-trace-web", () => ({
  WebTracerProvider: function WebTracerProvider(config: unknown) {
    webTracerProviderCtor(config);
    return { register: vi.fn() };
  },
}));

describe("initializeTracing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    loggerMock.info.mockReset();
    loggerMock.warn.mockReset();
    batchSpanProcessorCtor.mockReset();
    documentLoadInstrumentationCtor.mockReset();
    otlpTraceExporterCtor.mockReset();
    registerInstrumentations.mockReset();
    resourceFromAttributes.mockClear();
    webTracerProviderCtor.mockReset();
    zoneContextManagerCtor.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips tracing when explicitly disabled", async () => {
    vi.stubEnv("VITE_OTEL_ENABLED", "false");
    const { initializeTracing } = await import("./tracing");

    initializeTracing();

    expect(webTracerProviderCtor).not.toHaveBeenCalled();
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it("warns when exporter endpoint is missing", async () => {
    const { initializeTracing } = await import("./tracing");

    initializeTracing();

    expect(loggerMock.warn).toHaveBeenCalledWith(
      "observability.tracing.disabled_missing_endpoint",
    );
    expect(webTracerProviderCtor).not.toHaveBeenCalled();
  });

  it("registers tracing dependencies once when configured", async () => {
    vi.stubEnv("VITE_OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318/v1/traces");
    vi.stubEnv("VITE_ENVIRONMENT", "test");
    const { initializeTracing } = await import("./tracing");

    initializeTracing();
    initializeTracing();

    expect(resourceFromAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        "deployment.environment": "test",
        "service.name": "ims-frontend",
      }),
    );
    expect(otlpTraceExporterCtor).toHaveBeenCalledWith({
      url: "http://localhost:4318/v1/traces",
    });
    expect(batchSpanProcessorCtor).toHaveBeenCalledOnce();
    expect(documentLoadInstrumentationCtor).toHaveBeenCalledOnce();
    expect(zoneContextManagerCtor).toHaveBeenCalledOnce();
    expect(registerInstrumentations).toHaveBeenCalledOnce();
    expect(loggerMock.info).toHaveBeenCalledWith(
      "observability.tracing.ready",
      { exporterEndpoint: "http://localhost:4318/v1/traces" },
    );
  });
});
