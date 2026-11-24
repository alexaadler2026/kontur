import { ApplicationRef, Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideTransloco,
  type Translation,
  type TranslocoLoader,
  TranslocoService,
} from '@jsverse/transloco';
import { of } from 'rxjs';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { LanguageSwitch } from './language-switch';
import { LANGUAGE_KEY } from './saved-language';

// Task 8-3 (Anmelden.md): the visitor has no account yet, so the language is chosen on the
// sign-in screen. A native select (k-select), named "Sprache"; the choice is saved.

const FILES: Record<string, Translation> = {
  de: { app: { language: 'Sprache' } },
  en: { app: { language: 'Language' } },
  ru: { app: { language: 'Язык' } },
};

/** Answers at once: fetching the files over HTTP is provideI18n's job (own tests). */
@Injectable()
class InlineLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of(FILES[lang]);
  }
}

async function setUp(): Promise<TranslocoService> {
  const view = await render(LanguageSwitch, {
    providers: [
      provideTransloco({
        config: {
          availableLangs: ['de', 'en', 'ru'],
          defaultLang: 'de',
          reRenderOnLangChange: true, // as in provideI18n
        },
        loader: InlineLoader,
      }),
    ],
  });
  await view.fixture.whenStable();
  return TestBed.inject(TranslocoService);
}

describe('LanguageSwitch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('a select named by app.language, one option per language, in its own language', async () => {
    await setUp();

    const select = screen.getByRole('combobox', { name: 'Sprache' });
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Deutsch',
      'English (en-GB)',
      'Русский',
    ]);
    // WCAG 3.1.2: a screen reader reads each name with its own language's voice.
    expect(options.map((option) => option.getAttribute('lang'))).toEqual([
      'de',
      'en',
      'ru',
    ]);
    expect(select).toHaveValue('de');
  });

  it('choosing switches the language at once and saves the choice', async () => {
    const transloco = await setUp();

    await userEvent.selectOptions(screen.getByRole('combobox'), 'ru');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(transloco.getActiveLang()).toBe('ru');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('ru');
    expect(screen.getByRole('combobox', { name: 'Язык' })).toHaveValue('ru');
  });

  // Owner, 2026-11-23: localStorage throws → the switch still works (only not remembered).
  it('localStorage throws → the language still switches', async () => {
    const transloco = await setUp();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    await userEvent.selectOptions(screen.getByRole('combobox'), 'en');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(transloco.getActiveLang()).toBe('en');
  });
});
