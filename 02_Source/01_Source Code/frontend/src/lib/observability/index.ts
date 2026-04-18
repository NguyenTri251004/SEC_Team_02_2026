import { initializeGlobalErrorHandlers } from "./errors";
import { frontendLogger } from "./logger";
import { initializeTracing } from "./tracing";
import { initializeWebVitals } from "./vitals";

let observabilityInitialized = false;

export const initializeObservability = (): void => {
  if (observabilityInitialized) {
    return;
  }

  initializeTracing();
  initializeGlobalErrorHandlers();
  initializeWebVitals();

  observabilityInitialized = true;
  frontendLogger.info("observability.initialized");
};
