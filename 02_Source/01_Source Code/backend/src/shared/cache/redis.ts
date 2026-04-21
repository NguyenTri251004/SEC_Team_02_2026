import { createClient } from "redis";
import { logger } from "../observability/logger";
import { redisConnectionStatus } from "../observability/metrics";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    connectTimeout: 3000,
    reconnectStrategy: false,
  },
});


redisConnectionStatus.set(0);

redisClient.on("error", (err) => {
  redisConnectionStatus.set(0);
  logger.warn({ error: err.message }, "redis.connection.error");
});

redisClient.on("connect", () => {
  redisConnectionStatus.set(1);
  logger.info("redis.connection.ready");
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (err) {
    redisConnectionStatus.set(0);
    logger.warn({ error: err }, "redis.connection.skipped");
  }
};

export const CACHE_TTL = 60; // seconds

export default redisClient;
