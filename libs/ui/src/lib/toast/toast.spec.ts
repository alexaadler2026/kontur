import { TestBed } from '@angular/core/testing';
import { fireEvent } from '@testing-library/angular';
import { provideKonturIntl, KonturIntlEn } from '../intl/kontur-intl';
import { provideKonturToast } from './provide-toast';
import { KonturToast } from './toast.service';

// Texts are the examples of docs/design/components/Toast.html, not product text.
// Owner, 2026-11-23 (Toast.md): the role belongs to two hidden live regions created at
// start; the visible toast has none. Announced text = title + message + "Aktion: …".

/** Time the region waits between clearing and writing (a repeat must be a DOM change). */
const ANNOUNCE_DELAY_MS = 100;

let toast: KonturToast;

function setUp(providers: unknown[] = []): void {
  TestBed.configureTestingModule({
    providers: [provideKonturToast(), ...(providers as never[])],
  });
  toast = TestBed.inject(KonturToast);
  TestBed.tick();
}

function wait(ms: number): void {
  vi.advanceTimersByTime(ms);
  TestBed.tick();
}

const region = () => document.querySelector('k-toast-region') as HTMLElement;
const statusRegion = () =>
  region().querySelector('[role="status"]') as HTMLElement;
const alertRegion = () =>
  region().querySelector('[role="alert"]') as HTMLElement;
const toasts = () =>
  Array.from(region().querySelectorAll<HTMLElement>('.k-toast'));
const button = (el: HTMLElement, name: string) =>
  Array.from(el.querySelectorAll('button')).find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name,
  ) as HTMLButtonElement;

/** Elements a test puts into <body>; removed even when the test fails (no leak into other files). */
const created: HTMLElement[] = [];
function outsideButton(): HTMLButtonElement {
  const el = document.createElement('button');
  el.textContent = 'Außerhalb';
  created.push(el);
  return el;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  created.splice(0).forEach((el) => el.remove());
});

describe('provideKonturToast: the live regions exist before the first message', () => {
  it('one region in <body> with an empty status and an empty alert region, no toasts', () => {
    setUp();

    expect(document.querySelectorAll('k-toast-region')).toHaveLength(1);
    expect(region().parentElement).toBe(document.body);
    expect(statusRegion().textContent).toBe('');
    expect(alertRegion().textContent).toBe('');
    expect(toasts()).toHaveLength(0);
  });
});

describe('announcement', () => {
  it.each([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'alert'],
    ['error', 'alert'],
  ] as const)('tone %s → the %s region', (tone, role) => {
    setUp();

    toast.show('Erinnerung an Anna Berger wurde gesendet.', { tone });
    wait(ANNOUNCE_DELAY_MS);

    const [target, other] =
      role === 'status'
        ? [statusRegion(), alertRegion()]
        : [alertRegion(), statusRegion()];
    expect(target.textContent).toBe(
      'Erinnerung an Anna Berger wurde gesendet.',
    );
    expect(other.textContent).toBe('');
  });

  it('title + message + "Aktion: <label>" (KonturIntl.actionLabel)', () => {
    setUp();

    toast.show('Datei überschreitet 25 MB.', {
      tone: 'error',
      title: 'Upload fehlgeschlagen',
      action: { label: 'Wiederholen', run: () => undefined },
    });
    wait(ANNOUNCE_DELAY_MS);

    expect(alertRegion().textContent).toBe(
      'Upload fehlgeschlagen. Datei überschreitet 25 MB. Aktion: Wiederholen',
    );
  });

  it('a title that already ends with a full stop gets no second one', () => {
    setUp();

    toast.show('„AVV Stadtwerke" ist abgeschlossen.', {
      tone: 'success',
      title: 'Signiert.',
    });
    wait(ANNOUNCE_DELAY_MS);

    expect(statusRegion().textContent).toBe(
      'Signiert. „AVV Stadtwerke" ist abgeschlossen.',
    );
  });

  it('the action word follows the UI language', () => {
    setUp([provideKonturIntl(KonturIntlEn)]);

    toast.show('Upload failed.', {
      tone: 'error',
      action: { label: 'Retry', run: () => undefined },
    });
    wait(ANNOUNCE_DELAY_MS);

    expect(alertRegion().textContent).toBe('Upload failed. Action: Retry');
  });

  it('the same message again is announced again: the region is cleared, then written', () => {
    setUp();
    toast.show('Offline.', { tone: 'warning' });
    wait(ANNOUNCE_DELAY_MS);
    expect(alertRegion().textContent).toBe('Offline.');

    toast.show('Offline.', { tone: 'warning' });
    TestBed.tick();
    expect(alertRegion().textContent).toBe('');
    wait(ANNOUNCE_DELAY_MS);
    expect(alertRegion().textContent).toBe('Offline.');
  });

  it('two messages at once: neither is lost', () => {
    setUp();

    toast.show('Eins.');
    toast.show('Zwei.');
    wait(ANNOUNCE_DELAY_MS);

    expect(statusRegion().textContent).toBe('Eins. Zwei.');
  });

  it('a queued toast (4th) is announced when it appears, not before', () => {
    setUp();
    for (const n of [1, 2, 3]) toast.show(`Fehler ${n}.`, { tone: 'error' });
    wait(ANNOUNCE_DELAY_MS);

    toast.show('Vierter.', { tone: 'error' });
    wait(ANNOUNCE_DELAY_MS);
    expect(alertRegion().textContent).not.toContain('Vierter.');

    button(toasts()[0], 'Schließen').click();
    wait(ANNOUNCE_DELAY_MS);
    expect(alertRegion().textContent).toBe('Vierter.');
  });
});

