import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "packages/core/src/__tests__/**/*.test.ts",
      "lib/__tests__/**/*.test.ts",
    ],
  },
});
