import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const dbProvider =
  process.env.DB_PROVIDER || (nodeEnv === "production" ? "remote" : "local");

const pool =
  dbProvider === "remote" && process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      })
    : new Pool({
        user: process.env.DB_USER || "myuser",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "mydatabase",
        password: process.env.DB_PASSWORD || "mypassword",
        port: parseInt(process.env.DB_PORT || "5432"),
      });

export default pool;
