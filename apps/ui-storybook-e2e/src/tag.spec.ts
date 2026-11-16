import { expect, test } from '@playwright/test';
import { colorToken, openStory } from './support/story';

test('Tag: Tab reaches the remove button, which shows the shared focus ring; hover is error red', async ({
  page,
}) => {
  await openStory(page, 'components-tag--states');
  const remove = page.getByRole('button', { name: 'Entfernen NDA' });

  await page.keyboard.press('Tab');
  await expect(remove).toBeFocused();
  await expect(remove).toHaveCSS('outline-style', 'solid');
  await expect(remove).toHaveCSS(
    'outline-color',
    await colorToken(page, '--focus-ring'),
  );

  await remove.hover();
  await expect(remove).toHaveCSS('color', await colorToken(page, '--error'));
});

test('Filter bar: after removing a tag the focus goes to the next tag, at the end to "Filter hinzufügen"', async ({
  page,
}) => {
  await openStory(page, 'components-tag--filter-bar');
  const bar = page.getByTestId('filter-bar');

  await page.getByRole('button', { name: 'Entfernen NDA' }).focus();
  await page.keyboard.press('Enter');
  await expect(bar.locator('k-tag')).toHaveText(['Q4-2026', 'Signiert']);
  await expect(
    page.getByRole('button', { name: 'Entfernen Q4-2026' }),
  ).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Entfernen Signiert' }),
  ).toBeFocused();

  await page.keyboard.press(' ');
  await expect(bar.locator('k-tag')).toHaveCount(0);
  await expect(page.getByTestId('add-filter')).toBeFocused();
});

test('the built-in action word follows the toolbar language (KonturIntl on top of Transloco)', async ({
  page,
}) => {
  await openStory(page, 'components-tag--states', 'locale:ru');
  await expect(page.getByRole('button', { name: 'Удалить NDA' })).toBeVisible();

  await openStory(page, 'components-tag--states', 'locale:en');
  await expect(page.getByRole('button', { name: 'Remove NDA' })).toBeVisible();
});
