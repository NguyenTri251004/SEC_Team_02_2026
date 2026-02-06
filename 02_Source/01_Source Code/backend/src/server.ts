import express, { Request, Response } from "express";
import { Pool, PoolClient } from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool
// Supports both local PostgreSQL and Supabase via NODE_ENV / DB_PROVIDER
const nodeEnv = process.env.NODE_ENV || "development";
const dbProvider =
  process.env.DB_PROVIDER || (nodeEnv === "production" ? "remote" : "local");

const pool =
  dbProvider === "remote" && process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
      })
    : new Pool({
        user: process.env.DB_USER || "myuser",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "mydatabase",
        password: process.env.DB_PASSWORD || "mypassword",
        port: parseInt(process.env.DB_PORT || "5432"),
      });

// Test database connection
pool.connect((err, client, done) => {
  if (err || !client) {
    console.error("❌ Error connecting to PostgreSQL:", err?.stack ?? err);
    return;
  }

  console.log("✓ Connected to PostgreSQL database");
  const dbHost = dbProvider === "remote" ? "Supabase" : "Local PostgreSQL";
  console.log(`   Database: ${dbHost}`);
  done();
});

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "hello world" });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// API: Get data from PostgreSQL database
app.get("/api/users", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch data from database",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});
