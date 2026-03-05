import { Client } from "@elastic/elasticsearch";

const ELASTICSEARCH_URL =
  process.env.ELASTICSEARCH_URL || "http://localhost:9200";

// Initialize Elasticsearch client
const esClient = new Client({
  node: ELASTICSEARCH_URL,
  auth: process.env.ELASTICSEARCH_USERNAME
    ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD || "",
      }
    : undefined,
});

// Test connection on startup
esClient
  .ping()
  .then(() => {
    console.log("✓ Elasticsearch connected:", ELASTICSEARCH_URL);
  })
  .catch((err: Error) => {
    console.warn("⚠ Elasticsearch không kết nối được:", err.message);
  });

export default esClient;
