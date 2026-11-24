import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { consoleErrors, e2eUser, signIn } from './support/app';

// Task 8-3: the main journeys of the sign-in screen against the real API and database
// (task 8-1). Behaviour: docs/design/screens/signflow/Anmelden.md.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function axe(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  // Rule, element and the reason (e.g. the measured contrast), so a failure is readable.
  return results.violations.flatMap((v) =>
    v.nodes.map(
      (node) =>
        `${v.id}: ${node.target.join(' ')} — ${node.any[0]?.message ?? v.help}`,
    ),
  );
}

test.use({ locale: 'de-DE' });

test('sign in → start page → sign out → sign-in screen', async ({ page }) => {
  const errors = consoleErrors(page);
  await signIn(page);
  await expect(page).toHaveURL('/');

  await page.getByRole('button', { name: 'Abmelden' }).click();

  await expect(page).toHaveURL('/login');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Anmelden' }),
  ).toBeVisible();
  // Signed out on the server too: the start page sends back to the sign-in screen.
  await page.goto('/');
  await expect(page).toHaveURL('/login?returnUrl=%2F');
  expect(errors).toEqual([]);
});

test('wrong password: one error above the button, no field marked', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('E-Mail-Adresse').fill(e2eUser.email);
  await page.getByLabel('Passwort').fill('Falsches-Passwort-123456');
  await page.getByRole('button', { name: 'Anmelden' }).click();

  await expect(page.locator('form').getByRole('alert')).toHaveText(
    'E-Mail-Adresse oder Passwort ist falsch.',
  );
  await expect(page.getByLabel('E-Mail-Adresse')).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('Passwort')).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page).toHaveURL('/login');
});

test('deep link: sign-in screen first, then back to the page that was asked for', async ({
  page,
}) => {
  await signIn(page, '/?ansicht=2');

  await expect(page).toHaveURL('/?ansicht=2');
});

test('the chosen language survives a reload', async ({ page }) => {
  await page.goto('/login');
  await page
    .getByRole('combobox', { name: 'Sprache' })
    .selectOption({ label: 'English (en-GB)' });

  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible();
  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue(
    'en',
  );
});

test.describe('axe (WCAG 2.1 A/AA)', () => {
  test('desktop, light, empty (Anmelden)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    expect(await axe(page)).toEqual([]);
  });

  test.describe('mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('390 px, field errors after a submit (AnmeldenMobil)', async ({
      page,
    }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: 'Anmelden' }).click();

      await expect(page.getByLabel('E-Mail-Adresse')).toBeFocused();
      await expect(page.getByLabel('E-Mail-Adresse')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
      // Touch sizes below the 960 px breakpoint (k-field--touch, k-btn--touch).
      await expect(page.getByLabel('E-Mail-Adresse')).toHaveClass(
        /k-field--touch/,
      );
      expect(await axe(page)).toEqual([]);
    });
  });

  test('desktop, dark, form error (AnmeldenDunkel)', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() =>
      document.documentElement.setAttribute('data-theme', 'dark'),
    );
    await page.getByLabel('E-Mail-Adresse').fill(e2eUser.email);
    await page.getByLabel('Passwort').fill('Falsches-Passwort-654321');
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await expect(page.locator('form').getByRole('alert')).toBeVisible();

    expect(await axe(page)).toEqual([]);
  });
});
