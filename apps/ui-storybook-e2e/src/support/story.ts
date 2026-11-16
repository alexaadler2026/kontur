import { expect, type Page } from '@playwright/test';

/**
 * Opens one story without the Storybook UI and waits until the component is rendered.
 * `globals` sets toolbar values, e.g. `locale:ru` for the language switcher (ADR-0006).
 */
export async function openStory(
  page: Page,
  id: string,
  globals?: string,
): Promise<void> {
  const query = globals ? `&globals=${globals}` : '';
  await page.goto(`/iframe.html?id=${id}&viewMode=story${query}`);
  await expect(page.locator('#storybook-root > *').first()).toBeVisible();
}

interface StoryIndex {
  entries: Record<string, { id: string; type: 'story' | 'docs' }>;
}

/** All story ids from Storybook's index.json — new stories are covered automatically. */
export async function allStoryIds(page: Page): Promise<string[]> {
  const response = await page.request.get('/index.json');
  expect(response.ok()).toBe(true);
  const index = (await response.json()) as StoryIndex;
  return Object.values(index.entries)
    .filter((entry) => entry.type === 'story')
    .map((entry) => entry.id);
}

/** The browser's own value of a colour token, so tests never hard-code a hex value. */
export function colorToken(page: Page, name: string): Promise<string> {
  return page.evaluate((variable) => {
    const probe = document.createElement('span');
    probe.style.background = `var(${variable})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, name);
}
