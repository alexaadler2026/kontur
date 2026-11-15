import { expect, type Page, test } from '@playwright/test';
import { openStory } from './support/story';

const STORY = 'i18n-plural-and-date--prototype';

/**
 * Intl puts non-breaking spaces into some formats (U+00A0 in "1 234,56 €" and before "€",
 * U+202F in other locales). Expected strings in this file are written with plain spaces,
 * so both sides are normalised before comparing.
 */
const plain = (text: string | null): string =>
  (text ?? '').replace(/[\u00a0\u202f]/g, ' ').trim();

async function texts(page: Page, testId: string): Promise<string[]> {
  return (await page.getByTestId(testId).locator('li').allTextContents()).map(
    plain,
  );
}

test.describe('i18n prototype — plurals and formats per language (ADR-0006)', () => {
  test('German (default): plural, date, currency; <html lang="de">', async ({
    page,
  }) => {
    await openStory(page, STORY);

    expect(await texts(page, 'documents')).toEqual([
      '0 Dokumente',
      '1 Dokument',
      '2 Dokumente',
      '5 Dokumente',
      '21 Dokumente',
    ]);
    expect(plain(await page.getByTestId('uploaded').textContent())).toBe(
      'Hochgeladen am 12.11.2026',
    );
    expect(plain(await page.getByTestId('amount').textContent())).toBe(
      'Betrag: 1.234,56 €',
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });

  test('Russian: three plural forms (one / few / many), ru-RU formats', async ({
    page,
  }) => {
    await openStory(page, STORY, 'locale:ru');

    expect(await texts(page, 'documents')).toEqual([
      '0 документов',
      '1 документ',
      '2 документа',
      '5 документов',
      '21 документ',
    ]);
    expect(plain(await page.getByTestId('uploaded').textContent())).toBe(
      'Загружено 12.11.2026',
    );
    const amount = await page.getByTestId('amount').textContent();
    expect(plain(amount)).toBe('Сумма: 1 234,56 €');
    // documents the Intl behaviour: the raw text really contains non-breaking spaces
    expect(amount).toMatch(/[\u00a0\u202f]/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  });

  test('English means en-GB: day/month/year and € before the amount', async ({
    page,
  }) => {
    await openStory(page, STORY, 'locale:en');

    expect(await texts(page, 'documents')).toEqual([
      '0 documents',
      '1 document',
      '2 documents',
      '5 documents',
      '21 documents',
    ]);
    expect(plain(await page.getByTestId('uploaded').textContent())).toBe(
      'Uploaded on 12/11/2026',
    );
    expect(plain(await page.getByTestId('amount').textContent())).toBe(
      'Amount: €1,234.56',
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('no missing-translation warnings in any language', async ({ page }) => {
    const missing: string[] = [];
    page.on('console', (message) => {
      if (/missing translation/i.test(message.text()))
        missing.push(message.text());
    });

    for (const locale of ['de', 'en', 'ru']) {
      await openStory(page, STORY, `locale:${locale}`);
      await expect(page.getByTestId('amount')).not.toBeEmpty();
    }

    expect(missing).toEqual([]);
  });
});
