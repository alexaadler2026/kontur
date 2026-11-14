import { expect, test } from '@playwright/test';
import { openStory } from './support/story';

test.describe('Radio — native keyboard and the group error', () => {
  test('Tab lands on the checked option with the Kontur focus ring; arrows skip the disabled one', async ({
    page,
  }) => {
    await openStory(page, 'components-radio--states');
    const sequential = page.getByRole('radio', { name: /^Nacheinander/ });
    const parallel = page.getByRole('radio', { name: /^Parallel/ });

    await page.keyboard.press('Tab');
    await expect(sequential).toBeFocused();
    await expect(sequential).toBeChecked();
    // tokens.json (light): --focus-ring = var(--brand) = #0e5a6b
    await expect(sequential).toHaveCSS('outline-color', 'rgb(14, 90, 107)');

    await page.keyboard.press('ArrowDown');
    await expect(parallel).toBeChecked();
    await expect(parallel).toBeFocused();

    // "Benutzerdefiniert" is disabled: ArrowDown wraps to the first option
    await page.keyboard.press('ArrowDown');
    await expect(sequential).toBeChecked();
  });

  test('one Tab stop per group: the next Tab leaves the group', async ({
    page,
  }) => {
    await openStory(page, 'components-radio--states');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // the second group has no selection: Tab enters it on its first option
    await expect(
      page.getByRole('radio', { name: 'Einfach (SES)' }),
    ).toBeFocused();
  });

  test('submit without a choice: the error becomes the description of the group', async ({
    page,
  }) => {
    await openStory(page, 'components-radio--reactive-form');
    const group = page.getByRole('group', { name: 'Signaturniveau' });

    await page.getByRole('button', { name: 'Weiter' }).click();

    await expect(group).toHaveAccessibleDescription(
      'Bestimmt, wie stark die Unterschrift rechtlich bindet Bitte wählen Sie ein Signaturniveau',
    );
    await page.getByText('Qualifiziert (QES)').click();
    await expect(group).toHaveAccessibleDescription(
      'Bestimmt, wie stark die Unterschrift rechtlich bindet',
    );
  });
});
