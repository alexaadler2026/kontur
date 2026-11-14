import { expect, test } from '@playwright/test';
import { openStory } from './support/story';

test.describe('Switch — keyboard and the dark-theme knob', () => {
  test('Tab focuses it with the Kontur focus ring; Space switches on and off', async ({
    page,
  }) => {
    await openStory(page, 'components-switch--states');
    const toggle = page.getByRole('switch', { name: 'Erinnerungen' });

    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    // tokens.json (light): --focus-ring = var(--brand) = #0e5a6b
    await expect(toggle).toHaveCSS('outline-color', 'rgb(14, 90, 107)');

    await page.keyboard.press('Space');
    await expect(toggle).toBeChecked();
    await page.keyboard.press('Space');
    await expect(toggle).not.toBeChecked();
  });

  test('dark theme: the knob is switch-knob = text-on-brand #12161c, not white (v3 contrast fix)', async ({
    page,
  }) => {
    await openStory(page, 'components-switch--dark-theme');
    const toggle = page.getByRole('switch', { name: 'Dunkles Design' });

    const knob = await toggle.evaluate(
      (el) => getComputedStyle(el, '::after').backgroundColor,
    );

    expect(knob).toBe('rgb(18, 22, 28)');
  });

  test('instant setting: switching applies the dark theme right away', async ({
    page,
  }) => {
    await openStory(page, 'components-switch--instant-setting');
    const panel = page.getByTestId('settings-panel');

    await expect(panel).toHaveAttribute('data-theme', 'light');
    await page.getByText('Dunkles Design').click();
    await expect(panel).toHaveAttribute('data-theme', 'dark');
  });
});
