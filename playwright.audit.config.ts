import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import {
  DEFAULT_AUDIT_PORT,
  PROJECT_ROOT,
  resolveRunDir,
} from "./scripts/audit/common";

const runDir = resolveRunDir();
const baseURL = `http://127.0.0.1:${DEFAULT_AUDIT_PORT}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: "public-foundation.spec.ts",
  outputDir: path.join(runDir, "playwright", "test-results"),
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  reporter: [
    ["line"],
    ["json", { outputFile: path.join(runDir, "playwright", "results.json") }],
    [
      "html",
      {
        outputFolder: path.join(runDir, "playwright", "html-report"),
        open: "never",
      },
    ],
  ],
  use: {
    baseURL,
    browserName: "chromium",
    channel: "chrome",
    locale: "en-US",
    timezoneId: "America/New_York",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: `bun scripts/audit/static-server.ts --port=${DEFAULT_AUDIT_PORT} --root=build/client`,
    cwd: PROJECT_ROOT,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "phone-light-390x844",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        colorScheme: "light",
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "phone-dark-430x932",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 430, height: 932 },
        colorScheme: "dark",
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "phone-landscape-light-844x390",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 844, height: 390 },
        colorScheme: "light",
        hasTouch: true,
      },
    },
    {
      name: "tablet-dark-768x1024",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
        colorScheme: "dark",
        hasTouch: true,
      },
    },
    {
      name: "desktop-light-1440x900",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        colorScheme: "light",
      },
    },
    {
      name: "desktop-dark-2560x1440",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 2560, height: 1440 },
        colorScheme: "dark",
      },
    },
  ],
});
