import { DOCUMENT } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { KonturIntl } from '@adlersoft/kontur-ui';
import { type Translation, TranslocoService } from '@jsverse/transloco';
import { App } from '../app';
import { provideI18n } from './provide-i18n';

const DE: Translation = {
  kontur: {
    removeLabel: 'Entfernen',
    closeLabel: 'Schließen',
    actionLabel: 'Aktion',
  },
};
const RU: Translation = {
  kontur: {
    removeLabel: 'Удалить',
    closeLabel: 'Закрыть',
    actionLabel: 'Действие',
  },
};
const EN: Translation = {
  kontur: { removeLabel: 'Remove', closeLabel: 'Close', actionLabel: 'Action' },
};

/**
 * Starts the app's initializers and answers every translation request: with the file
 * when it is in `files`, otherwise with 404 — like a missing file on the server.
 */
async function startWith(files: Record<string, Translation>): Promise<void> {
  const http = TestBed.inject(HttpTestingController);
  const status = TestBed.inject(ApplicationInitStatus);
  let done = false;
  void status.donePromise.then(() => (done = true));

  for (let round = 0; round < 20 && !done; round++) {
    for (const request of http.match(() => true)) {
      const file = files[request.request.url];
      if (file) {
        request.flush(file);
      } else {
        request.flush('Not Found', { status: 404, statusText: 'Not Found' });
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(done).toBe(true);
}

describe('provideI18n (Transloco in SignFlow, ADR-0006)', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  function setUp(browserLangs: string[]): void {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(browserLangs);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideI18n(),
      ],
    });
  }

  beforeEach(() => {
    consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.inject(DOCUMENT).documentElement.lang = 'de';
  });

  it('starts in the browser language, loads its file and sets <html lang>', async () => {
    setUp(['ru-RU', 'de-DE']);
    await startWith({ 'i18n/ru.json': RU, 'i18n/de.json': DE });

    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('ru');
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('ru');
    expect(consoleError).not.toHaveBeenCalled();
  });

  // Task 8-3: the language switch saves the choice; it wins over the browser languages.
  it('starts in the saved language when there is one', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) =>
      key === 'signflow.lang' ? 'en' : null,
    );
    setUp(['ru-RU']);
    await startWith({ 'i18n/en.json': EN, 'i18n/de.json': DE });

    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');
  });

  // Owner, 2026-11-23: localStorage throws (private mode) → the app starts, browser language.
  it('localStorage throws → starts in the browser language, without an error', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    setUp(['ru-RU']);
    await startWith({ 'i18n/ru.json': RU, 'i18n/de.json': DE });

    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('ru');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('gives libs/ui its built-in strings from the app translations', async () => {
    setUp(['ru-RU']);
    await startWith({ 'i18n/ru.json': RU, 'i18n/de.json': DE });

    expect(TestBed.inject(KonturIntl).closeLabel()).toBe('Закрыть');
    expect(TestBed.inject(KonturIntl).actionLabel()).toBe('Действие');
  });

  it('follows a runtime language switch in <html lang> and in KonturIntl', async () => {
    setUp(['ru-RU']);
    await startWith({ 'i18n/ru.json': RU, 'i18n/de.json': DE });
    // Taken before the switch, like a component that shows the label.
    const intl = TestBed.inject(KonturIntl);
    expect(intl.closeLabel()).toBe('Закрыть');

    TestBed.inject(TranslocoService).setActiveLang('en');
    TestBed.tick();
    // English was not needed at start (only ru and, since the fix after task 4, de);
    // the switch fetches it now.
    TestBed.inject(HttpTestingController).expectOne('i18n/en.json').flush(EN);
    TestBed.tick();

    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('en');
    expect(intl.closeLabel()).toBe('Close');
  });

  it('gives libs/ui the locale of the active language, also after a switch', async () => {
    setUp(['ru-RU']);
    await startWith({ 'i18n/ru.json': RU, 'i18n/de.json': DE });
    const intl = TestBed.inject(KonturIntl);
    expect(intl.locale()).toBe('ru-RU');

    TestBed.inject(TranslocoService).setActiveLang('en');
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('i18n/en.json').flush(EN);
    TestBed.tick();

    expect(intl.locale()).toBe('en-GB');
  });

  it('reports a missing key as an error and shows the key itself', async () => {
    setUp(['de-DE']);
    await startWith({ 'i18n/de.json': DE });

    const text = TestBed.inject(TranslocoService).translate('no.such.key');

    expect(text).toBe('no.such.key');
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Missing translation for 'no.such.key'"),
    );
  });

  describe('when a translation file cannot be loaded (working beats pretty)', () => {
    it('404 for the start language: the app still renders, in German, with an error', async () => {
      setUp(['ru-RU']);
      await startWith({ 'i18n/de.json': DE });

      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();

      expect(
        fixture.nativeElement.querySelector('router-outlet'),
      ).not.toBeNull();
      expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('de');
      expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('de');
      expect(TestBed.inject(KonturIntl).closeLabel()).toBe('Schließen');
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('[i18n] Could not load "ru"'),
        expect.anything(),
      );
    });

    describe('start language not de: it and de.json are fetched at once, one deadline of 10 s', () => {
      afterEach(() => vi.useRealTimers());

      it('ru hangs, de arrives → at 10 000 ms the app starts in German, with the reason', async () => {
        vi.useFakeTimers();
        setUp(['ru-RU']);
        const http = TestBed.inject(HttpTestingController);
        const status = TestBed.inject(ApplicationInitStatus);

        expect(http.match('i18n/ru.json')).toHaveLength(1); // never answered
        http.expectOne('i18n/de.json').flush(DE);

        await vi.advanceTimersByTimeAsync(9_999);
        expect(status.done).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(status.done).toBe(true);

        expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('de');
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining('[i18n] Could not load "ru"'),
          expect.anything(),
        );
      });

      it('ru arrives, de hangs → the app starts in Russian at once, without waiting for de', async () => {
        vi.useFakeTimers();
        setUp(['ru-RU']);
        const http = TestBed.inject(HttpTestingController);
        const status = TestBed.inject(ApplicationInitStatus);

        expect(http.match('i18n/de.json')).toHaveLength(1); // never answered
        http.expectOne('i18n/ru.json').flush(RU);
        await vi.advanceTimersByTimeAsync(0);

        expect(status.done).toBe(true);
        expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('ru');
      });
    });

    it('404 for every file: the app still renders, with keys, and an error', async () => {
      setUp(['de-DE']);
      await startWith({});

      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();

      expect(
        fixture.nativeElement.querySelector('router-outlet'),
      ).not.toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('[i18n] Could not load "de"'),
        expect.anything(),
      );
    });
  });
});
