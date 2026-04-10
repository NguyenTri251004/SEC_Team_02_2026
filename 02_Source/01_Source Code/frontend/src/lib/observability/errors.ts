import { frontendLogger } from "./logger";

const toErrorMessage = (reason: unknown): string => {
  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === "string") {
    return reason;
  }

  return "Unknown client-side error";
};

export const initializeGlobalErrorHandlers = (): void => {
  window.addEventListener("error", (event) => {
    frontendLogger.error("frontend.window.error", {
      message: event.message,
      fileName: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error instanceof Error ? event.error.stack : undefined,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    frontendLogger.error("frontend.window.unhandled_rejection", {
      reason: toErrorMessage(event.reason),
    });
  });
};
