import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
const fixture = fileURLToPath(new URL("./sdk-fixture.ts", import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  cacheDir: "/tmp/wholesale-browser-vite-cache",
  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "classnames",
    ],
  },
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@wix/data": fixture,
      "@wix/members": fixture,
      "@wix/react-component-utils": fixture,
    },
  },
  server: { host: "127.0.0.1", port: 4871 },
});
