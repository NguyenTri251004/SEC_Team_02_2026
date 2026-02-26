import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import pool from "./shared/db/pool";
import { connectRedis } from "./shared/cache/redis";
import materialRoutes from "./modules/materials/material.routes";
import transactionRoutes from "./modules/transactions/transaction.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
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

// Module routes
app.use("/api/materials", materialRoutes);
app.use("/api/transactions", transactionRoutes);

// Khởi động server
const start = async (): Promise<void> => {
  // Kiểm tra kết nối PostgreSQL
  pool.connect((err, client, done) => {
    if (err || !client) {
      console.error("❌ Lỗi kết nối PostgreSQL:", err?.message);
      return;
    }
    console.log("✓ Đã kết nối PostgreSQL");
    done();
  });

  // Kết nối Redis (không bắt buộc — app vẫn chạy nếu Redis không có)
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`✓ Server đang chạy tại http://localhost:${PORT}`);
    console.log(`  GET  /api/materials`);
    console.log(`  POST /api/materials`);
    console.log(`  GET  /api/transactions`);
    console.log(`  POST /api/transactions`);
  });
};

start();
