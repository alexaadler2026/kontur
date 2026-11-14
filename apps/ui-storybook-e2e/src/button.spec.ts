import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Opens one story without the Storybook UI and waits until it is rendered. */
async function openStory(page: Page, id: string): Promise<void> {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
  await expect(
    page.locator('#storybook-root button, #storybook-root a').first(),
  ).toBeVisible();
}

const BUTTON_STORIES = [
  'components-button--playground',
  'components-button--variants',
  'components-button--sizes',
  'components-button--states',
  'components-button--as-link',
  'components-button--icon-buttons',
  'components-button--long-labels',
];

test.describe('Button stories — accessibility', () => {
  for (const id of BUTTON_STORIES) {
    test(`${id} has no WCAG 2.1 A/AA violations (axe)`, async ({ page }) => {
      await openStory(page, id);

      // Scoped to the story root: we test the component, not Storybook's iframe page.
      const results = await new AxeBuilder({ page })
        .include('#storybook-root')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('Font subsets load on demand (unicode-range)', () => {
  // Every test gets a fresh browser context, so there is no font cache between tests.
  // Build output names carry a hash: IBMPlexSans-500-cyrillic.8f83….woff2
  const CYRILLIC = /-cyrillic(\.[0-9a-f]+)?\.woff2$/;
  const SANS_500_LATIN = /IBMPlexSans-500(\.[0-9a-f]+)?\.woff2$/;
  const SANS_500_CYRILLIC = /IBMPlexSans-500-cyrillic(\.[0-9a-f]+)?\.woff2$/;

  async function fontRequests(page: Page, storyId: string): Promise<string[]> {
    const urls: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('.woff2')) urls.push(request.url());
    });
    await openStory(page, storyId);
    await page.evaluate(() => document.fonts.ready);
    return urls;
  }

  test('German text loads only latin files — 0 requests to *-cyrillic.woff2', async ({
    page,
  }) => {
    const urls = await fontRequests(page, 'components-button--variants');

    expect(urls.filter((url) => CYRILLIC.test(url))).toEqual([]);
    expect(urls.some((url) => SANS_500_LATIN.test(url))).toBe(true);
  });

  test('Russian text loads the cyrillic file', async ({ page }) => {
    const urls = await fontRequests(page, 'components-button--long-labels');

    expect(urls.some((url) => SANS_500_CYRILLIC.test(url))).toBe(true);
  });
});
