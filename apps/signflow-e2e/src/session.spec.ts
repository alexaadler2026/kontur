import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Task 8-1: the e2e API has a real PostgreSQL (Testcontainers) with the test account of
 * support/e2e-user.json. Signed in from inside the page, so the browser keeps the
 * __Host-sid cookie (Secure is allowed on localhost) and sends Sec-Fetch-Site itself.
 */
const user = JSON.parse(
  readFileSync(join(__dirname, 'support/e2e-user.json'), 'utf8'),
) as { email: string; password: string };

test('the e2e account signs in against the real API and database', async ({
  page,
}) => {
  await page.goto('/');
  // Only the two fields: the file's comment key would be rejected (unknown property).

  const result = await page.evaluate(
    async (credentials) => {
      const created = await fetch('/api/v1/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const session = await fetch('/api/v1/session');
      return {
        created: created.status,
        session: session.status,
        body: (await session.json()) as unknown,
      };
    },
    { email: user.email, password: user.password },
  );

  expect(result.created).toBe(204);
  expect(result.session).toBe(200);
  expect(result.body).toMatchObject({ user: { email: user.email } });
  const cookies = await page.context().cookies();
  expect(cookies.map((cookie) => cookie.name)).toContain('__Host-sid');
});
