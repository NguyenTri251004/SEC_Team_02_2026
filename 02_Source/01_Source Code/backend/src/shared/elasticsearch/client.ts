import { Client } from "@elastic/elasticsearch";
import { logger } from "../observability/logger";
import { elasticsearchConnectionStatus } from "../observability/metrics";

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
elasticsearchConnectionStatus.set(0);

esClient
  .ping()
  .then(() => {
    elasticsearchConnectionStatus.set(1);
    logger.info({ node: ELASTICSEARCH_URL }, "elasticsearch.connection.ready");
  })
  .catch((err: Error) => {
    elasticsearchConnectionStatus.set(0);
    logger.warn({ error: err.message, node: ELASTICSEARCH_URL }, "elasticsearch.connection.error");
  });

export default esClient;
