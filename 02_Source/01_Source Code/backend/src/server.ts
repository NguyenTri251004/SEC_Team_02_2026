import express, { Request, Response, NextFunction } from "express";
import pinoHttp from "pino-http";
import dotenv from "dotenv";
import pool from "./shared/db/pool";
import { connectRedis } from "./shared/cache/redis";
import esClient from "./shared/elasticsearch/client";
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
import logger from "./shared/logger";
import {
  httpErrorTotal,
  httpRequestDurationSeconds,
  httpRequestTotal,
  register,
} from "./shared/metrics";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger: logger as any }));
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  const start = process.hrtime();
  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationSeconds = seconds + nanoseconds / 1e9;
    const method = req.method;
    const route = req.baseUrl && req.route?.path ? `${req.baseUrl}${req.route.path}` : req.route?.path ?? req.path;
    const statusCode = res.statusCode.toString();

    httpRequestTotal.inc({ method, route, status_code: statusCode });
    httpRequestDurationSeconds.observe({ method, route, status_code: statusCode }, durationSeconds);

    if (res.statusCode >= 500) {
      httpErrorTotal.inc({ method, route, status_code: statusCode });
    }
  });

  next();
});

// Metrics endpoint for Prometheus scraping
app.get("/metrics", async (_req: Request, res: Response) => {
  try {
    res.setHeader("Content-Type", register.contentType);
    res.send(await register.metrics());
  } catch (error) {
    logger.error({ err: error }, "Failed to scrape metrics");
    res.status(500).send("Unable to collect metrics");
  }
});

// Routes cơ bản
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "IMS Backend API", version: "1.0.0" });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
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

// Khởi động server
const start = async (): Promise<void> => {
  // Kiểm tra kết nối PostgreSQL
  pool.connect((err, client, done) => {
    if (err || !client) {
      logger.error({ err }, "❌ Lỗi kết nối PostgreSQL");
      return;
    }
    logger.info("✓ Đã kết nối PostgreSQL");
    done();

    // One-time migration: set last_login for users who have never logged in
    pool.query(
      `UPDATE users SET last_login = modified_date WHERE last_login IS NULL`
    ).then((res) => {
      if (res.rowCount && res.rowCount > 0) {
        logger.info({ rowCount: res.rowCount }, "✓ Initialized last_login for users");
      }
    }).catch((e) => logger.warn({ err: e }, "last_login migration skipped"));
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
    logger.info({ port: PORT }, `✓ Server đang chạy tại http://localhost:${PORT}`);
    logger.info("  GET  /api/materials");
    logger.info("  POST /api/materials");
    logger.info("  GET  /api/transactions");
    logger.info("  POST /api/transactions");
    logger.info("  GET  /api/lots");
    logger.info("  POST /api/lots");
    logger.info("  GET  /api/qc/tests");
    logger.info("  POST /api/qc/tests");
    logger.info("  GET  /api/qc/queue");
    logger.info("  GET  /api/qc/stats");
    logger.info("  POST /api/qc/approve/:lotId");
    logger.info("  POST /api/qc/reject/:lotId");
    logger.info("  GET  /api/production/batches");
    logger.info("  POST /api/production/batches");
    logger.info("  GET  /api/search?q=keyword");
    logger.info("  POST /api/search/index (Index all materials)");
    logger.info("  GET  /api/admin/users (Admin only)");
    logger.info("  GET  /api/admin/stats (Admin only)");
  });
};

start();

// test commit 5