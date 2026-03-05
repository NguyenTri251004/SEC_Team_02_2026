import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Ưu tiên DATABASE_URL nếu có (cho cả dev và prod)
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    })
  : new Pool({
      user: process.env.DB_USER || "myuser",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "mydatabase",
      password: process.env.DB_PASSWORD || "mypassword",
      port: parseInt(process.env.DB_PORT || "5432"),
    });

export default pool;
