import { expect, type Page } from '@playwright/test';

/** Opens one story without the Storybook UI and waits until the component is rendered. */
export async function openStory(page: Page, id: string): Promise<void> {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
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
