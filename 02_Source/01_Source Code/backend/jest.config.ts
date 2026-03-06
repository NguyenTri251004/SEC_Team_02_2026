import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  collectCoverageFrom: [
    "src/modules/**/*.ts",
    "src/security/**/*.ts",
    "!src/modules/**/*.types.ts",
    "src/modules/qc/**/*.ts",
    "!src/modules/qc/**/*.types.ts",
    "!src/modules/**/*.routes.ts",
    "!src/**/__tests__/**",
  ],
};

export default config;
