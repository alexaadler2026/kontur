import { expect, test } from '@playwright/test';
import { openStory } from './support/story';

test.describe('TextField — keyboard and pointer', () => {
  test('clicking the label moves the focus into the field', async ({
    page,
  }) => {
    await openStory(page, 'components-textfield--states');

    await page.getByText('Placeholder', { exact: true }).click();

    await expect(page.getByLabel('Placeholder')).toBeFocused();
  });

  test('Tab reaches the field and shows the Kontur focus ring', async ({
    page,
  }) => {
    await openStory(page, 'components-textfield--states');

    await page.keyboard.press('Tab');

    const field = page.getByRole('textbox', { name: 'Vertragspartner' });
    await expect(field).toBeFocused();
    // tokens.json (light): --focus-ring = var(--brand) = #0e5a6b, --focus-width = 2px
    await expect(field).toHaveCSS('outline-style', 'solid');
    await expect(field).toHaveCSS('outline-width', '2px');
    await expect(field).toHaveCSS('outline-color', 'rgb(14, 90, 107)');
  });
});
