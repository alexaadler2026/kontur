import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/** Collects console errors: a missing key or a failed load is reported there (ADR-0006). */
function consoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  return errors;
}

test.describe('SignFlow smoke', () => {
  test.describe('browser language the app does not have', () => {
    // Since task 1b the start language follows the browser (ADR-0006); German is the
    // fallback. Playwright's default locale en-US would now start in English.
    test.use({ locale: 'fr-FR' });

    test('starts in German, with the product title and no console errors', async ({
      page,
    }) => {
      const errors = consoleErrors(page);
      await page.goto('/');

      await expect(page).toHaveTitle('SignFlow');
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
      await expect(page.locator('sf-root router-outlet')).toBeAttached();
      expect(errors).toEqual([]);
    });
  });

  test.describe('Russian browser', () => {
    test.use({ locale: 'ru-RU' });

    test('starts in Russian; loads ru, plus de as the production fallback, never en', async ({
      page,
    }) => {
      const errors = consoleErrors(page);
      const loaded: string[] = [];
      page.on('response', (response) => {
        if (response.url().includes('/i18n/')) {
          loaded.push(
            `${new URL(response.url()).pathname} ${response.status()}`,
          );
        }
      });
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
      // e2e runs the production build: a key missing in ru shows German (ADR-0006),
      // so Transloco fetches de.json too. Other languages are fetched only on demand.
      expect(loaded.sort()).toEqual(['/i18n/de.json 200', '/i18n/ru.json 200']);
      expect(errors).toEqual([]);
    });
  });

  test.describe('translation file cannot be loaded (working beats pretty)', () => {
    test.use({ locale: 'ru-RU' });

    test('404 for ru.json: the app still starts, in German, and logs the reason', async ({
      page,
    }) => {
      const errors = consoleErrors(page);
      await page.route('**/i18n/ru.json', (route) =>
        route.fulfill({ status: 404, body: 'Not Found' }),
      );
      await page.goto('/');

      await expect(page.locator('sf-root router-outlet')).toBeAttached();
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('[i18n] Could not load "ru"'),
        ]),
      );
    });
  });

  test('applies Kontur design tokens and self-hosted IBM Plex fonts', async ({
    page,
  }) => {
    await page.goto('/');
    const body = page.locator('body');

    // --bg-page and --text-primary of the light theme (docs/design/tokens.json)
    await expect(body).toHaveCSS('background-color', 'rgb(247, 248, 250)');
    await expect(body).toHaveCSS('color', 'rgb(22, 27, 34)');
    await expect(body).toHaveCSS('font-family', /^"IBM Plex Sans"/);

    const fonts = await page.evaluate(async () => {
      // Loading a character forces the browser to fetch the face whose unicode-range covers it.
      const latin = await document.fonts.load('400 14px "IBM Plex Sans"', 'Ä');
      const cyrillic = await document.fonts.load(
        '400 14px "IBM Plex Sans"',
        'Ж',
      );
      return {
        registered: [...document.fonts].length,
        latin: latin.map((face) => face.status),
        cyrillicRange: cyrillic.map((face) => face.unicodeRange),
      };
    });

    expect(fonts.registered).toBe(10); // 5 faces x (latin + cyrillic)
    expect(fonts.latin).toEqual(['loaded']);
    expect(fonts.cyrillicRange).toHaveLength(1);
    expect(fonts.cyrillicRange[0]).toContain('U+400-45F');
  });

  test('has no WCAG 2.1 A/AA violations (axe)', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
