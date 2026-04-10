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
  const tracer = trace.getTracer("ims-backend-http");
  const spanName = `${req.method} ${req.path || req.originalUrl || "unknown"}`;

  res.setHeader(REQUEST_ID_HEADER, requestId);

  tracer.startActiveSpan(spanName, (span) => {
    span.setAttribute("http.method", req.method);
    span.setAttribute("http.target", req.originalUrl || req.url);
    span.setAttribute("http.scheme", req.protocol);
    span.setAttribute("http.user_agent", req.get("user-agent") ?? "unknown");
    span.setAttribute("http.client_ip", req.ip ?? "unknown");

    let spanEnded = false;

    const finalizeSpan = (isAborted: boolean): void => {
      if (spanEnded) {
        return;
      }

      spanEnded = true;
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      const route = req.route?.path ? `${req.baseUrl || ""}${req.route.path}` : "unmatched_route";
      const statusCode = res.statusCode;
      const statusClass = toStatusClass(statusCode);
      const traceId = span.spanContext().traceId;

      span.setAttribute("http.status_code", statusCode);
      span.setAttribute("ims.request.route", route);
      if (isAborted) {
        span.setAttribute("ims.request.aborted", true);
      }
      span.end();

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
    };

    res.once("finish", () => finalizeSpan(false));
    res.once("close", () => finalizeSpan(!res.writableEnded));

    next();
  });
};
