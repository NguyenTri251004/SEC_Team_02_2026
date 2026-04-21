import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import pool from "./shared/db/pool";
import { connectRedis } from "./shared/cache/redis";
import esClient from "./shared/elasticsearch/client";
import { logger } from "./shared/observability/logger";
import { getMetricsRegistry } from "./shared/observability/metrics";
import { observabilityMiddleware } from "./shared/observability/middleware";
import { startTracing } from "./shared/observability/tracing";
import materialRoutes from "./modules/materials/material.routes";
import transactionRoutes from "./modules/transactions/transaction.routes";
import searchRoutes from "./modules/search/search.routes";
import lotRoutes from "./modules/lots/lot.routes";
import qcRoutes from "./modules/qc/qc.routes";
import labelRoutes from "./modules/labels/label.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import reportRoutes from "./modules/reports/reports.routes";
import productionRoutes from "./modules/production/production.routes";
import adminRoutes from "./modules/admin/admin.routes";
import chatRoutes from "./modules/chat/chat.routes";
import ragRoutes from "./modules/rag/rag.routes";

dotenv.config();
startTracing();

if (process.env.NODE_ENV === "production" && process.env.BYPASS_AUTH === "true") {
  throw new Error("BYPASS_AUTH cannot be enabled in production");
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(observabilityMiddleware);
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, traceparent, x-correlation-id, x-metrics-token",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Routes cơ bản
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "IMS Backend API", version: "1.0.0" });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/metrics", async (_req: Request, res: Response) => {
  const metricsToken = process.env.METRICS_AUTH_TOKEN;
  const headerToken = _req.header("x-metrics-token");
  const authHeader = _req.header("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : undefined;
  const providedToken = headerToken ?? bearerToken;

  if (!metricsToken) {
    res.status(503).json({ success: false, error: "Metrics token not configured" });
    return;
  }

  if (providedToken !== metricsToken) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  res.set("Content-Type", getMetricsRegistry().contentType);
  res.send(await getMetricsRegistry().metrics());
});

// Module routes
app.use("/api/materials", materialRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/lots", lotRoutes);
app.use("/api/qc", qcRoutes);
app.use("/api/labels", labelRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/rag", ragRoutes);
app.use("/rag", ragRoutes);

// Khởi động server
const start = async (): Promise<void> => {
  // Kiểm tra kết nối PostgreSQL
  pool.connect((err, client, done) => {
    if (err || !client) {
      logger.error({ error: err?.message }, "postgres.connection.failed");
      return;
    }
    logger.info("postgres.connection.ready");
    done();

    // One-time migration: set last_login for users who have never logged in
    pool.query(
      `UPDATE users SET last_login = modified_date WHERE last_login IS NULL`
    ).then((res) => {
      if (res.rowCount && res.rowCount > 0) {
        logger.info({ count: res.rowCount }, "users.last_login.initialized");
      }
    }).catch((e) => logger.warn({ error: e.message }, "users.last_login.migration_skipped"));
  });

  // Kết nối Redis (không bắt buộc — app vẫn chạy nếu Redis không có)
  await connectRedis();

  // Test Elasticsearch connection (không bắt buộc)
  try {
    await esClient.ping();
  } catch (error) {
    // Đã log warning trong client.ts
  }

  app.listen(PORT, () => {
    logger.info({ port: PORT }, "server.started");
    logger.info("routes.ready");
  });
};

start();
