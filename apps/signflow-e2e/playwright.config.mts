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
  // Playwright alone starts the servers (owner, 2026-11-24). Run it as `nx e2e signflow-e2e`:
  // the e2e target first builds both apps and prepares the e2e database (project.json
  // dependsOn) — outside the timeouts below. Each server is then ONE `nx run` without
  // task dependencies: with CI=true Nx has no daemon and spends up to ~1 min on the
  // project graph per call (measured 2026-11-25). reuseExistingServer only outside CI.
  // Hard limits (owner, 2026-11-24): a hang becomes a quick red run, not a 65-minute wait.
  globalTimeout: 10 * 60_000,
  // Removes the e2e database (compose.e2e.yaml) after the run.
  globalTeardown: './src/support/global-teardown.ts',
  webServer: [
    {
      // The API through THE serve target (owner, 2026-11-24: one way to start it, so a
      // broken serve is a red e2e), configuration e2e: port 4310 on the e2e database
      // (compose.e2e.yaml, prepared by the e2e target's dependsOn).
      command:
        'pnpm exec nx run signflow-api:serve:e2e --exclude-task-dependencies',
      url: `http://localhost:${apiPort}/api/v1/health/live`,
      reuseExistingServer: !process.env['CI'],
      name: 'signflow-api (serve:e2e)',
      // Nx start (~1 min without daemon) + API start (~10 s), measured 2026-11-25.
      timeout: 180_000,
      cwd: workspaceRoot,
    },
    {
      // Static build + /api proxy to the API (apps/signflow-e2e/static-server.mjs).
      name: 'signflow static build',
      command:
        'pnpm exec nx run signflow:serve-static --exclude-task-dependencies',
      url: baseURL,
      timeout: 180_000,
      reuseExistingServer: !process.env['CI'],
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
