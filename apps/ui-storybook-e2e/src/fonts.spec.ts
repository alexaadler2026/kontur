import { expect, test, type Page } from '@playwright/test';
import { openStory } from './support/story';

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

test.describe('Font subsets load on demand (unicode-range)', () => {
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
