import { expect, test } from '@playwright/test';
import { openStory } from './support/story';

test.describe('Checkbox — keyboard and pointer (real Chromium)', () => {
  test('Tab focuses the box with the Kontur focus ring, Space toggles it', async ({
    page,
  }) => {
    await openStory(page, 'components-checkbox--with-hint');
    const box = page.getByRole('checkbox', { name: 'Erinnerungen per E-Mail' });

    await page.keyboard.press('Tab');
    await expect(box).toBeFocused();
    // tokens.json (light): --focus-ring = var(--brand) = #0e5a6b, --focus-width = 2px
    await expect(box).toHaveCSS('outline-color', 'rgb(14, 90, 107)');

    await page.keyboard.press('Space');
    await expect(box).toBeChecked();
    await page.keyboard.press('Space');
    await expect(box).not.toBeChecked();
  });

  test('clicking the label text toggles the box', async ({ page }) => {
    await openStory(page, 'components-checkbox--with-hint');

    await page.getByText('Erinnerungen per E-Mail', { exact: true }).click();

    await expect(
      page.getByRole('checkbox', { name: 'Erinnerungen per E-Mail' }),
    ).toBeChecked();
  });

  test('submitting without consent shows the error text and marks the box invalid', async ({
    page,
  }) => {
    await openStory(page, 'components-checkbox--reactive-form');
    const box = page.getByRole('checkbox', { name: 'Ich stimme den AGB zu' });

    await page.getByRole('button', { name: 'Weiter' }).click();

    await expect(box).toHaveAttribute('aria-invalid', 'true');
    await expect(box).toHaveAccessibleDescription(
      'Pflicht für die Registrierung Bitte stimmen Sie den AGB zu, um fortzufahren',
    );
  });
});
