import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { getReadyUrl, workspaceRoot } from '@nx/devkit';

/**
 * E2E always run against the production build on their own port (4300), never on the
 * dev-server port 4200: a running `nx serve signflow` must never be reused by a test run.
 * The port does not depend on CI/env, so the Nx task graph (inferred from webServer.command)
 * is the same locally and in CI: build first (cached), then serve-static, then Playwright.
 */
const e2ePort = 4300;
/** The built signflow-api for e2e (dev API: 3333). Ports: 4300 / 4301 / 4402 / 4310. */
const apiPort = 4310;
const baseURL =
  process.env['BASE_URL'] || getReadyUrl(`http://localhost:${e2ePort}`);

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import 'dotenv/config';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Generated as a .mts file so Node forces ESM regardless of workspace
 * `type`. Playwright routes `.mts` through its ESM loader (dynamic import,
 * bypassing the pirates CJS-compile path), and Nx's native TS strip loads
 * `.mts` directly. Playwright's configLoader auto-discovers
 * `playwright.config.mts` via its extension list
 * (.ts/.js/.mts/.mjs/.cts/.cjs).
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  // reuseExistingServer true: when run via `nx e2e`, Nx has already started both on the
  // e2e ports. Nothing else listens there — the dev servers use 4200 and 3333.
  webServer: [
    {
      // The built signflow-api (task 1d): e2e run against the real API, not a stub.
      command: 'pnpm exec nx run signflow-api:serve-e2e',
      url: `http://localhost:${apiPort}/api/v1/health/live`,
      reuseExistingServer: true,
      cwd: workspaceRoot,
    },
    {
      // Static build + /api proxy to the API (apps/signflow-e2e/static-server.mjs).
      command: 'pnpm exec nx run signflow:serve-static',
      url: baseURL,
      reuseExistingServer: true,
      cwd: workspaceRoot,
    },
  ],
  projects: [
    {
      name: 'chromium',
      // channel 'chromium' = full Chromium in new headless mode (no separate headless-shell download)
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },

    // Uncomment for mobile browsers support
    /* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */

    // Uncomment for branded browsers
    /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
  ],
});
