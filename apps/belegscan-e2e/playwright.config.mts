import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { getReadyUrl, workspaceRoot } from '@nx/devkit';

/**
 * E2E always run against the production build on their own port (4301), never on the
 * dev-server port 4201: a running `nx serve belegscan` must never be reused by a test run.
 * The port does not depend on CI/env, so the Nx task graph (inferred from webServer.command)
 * is the same locally and in CI: build first (cached), then serve-static, then Playwright.
 */
const e2ePort = 4301;
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
  webServer: {
    command: 'pnpm exec nx run belegscan:serve-static',
    url: baseURL,
    // true: when run via `nx e2e`, Nx has already started serve-static on the e2e port.
    // Nothing else listens there — the dev server uses 4201.
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
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
