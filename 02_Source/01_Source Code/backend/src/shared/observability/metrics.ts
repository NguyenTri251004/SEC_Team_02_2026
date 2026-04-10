import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestsTotal = new client.Counter({
  name: "http_server_requests_total",
  help: "Total HTTP requests handled by backend",
  labelNames: ["method", "route", "status_class", "status_code"],
  registers: [register],
});

export const httpRequestDuration = new client.Histogram({
  name: "http_server_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_class", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "PostgreSQL query duration in seconds",
  labelNames: ["operation", "status"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

export const authFailuresTotal = new client.Counter({
  name: "auth_failures_total",
  help: "Authentication failures grouped by reason",
  labelNames: ["reason"],
  registers: [register],
});

export const redisConnectionStatus = new client.Gauge({
  name: "redis_connection_status",
  help: "Redis connection status (1 connected, 0 disconnected)",
  registers: [register],
});

export const elasticsearchConnectionStatus = new client.Gauge({
  name: "elasticsearch_connection_status",
  help: "Elasticsearch connection status (1 connected, 0 disconnected)",
  registers: [register],
});

export const getMetricsRegistry = () => register;

export const toStatusClass = (statusCode: number): string => {
  if (statusCode >= 500) return "5xx";
  if (statusCode >= 400) return "4xx";
  if (statusCode >= 300) return "3xx";
  if (statusCode >= 200) return "2xx";
  return "1xx";
};
