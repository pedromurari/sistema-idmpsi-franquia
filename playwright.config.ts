import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:8091",
    headless: true,
    channel: process.platform === "win32" ? "msedge" : undefined,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node tests/serve-ui.mjs",
    url: "http://127.0.0.1:8091",
    reuseExistingServer: !process.env.CI,
  },
});
