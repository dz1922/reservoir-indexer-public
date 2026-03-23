import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 30 * 1000,
  testMatch: ["**/__tests__/**/*.test.ts"],
};

export default config;
