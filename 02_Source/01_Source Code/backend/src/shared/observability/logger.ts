import pino from "pino";

const level = process.env.LOG_LEVEL ?? "info";

export const logger = pino({
  level,
  base: {
    service: process.env.OTEL_SERVICE_NAME ?? "ims-backend",
    environment: process.env.NODE_ENV ?? "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const getRequestLogger = (requestId: string) =>
  logger.child({ requestId });
