import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import { trace } from "@opentelemetry/api";
import { getRequestLogger } from "./logger";
import { httpRequestDuration, httpRequestsTotal, toStatusClass } from "./metrics";

const REQUEST_ID_HEADER = "x-correlation-id";

export const observabilityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const requestId = (req.header(REQUEST_ID_HEADER) || randomUUID()).trim();
  const startedAt = process.hrtime.bigint();

  res.setHeader(REQUEST_ID_HEADER, requestId);

  res.on("finish", () => {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    const route = req.route?.path ? `${req.baseUrl || ""}${req.route.path}` : "unmatched_route";
    const statusCode = res.statusCode;
    const statusClass = toStatusClass(statusCode);
    const activeSpan = trace.getActiveSpan();
    const traceId = activeSpan?.spanContext().traceId;

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_class: statusClass,
      status_code: String(statusCode),
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_class: statusClass,
        status_code: String(statusCode),
      },
      durationSeconds,
    );

    getRequestLogger(requestId).info({
      method: req.method,
      route,
      statusCode,
      durationMs: Number((durationSeconds * 1000).toFixed(2)),
      traceId,
      userAgent: req.get("user-agent") ?? null,
      ip: req.ip,
    }, "request.completed");
  });

  next();
};
