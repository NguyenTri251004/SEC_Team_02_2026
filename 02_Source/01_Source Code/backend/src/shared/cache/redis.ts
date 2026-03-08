import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    connectTimeout: 3000,
    reconnectStrategy: false,
  },
});

redisClient.on("error", (err) =>
  console.warn("⚠️  Redis không kết nối được, tiếp tục không có cache:", err.message)
);

redisClient.on("connect", () => console.log("✓ Đã kết nối Redis"));

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.warn("⚠️  Bỏ qua Redis, chạy không có cache.");
  }
};

export const CACHE_TTL = 60; // seconds

export default redisClient;
