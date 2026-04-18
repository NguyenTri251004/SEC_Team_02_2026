type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const SHOULD_LOG_DEBUG = import.meta.env.DEV;

const log = (level: LogLevel, event: string, context?: LogContext): void => {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    context: context ?? {},
  };

  if (level === "debug" && !SHOULD_LOG_DEBUG) {
    return;
  }

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.log(payload);
};

export const frontendLogger = {
  debug: (event: string, context?: LogContext) => log("debug", event, context),
  info: (event: string, context?: LogContext) => log("info", event, context),
  warn: (event: string, context?: LogContext) => log("warn", event, context),
  error: (event: string, context?: LogContext) => log("error", event, context),
};
