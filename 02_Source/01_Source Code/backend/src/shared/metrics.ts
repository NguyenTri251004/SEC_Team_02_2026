import { collectDefaultMetrics, Counter, Gauge, Histogram, register } from "prom-client";

collectDefaultMetrics({ prefix: "ims_backend_" });

export const httpRequestTotal = new Counter({
  name: "ims_http_requests_total",
  help: "Total HTTP requests handled",
  labelNames: ["method", "route", "status_code"] as const,
});

export const httpRequestDurationSeconds = new Histogram({
  name: "ims_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

export const httpErrorTotal = new Counter({
  name: "ims_http_errors_total",
  help: "Total HTTP error responses",
  labelNames: ["method", "route", "status_code"] as const,
});

export const systemHealthStatus = new Gauge({
  name: "ims_system_health_status",
  help: "System health status by backend dependency",
  labelNames: ["service", "status"] as const,
});

systemHealthStatus.labels({ service: "database", status: "up" }).set(1);
systemHealthStatus.labels({ service: "redis", status: "up" }).set(1);

httpErrorTotal.labels({ method: "GET", route: "/metrics", status_code: "500" }).inc(0);

export { register };
