import { defineConfig, devices } from "@playwright/test";

// Requires the API on :4000 (`docker compose up backend` from the workspace root)
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    locale: "es-ES",
    permissions: ["camera"],
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // A synthetic webcam feed, with the permission prompt auto-accepted
          args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
        },
      },
    },
  ],
  webServer: {
    // A production build: the dev server compiles routes on demand and proved unreliable under parallel tests
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000/es/login",
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
