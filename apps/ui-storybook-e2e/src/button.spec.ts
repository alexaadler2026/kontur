import { expect, test } from '@playwright/test';
import { openStory } from './support/story';

// Kontur v4: the danger button changes colour by tokens (--error-hover / --error-active),
// not by filter: brightness(). Values from docs/design/tokens.json v4.
test.describe('Button danger — hover and active by tokens', () => {
  test('real mouse hover and press use error-hover and error-active (light)', async ({
    page,
  }) => {
    await openStory(page, 'components-button--variants');
    const danger = page.getByRole('button', { name: 'Löschen' });

    await danger.hover();
    await expect(danger).toHaveCSS('background-color', 'rgb(154, 29, 20)'); // #9a1d14
    await expect(danger).toHaveCSS('filter', 'none');

    await page.mouse.down();
    await expect(danger).toHaveCSS('background-color', 'rgb(127, 24, 16)'); // #7f1810
    await page.mouse.up();
  });

  test('dark theme: hover and active are lighter than error (dark text on them)', async ({
    page,
  }) => {
    await openStory(page, 'components-button--interaction-states');
    const dark = page.getByTestId('theme-dark');

    await expect(
      dark.getByRole('button', { name: 'Ablehnen (hover)' }),
    ).toHaveCSS(
      'background-color',
      'rgb(245, 143, 136)', // #f58f88
    );
    await expect(
      dark.getByRole('button', { name: 'Ablehnen (active)' }),
    ).toHaveCSS(
      'background-color',
      'rgb(248, 171, 165)', // #f8aba5
    );
  });
});
