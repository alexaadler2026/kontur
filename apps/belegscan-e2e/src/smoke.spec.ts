import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Belegscan smoke', () => {
  test('loads with German as default language and product title', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Belegscan');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
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
