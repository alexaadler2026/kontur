import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The test account of the e2e database (compose.e2e.yaml, src/e2e-database.ts of signflow-api). */
export const e2eUser = JSON.parse(
  readFileSync(join(__dirname, 'e2e-user.json'), 'utf8'),
) as { email: string; password: string };

/**
 * Chrome logs every 4xx answer as "Failed to load resource". A 401 of GET /session is the
 * normal answer "nobody is signed in" (the guards ask it on every start since task 8-3),
 * so exactly that line is not an error of the app.
 */
const SIGNED_OUT_ANSWER =
  'Failed to load resource: the server responded with a status of 401 (Unauthorized)';

/** Collects console errors: a missing key or a failed load is reported there (ADR-0006). */
export function consoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const fromSession = message.location().url.endsWith('/api/v1/session');
    if (fromSession && message.text() === SIGNED_OUT_ANSWER) return;
    errors.push(message.text());
  });
  return errors;
}

/**
 * Signs in through the sign-in screen and waits for the start page. Works in every UI
 * language: the fields are found by their autocomplete, the button by type="submit".
 */
export async function signIn(page: Page, url = '/'): Promise<void> {
  await page.goto(url);
  await page.locator('input[autocomplete="username"]').fill(e2eUser.email);
  await page
    .locator('input[autocomplete="current-password"]')
    .fill(e2eUser.password);
  await page.locator('button[type="submit"]').click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'SignFlow' }),
  ).toBeVisible();
}
