import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import { frontendLogger } from "./logger";

const reportVital = (metricName: string, value: number, rating: string): void => {
  frontendLogger.info("frontend.web_vital", {
    metricName,
    value,
    rating,
  });
};

export const initializeWebVitals = (): void => {
  onCLS((metric) => reportVital(metric.name, metric.value, metric.rating));
  onINP((metric) => reportVital(metric.name, metric.value, metric.rating));
  onLCP((metric) => reportVital(metric.name, metric.value, metric.rating));
  onFCP((metric) => reportVital(metric.name, metric.value, metric.rating));
  onTTFB((metric) => reportVital(metric.name, metric.value, metric.rating));
};
