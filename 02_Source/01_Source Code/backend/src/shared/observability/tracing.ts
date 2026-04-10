import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { logger } from "./logger";

let tracingStarted = false;
let sdkInstance: NodeSDK | null = null;

export const startTracing = (): void => {
  if (tracingStarted || process.env.OTEL_ENABLED === "false") {
    return;
  }

  const traceEndpoint =
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
    `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318"}/v1/traces`;

  sdkInstance = new NodeSDK({
    traceExporter: new OTLPTraceExporter({ url: traceEndpoint }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
      }),
    ],
  });

  sdkInstance.start();
  tracingStarted = true;
  logger.info({ traceEndpoint }, "observability.tracing.started");

  process.once("SIGTERM", () => {
    sdkInstance?.shutdown().catch(() => undefined);
  });
};
