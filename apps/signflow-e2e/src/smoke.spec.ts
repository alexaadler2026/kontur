import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { get } from 'node:http';
import { join } from 'node:path';

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

/**
 * Since task 1d these tests run against the real, built signflow-api (port 4310, behind
 * the /api proxy of the static server). The API reports the version from its own
 * package.json, so the expected text is read from the same file.
 */
const apiVersion = (
  JSON.parse(
    readFileSync(join(__dirname, '../../signflow-api/package.json'), 'utf8'),
  ) as { version: string }
).version;

/** Sends the path exactly as written: browsers and fetch would normalize `/../`. */
function rawGet(path: string): Promise<{ status: number; body: string }> {
  const { hostname, port } = new URL(test.info().project.use.baseURL ?? '');
  return new Promise((done, fail) => {
    get({ hostname, port, path }, (response) => {
      let body = '';
      response.on('data', (chunk: Buffer) => (body += chunk.toString()));
      response.on('end', () =>
        done({ status: response.statusCode ?? 0, body }),
      );
    }).on('error', fail);
  });
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
      await expect(page.getByRole('status')).toHaveText(
        `API: OK, Version ${apiVersion}`,
      );
      expect(errors).toEqual([]);
    });

    test('start page: main landmark and the product name as h1', async ({
      page,
    }) => {
      await page.goto('/');

      await expect(page.getByRole('main')).toBeVisible();
      await expect(
        page.getByRole('heading', { level: 1, name: 'SignFlow' }),
      ).toBeVisible();
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
      // The app starts as soon as ru.json arrives; de.json keeps loading in the background
      // (provide-i18n.ts). Wait for it before comparing, or the list races the request.
      const german = page.waitForResponse((r) =>
        r.url().endsWith('/i18n/de.json'),
      );
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
      await german;
      // e2e runs the production build: a key missing in ru shows German (ADR-0006),
      // so Transloco fetches de.json too. Other languages are fetched only on demand.
      expect(loaded.sort()).toEqual(['/i18n/de.json 200', '/i18n/ru.json 200']);
      expect(errors).toEqual([]);
    });
  });

  test.describe('translation file cannot be loaded (working beats pretty)', () => {
    test.use({ locale: 'ru-RU' });

    test('404 for de.json: the app still starts in Russian — German is only the fallback', async ({
      page,
    }) => {
      const errors = consoleErrors(page);
      await page.route('**/i18n/de.json', (route) =>
        route.fulfill({ status: 404, body: 'Not Found' }),
      );
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
      await expect(page.getByRole('status')).toHaveText(
        `API: OK, версия ${apiVersion}`,
      );
      // The browser adds its own "Failed to load resource: 404" line.
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('[i18n] Could not load "de"'),
        ]),
      );
    });

    test('a key missing in ru.json: production shows the German text (ADR-0006)', async ({
      page,
    }) => {
      await page.route('**/i18n/ru.json', async (route) => {
        const ru = (await (await route.fetch()).json()) as {
          apiStatus: Record<string, string>;
        };
        delete ru.apiStatus['ok'];
        await route.fulfill({ json: ru });
      });
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
      await expect(page.getByRole('status')).toHaveText(
        `API: OK, Version ${apiVersion}`,
      );
    });

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

  test.describe('public settings (ADR-0009)', () => {
    test('loads them from the real API before the start', async ({ page }) => {
      const errors = consoleErrors(page);
      const settings = page.waitForResponse('**/api/v1/config');
      await page.goto('/');

      const response = await settings;
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ version: apiVersion });
      await expect(page.locator('sf-root router-outlet')).toBeAttached();
      expect(errors).toEqual([]);
    });

    test('API answers 503: the app still starts and logs the reason', async ({
      page,
    }) => {
      const errors = consoleErrors(page);
      await page.route('**/api/v1/config', (route) =>
        route.fulfill({ status: 503, body: 'Service Unavailable' }),
      );
      await page.goto('/');

      await expect(page.locator('sf-root router-outlet')).toBeAttached();
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('[config] Could not load /api/v1/config'),
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

  test('API errors arrive as Problem Details through the /api proxy (ADR-0008)', async ({
    request,
  }) => {
    const response = await request.get('/api/v1/does-not-exist');

    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain(
      'application/problem+json',
    );
    expect(await response.json()).toMatchObject({
      code: 'request.not_found',
      status: 404,
      instance: '/api/v1/does-not-exist',
    });
  });

  test.describe('static server never serves files outside the build folder', () => {
    // dist/apps/signflow/browser is four levels below the repository root.
    for (const path of [
      '/../../../../package.json',
      '/..%2f..%2f..%2f..%2fpackage.json',
    ]) {
      test(`${path} → 404`, async () => {
        const response = await rawGet(path);

        expect(response.status).toBe(404);
        expect(response.body).not.toContain('"@adlersoft/source"');
      });
    }
  });

  test('has no WCAG 2.1 A/AA violations (axe)', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
