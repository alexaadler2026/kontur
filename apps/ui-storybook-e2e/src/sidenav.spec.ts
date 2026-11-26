import { expect, test } from '@playwright/test';
import { colorToken, openStory } from './support/story';

test.describe('SideNav (real Chromium)', () => {
  test('the count is part of the link name: "Entwürfe, 3"', async ({
    page,
  }) => {
    await openStory(page, 'components-sidenav--counts');

    await expect(
      page.getByRole('link', { name: 'Entwürfe, 3', exact: true }),
    ).toBeVisible();
  });

  test('Tab focuses the first item with the Kontur focus ring', async ({
    page,
  }) => {
    await openStory(page, 'components-sidenav--active-item');
    const first = page.getByRole('link', { name: 'Übersicht' });

    await page.keyboard.press('Tab');
    await expect(first).toBeFocused();
    await expect(first).toHaveCSS('outline-style', 'solid');
    await expect(first).toHaveCSS('outline-width', '2px'); // --focus-width
    await expect(first).toHaveCSS(
      'outline-color',
      await colorToken(page, '--focus-ring'),
    );
  });
});
