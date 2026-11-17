import { expect, test } from '@playwright/test';
import { colorToken, openStory } from './support/story';

test('Alert tones: subtle background, 3px edge and icon in the tone colour; text stays text-primary', async ({
  page,
}) => {
  await openStory(page, 'components-alert--inline');
  const error = page
    .getByRole('alert')
    .filter({ hasText: 'Passwort ist falsch' });

  await expect(error).toHaveCSS(
    'background-color',
    await colorToken(page, '--error-subtle'),
  );
  await expect(error).toHaveCSS('border-left-width', '3px');
  await expect(error).toHaveCSS(
    'border-left-color',
    await colorToken(page, '--error'),
  );
  await expect(error).toHaveCSS(
    'color',
    await colorToken(page, '--text-primary'),
  );
  await expect(error.locator('svg.k-ico')).toHaveCSS(
    'color',
    await colorToken(page, '--error'),
  );
});

test('Dismissible: keyboard close moves the focus to the next control, the host removes the alert', async ({
  page,
}) => {
  await openStory(page, 'components-alert--dismissible');
  const close = page.getByRole('button', { name: 'Schließen' });

  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.locator('k-alert')).toHaveCount(0);
  await expect(page.getByTestId('next')).toBeFocused();
});

test('the close button name follows the toolbar language (KonturIntl on top of Transloco)', async ({
  page,
}) => {
  await openStory(page, 'components-alert--dismissible', 'locale:ru');
  await expect(page.getByRole('button', { name: 'Закрыть' })).toBeVisible();

  await openStory(page, 'components-alert--dismissible', 'locale:en');
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
});

test('Re-announce: the second identical failure is a new live region, not the old one', async ({
  page,
}) => {
  await openStory(page, 'components-alert--reannounce');
  const submit = page.getByRole('button', { name: 'Anmelden' });

  await submit.click();
  const alert = page.getByRole('alert');
  await expect(alert).toHaveText('E-Mail-Adresse oder Passwort ist falsch.');
  // Mark the DOM node; a re-created element will not carry the mark.
  await alert.evaluate((node) => node.setAttribute('data-first', ''));

  await submit.click();
  await expect(alert).toHaveCount(1);
  await expect(alert).not.toHaveAttribute('data-first');
});
