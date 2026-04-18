import { Pool } from "pg";
import dotenv from "dotenv";
import { logger } from "../observability/logger";
import { dbQueryDuration } from "../observability/metrics";

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

const originalQuery = pool.query.bind(pool);

pool.query = ((...args: unknown[]) => {
  const queryText = typeof args[0] === "string" ? args[0] : "unknown";
  const operation = queryText.split(" ")[0]?.toUpperCase() || "UNKNOWN";
  const maybeCallback = args[args.length - 1];

  if (typeof maybeCallback === "function") {
    return originalQuery(...(args as Parameters<typeof pool.query>));
  }

  const startedAt = process.hrtime.bigint();
  const queryResult = originalQuery(
    ...(args as Parameters<typeof pool.query>),
  ) as unknown;
  const queryPromise = queryResult as Promise<unknown>;

  return queryPromise
    .then((result) => {
      const seconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      dbQueryDuration.observe({ operation, status: "success" }, seconds);
      return result;
    })
    .catch((error: Error) => {
      const seconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      dbQueryDuration.observe({ operation, status: "error" }, seconds);
      logger.error({ operation, error: error.message }, "db.query.failed");
      throw error;
    });
}) as typeof pool.query;

export default pool;
