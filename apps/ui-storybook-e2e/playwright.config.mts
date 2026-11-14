import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// Static Storybook build (dist/storybook/ui-storybook); port 4402, so it never clashes
// with the app e2e servers (4300, 4301), the dev servers (4200, 4201) or Storybook dev (4400).
const baseURL = 'http://localhost:4402';

/**
 * E2E for component stories: axe on every story and font-subset loading.
 * Stories are opened directly via iframe.html?id=… (no Storybook UI around them).
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm exec nx run ui-storybook:static-storybook',
    url: baseURL,
    // true: when run via `nx e2e`, Nx has already built Storybook (build-storybook, cached) and
    // started static-storybook on 4402. The dev Storybook (`nx storybook`) uses 4400.
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  projects: [
    {
      name: 'chromium',
      // channel 'chromium' = full Chromium in new headless mode (no separate headless-shell download)
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
});
