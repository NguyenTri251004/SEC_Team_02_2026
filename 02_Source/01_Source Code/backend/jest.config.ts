import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  collectCoverageFrom: [
    "src/modules/lots/**/*.ts",
    "!src/modules/lots/**/*.types.ts",
    "src/modules/qc/**/*.ts",
    "!src/modules/qc/**/*.types.ts",
  ],
};

export default config;
