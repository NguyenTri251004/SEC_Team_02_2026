import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
} from "@opentelemetry/semantic-conventions";
import { frontendLogger } from "./logger";

let tracingReady = false;

export const initializeTracing = (): void => {
  if (tracingReady || import.meta.env.VITE_OTEL_ENABLED === "false") {
    return;
  }

  const exporterEndpoint =
    import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!exporterEndpoint) {
    frontendLogger.warn("observability.tracing.disabled_missing_endpoint");
    return;
  }

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: "ims-frontend",
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: import.meta.env.VITE_ENVIRONMENT ?? "local",
    }),
    spanProcessors: [
      new BatchSpanProcessor(new OTLPTraceExporter({ url: exporterEndpoint })),
    ],
  });

  provider.register({ contextManager: new ZoneContextManager() });

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
    ],
  });

  tracingReady = true;
  frontendLogger.info("observability.tracing.ready", { exporterEndpoint });
};
