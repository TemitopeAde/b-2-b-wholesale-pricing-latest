import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/wholesale/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    clearMocks: true,
  },
});
