import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const isCI = !!process.env['CI'];
// Static Storybook build (dist/storybook/ui-storybook); port 4402, so it never clashes
// with the apps (4200 signflow, 4201 belegscan) or the Storybook dev server (4400).
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
    // locally an already running server is reused; in CI always a fresh build
    reuseExistingServer: !isCI,
    cwd: workspaceRoot,
    timeout: 240_000, // includes the Storybook build
  },
  projects: [
    {
      name: 'chromium',
      // channel 'chromium' = full Chromium in new headless mode (no separate headless-shell download)
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
});
