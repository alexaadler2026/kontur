import { expect, test } from '@playwright/test';
import { openStory } from './support/story';

/**
 * Signal Forms prototype (ADR-0021): when errors appear, server field errors from Problem
 * Details, a general form error for wrong credentials, translated texts.
 * Fake server of the story: "max@beispiel.de" / "Passwort123" signs in; an e-mail without a
 * dot in the domain passes the client rule but the server rejects it with 422 errors[].
 */
const STORY = 'forms-sign-in--prototype';
const REQUIRED = 'Bitte füllen Sie dieses Feld aus.';
const EMAIL = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
const CREDENTIALS = 'E-Mail-Adresse oder Passwort ist falsch.';

test.describe('Sign-in form with Signal Forms (ADR-0021)', () => {
  test('empty submit: both fields show the required-field error, linked to the inputs; focus on the first invalid field', async ({
    page,
  }) => {
    await openStory(page, STORY);
    const email = page.getByLabel('E-Mail-Adresse');
    const password = page.getByLabel('Passwort');

    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAccessibleDescription(REQUIRED);
    await expect(password).toHaveAttribute('aria-invalid', 'true');
    await expect(password).toHaveAccessibleDescription(REQUIRED);
    await expect(email).toBeFocused();
  });

  test('while typing no new error appears; a fixed error disappears at once; leaving the field shows the new one', async ({
    page,
  }) => {
    await openStory(page, STORY);
    const email = page.getByLabel('E-Mail-Adresse');

    await email.focus();
    await page.keyboard.press('Tab'); // leave empty
    await expect(email).toHaveAccessibleDescription(REQUIRED);

    await email.focus();
    await page.keyboard.type('max'); // required fixed, e-mail not valid yet
    await expect(email).toHaveAccessibleDescription(''); // fixed error gone, no new one
    await expect(email).not.toHaveAttribute('aria-invalid', 'true');

    await page.keyboard.press('Tab'); // leave: now the new error shows
    await expect(email).toHaveAccessibleDescription(EMAIL);

    await email.focus();
    await page.keyboard.type('@beispiel.de'); // fixed while typing
    await expect(email).toHaveAccessibleDescription('');
  });

  test('server field error (422 errors[] with pointer /email) is shown at the e-mail field and goes away on change', async ({
    page,
  }) => {
    await openStory(page, STORY);
    const email = page.getByLabel('E-Mail-Adresse');

    await email.fill('max@beispiel'); // valid for the client rule, rejected by the server
    await page.getByLabel('Passwort').fill('Passwort123');
    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(email).toHaveAccessibleDescription(EMAIL);
    await expect(page.getByRole('alert')).toHaveCount(0); // a field error, not a form error

    await email.focus();
    await page.keyboard.type('.de');
    await expect(email).toHaveAccessibleDescription('');
  });

  test('wrong credentials: one general alert above the button, no error at either field', async ({
    page,
  }) => {
    await openStory(page, STORY);
    const email = page.getByLabel('E-Mail-Adresse');
    const password = page.getByLabel('Passwort');

    await email.fill('max@beispiel.de');
    await password.fill('falsch');
    await page.getByRole('button', { name: 'Anmelden' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toHaveText(CREDENTIALS);
    await expect(password).not.toHaveAttribute('aria-invalid', 'true');
    await expect(email).not.toHaveAttribute('aria-invalid', 'true');
    // above the button: the alert comes before the button in the document
    const before = await alert.evaluate(
      (node, button) =>
        !!(
          node.compareDocumentPosition(button as Node) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
      await page.getByRole('button', { name: 'Anmelden' }).elementHandle(),
    );
    expect(before).toBe(true);
  });

  test('correct credentials sign in', async ({ page }) => {
    await openStory(page, STORY);
    await page.getByLabel('E-Mail-Adresse').fill('max@beispiel.de');
    await page.getByLabel('Passwort').fill('Passwort123');
    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(page.getByRole('status')).toHaveText(
      'Angemeldet als max@beispiel.de',
    );
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('texts follow the language: Russian errors and alert', async ({
    page,
  }) => {
    await openStory(page, STORY, 'locale:ru');
    const email = page.getByLabel('Электронная почта');

    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(email).toHaveAccessibleDescription('Обязательное поле');

    await email.fill('max@beispiel.de');
    await page.getByLabel('Пароль').fill('falsch');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'Неверный адрес электронной почты или пароль.',
    );
  });
});
