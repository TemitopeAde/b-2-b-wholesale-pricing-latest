import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
export default defineConfig({
  webServer: {
    command: "npx vite --config tests/wholesale/browser/vite.config.ts",
    cwd: fileURLToPath(new URL("../../../", import.meta.url)),
    url: "http://127.0.0.1:4871",
    reuseExistingServer: !process.env["CI"],
    timeout: 30000,
  },
  testDir: ".",
  testMatch: "form.spec.ts",
  workers: 1,
  outputDir: "/tmp/wholesale-playwright-results",
  use: {
    baseURL: "http://127.0.0.1:4871",
    viewport: { width: 320, height: 800 },
    channel: "chrome",
  },
});