describe('the visible toast', () => {
  it('has no role (the region speaks), message and bold title, a close button', () => {
    setUp();

    toast.show('ist abgeschlossen.', { tone: 'success', title: 'Signiert.' });
    TestBed.tick();

    const [el] = toasts();
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.querySelector('b')?.textContent).toBe('Signiert.');
    expect(el.textContent).toContain('ist abgeschlossen.');
    expect(button(el, 'Schließen')).toBeTruthy();
  });

  it.each([
    ['info', 'lucide-info', null],
    ['success', 'lucide-circle-check', 'k-toast--success'],
    ['warning', 'lucide-triangle-alert', 'k-toast--warning'],
    ['error', 'lucide-circle-alert', 'k-toast--error'],
  ] as const)(
    'tone %s: icon %s (as in Alert), class %s',
    (tone, iconClass, toneClass) => {
      setUp();

      toast.show('Text.', { tone });
      TestBed.tick();

      const [el] = toasts();
      const icon = el.querySelector(':scope > svg');
      expect(icon).toHaveClass('k-ico', iconClass);
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      if (toneClass) expect(el).toHaveClass(toneClass);
      else expect(el.className).not.toMatch(/k-toast--/);
    },
  );

  it('the close button closes it; info is the default tone', () => {
    setUp();
    toast.show('Text.');
    TestBed.tick();

    button(toasts()[0], 'Schließen').click();
    TestBed.tick();

    expect(toasts()).toHaveLength(0);
  });

  it('the action runs and then the toast closes', () => {
    setUp();
    const run = vi.fn();
    toast.show('Datei überschreitet 25 MB.', {
      tone: 'error',
      action: { label: 'Wiederholen', run },
    });
    TestBed.tick();

    button(toasts()[0], 'Wiederholen').click();
    TestBed.tick();

    expect(run).toHaveBeenCalledTimes(1);
    expect(toasts()).toHaveLength(0);
  });
});

describe('time', () => {
  it('info and success leave after 5000 ms, not earlier', () => {
    setUp();
    toast.show('Info.');
    toast.show('Erfolg.', { tone: 'success' });

    wait(4999);
    expect(toasts()).toHaveLength(2);
    wait(1);
    expect(toasts()).toHaveLength(0);
  });

  it('durationMs sets the time', () => {
    setUp();
    toast.show('Kurz.', { durationMs: 2000 });

    wait(1999);
    expect(toasts()).toHaveLength(1);
    wait(1);
    expect(toasts()).toHaveLength(0);
  });

  it('warning, error and any toast with an action stay until closed', () => {
    setUp();
    toast.show('Warnung.', { tone: 'warning', durationMs: 1000 });
    toast.show('Fehler.', { tone: 'error' });
    toast.show('Signiert.', {
      tone: 'success',
      action: { label: 'Öffnen', run: () => undefined },
    });

    wait(60_000);

    expect(toasts()).toHaveLength(3);
  });

  it('the mouse over the toast pauses its timer; the rest of the time is kept', () => {
    setUp();
    toast.show('Info.');
    wait(3000);

    fireEvent.mouseEnter(toasts()[0]);
    wait(10_000);
    expect(toasts()).toHaveLength(1);

    fireEvent.mouseLeave(toasts()[0]);
    wait(1999);
    expect(toasts()).toHaveLength(1);
    wait(1);
    expect(toasts()).toHaveLength(0);
  });

  it('the focus inside the toast pauses its timer', () => {
    setUp();
    toast.show('Info.');
    wait(3000);

    button(toasts()[0], 'Schließen').focus();
    wait(10_000);
    expect(toasts()).toHaveLength(1);

    (document.activeElement as HTMLElement).blur();
    wait(2000);
    expect(toasts()).toHaveLength(0);
  });

  it('max 3 visible; the 4th waits, and its timer starts only when it appears', () => {
    setUp();
    for (const n of [1, 2, 3]) toast.show(`Fehler ${n}.`, { tone: 'error' });
    toast.show('Info.');
    TestBed.tick();
    expect(toasts()).toHaveLength(3);

    wait(10_000);
    button(toasts()[0], 'Schließen').click();
    TestBed.tick();
    expect(toasts().map((t) => t.textContent?.trim())).toEqual([
      'Fehler 2.',
      'Fehler 3.',
      'Info.',
    ]);

    wait(4999);
    expect(toasts()).toHaveLength(3);
    wait(1);
    expect(toasts()).toHaveLength(2);
  });
});

describe('focus (Toast.md 8)', () => {
  it('never takes the focus itself', () => {
    setUp();
    const outside = document.body.appendChild(outsideButton());
    outside.focus();

    toast.show('Fehler.', { tone: 'error' });
    TestBed.tick();

    expect(document.activeElement).toBe(outside);
  });

  it('closing the toast you tabbed into returns the focus to where it was before', () => {
    setUp();
    const outside = document.body.insertBefore(outsideButton(), region());
    toast.show('Fehler.', { tone: 'error' });
    TestBed.tick();
    outside.focus();

    const close = button(toasts()[0], 'Schließen');
    close.focus();
    close.click();
    TestBed.tick();

    expect(toasts()).toHaveLength(0);
    expect(document.activeElement).toBe(outside);
  });
});

describe('without provideKonturToast()', () => {
  it('show() reports the missing provider in the console and does not throw', () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const service = TestBed.inject(KonturToast);

    expect(() => service.show('Text.')).not.toThrow();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('provideKonturToast()'),
    );
    error.mockRestore();
  });
});
