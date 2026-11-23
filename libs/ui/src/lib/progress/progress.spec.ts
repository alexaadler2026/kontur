import { Injectable, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import {
  KonturIntl,
  KonturIntlDe,
  KonturIntlEn,
  KonturIntlRu,
  provideKonturIntl,
} from '../intl/kontur-intl';
import { ProgressComponent } from './progress';
import { ProgressRingComponent } from './progress-ring';
import { SpinnerComponent } from './spinner';

// Labels are the examples of docs/design/components/Progress.html, not product text.
// Owner, 2026-11-23 (Progress.md): every bar and ring has a name; the percent follows the
// UI language through Intl.

const NBSP = ' ';
// getByText collapses whitespace by default, NBSP included; the exact text matters here.
const exact = { normalizer: (text: string) => text };

describe('k-spinner', () => {
  it('is a status with the given name; 20 px by default', async () => {
    await render(`<k-spinner label="Lädt" />`, { imports: [SpinnerComponent] });

    const spinner = screen.getByRole('status', { name: 'Lädt' });
    expect(spinner.classList).toContain('k-spinner');
    expect(spinner.style.width).toBe('20px');
    expect(spinner.style.height).toBe('20px');
  });

  it('size in px', async () => {
    await render(`<k-spinner label="Lädt" [size]="32" />`, {
      imports: [SpinnerComponent],
    });

    expect(screen.getByRole('status').style.width).toBe('32px');
  });
});

describe('k-progress', () => {
  it('a progressbar named by its visible label, with value, range and the percent', async () => {
    await render(`<k-progress label="Text erkennen" [value]="68" />`, {
      imports: [ProgressComponent],
    });

    const bar = screen.getByRole('progressbar', { name: 'Text erkennen' });
    expect(bar.classList).toContain('k-progress');
    expect(bar.getAttribute('aria-valuenow')).toBe('68');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-valuetext')).toBe(`68${NBSP}%`);
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('68%');
    // The visible percent is the same text; hidden from screen readers (the bar says it).
    const percent = screen.getByText(`68${NBSP}%`, exact);
    expect(percent.getAttribute('aria-hidden')).toBe('true');
    expect(percent.classList).toContain('k-num');
  });

  it.each([
    [KonturIntlDe, `68${NBSP}%`],
    [KonturIntlEn, '68%'],
    [KonturIntlRu, `68${NBSP}%`],
  ])('the percent follows the UI language: %o → %s', async (intl, text) => {
    await render(`<k-progress label="Text erkennen" [value]="68" />`, {
      imports: [ProgressComponent],
      providers: [provideKonturIntl(intl)],
    });

    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe(
      text,
    );
    expect(screen.getByText(text, exact)).toBeTruthy();
  });

  it('a fraction is shown rounded: 33.4 → 33 %', async () => {
    await render(`<k-progress label="Hochladen" [value]="33.4" />`, {
      imports: [ProgressComponent],
    });

    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe(
      `33${NBSP}%`,
    );
  });

  it.each([
    [-5, '0'],
    [140, '100'],
  ])('the value stays within 0–100: %d → %s', async (value, now) => {
    await render(`<k-progress label="Hochladen" [value]="value" />`, {
      imports: [ProgressComponent],
      componentProperties: { value },
    });

    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe(now);
    expect((bar.firstElementChild as HTMLElement).style.width).toBe(`${now}%`);
  });

  it('value null → indeterminate: no aria-valuenow, no percent, the sweep class', async () => {
    await render(`<k-progress label="Wird vorbereitet" [value]="null" />`, {
      imports: [ProgressComponent],
    });

    const bar = screen.getByRole('progressbar', { name: 'Wird vorbereitet' });
    expect(bar.classList).toContain('is-indeterminate');
    expect(bar.hasAttribute('aria-valuenow')).toBe(false);
    expect(bar.hasAttribute('aria-valuetext')).toBe(false);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it.each([
    ['success', 'k-progress--success'],
    ['error', 'k-progress--error'],
  ])('tone %s → %s', async (tone, cls) => {
    await render(`<k-progress label="x" [value]="50" [tone]="tone" />`, {
      imports: [ProgressComponent],
      componentProperties: { tone },
    });

    expect(screen.getByRole('progressbar').classList).toContain(cls);
  });

  it('two bars on a page have different label ids', async () => {
    await render(
      `<k-progress label="Eins" [value]="1" /><k-progress label="Zwei" [value]="2" />`,
      { imports: [ProgressComponent] },
    );

    expect(screen.getByRole('progressbar', { name: 'Eins' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Zwei' })).toBeTruthy();
  });

  it('follows a language switch at run time', async () => {
    @Injectable()
    class SwitchableIntl extends KonturIntl {
      readonly removeLabel = signal('Entfernen').asReadonly();
      readonly closeLabel = signal('Schließen').asReadonly();
      readonly actionLabel = signal('Aktion').asReadonly();
      readonly current = signal('de-DE');
      readonly locale = this.current.asReadonly();
    }
    const { fixture } = await render(
      `<k-progress label="Text erkennen" [value]="68" />`,
      {
        imports: [ProgressComponent],
        providers: [provideKonturIntl(SwitchableIntl)],
      },
    );

    (TestBed.inject(KonturIntl) as SwitchableIntl).current.set('en-GB');
    fixture.detectChanges();

    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe(
      '68%',
    );
  });
});

describe('k-progress-ring', () => {
  it('a named progressbar; the SVG of the mockup (r 20, track and bar) is decoration', async () => {
    const { container } = await render(
      `<k-progress-ring label="Text erkennen" [value]="68" />`,
      { imports: [ProgressRingComponent] },
    );

    const ring = screen.getByRole('progressbar', { name: 'Text erkennen' });
    expect(ring.getAttribute('aria-valuenow')).toBe('68');
    expect(ring.getAttribute('aria-valuetext')).toBe(`68${NBSP}%`);
    const svg = container.querySelector('svg.k-ring') as SVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('48');
    const bar = svg.querySelector('.k-ring-bar') as SVGCircleElement;
    // 2πr = 125.66; 32 % of it left open.
    expect(Number(bar.getAttribute('stroke-dasharray'))).toBeCloseTo(125.66, 1);
    expect(Number(bar.getAttribute('stroke-dashoffset'))).toBeCloseTo(40.21, 1);
    expect(svg.querySelector('.k-ring-track')).not.toBeNull();
  });

  it('showValue: the percent in the centre (hidden from screen readers, the ring says it)', async () => {
    await render(
      `<k-progress-ring label="Text erkennen" [value]="68" showValue [size]="64" />`,
      { imports: [ProgressRingComponent] },
    );

    const value = screen.getByText(`68${NBSP}%`, exact);
    expect(value.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('svg.k-ring')?.getAttribute('width')).toBe(
      '64',
    );
  });

  it('without showValue there is no visible percent', async () => {
    await render(`<k-progress-ring label="Text erkennen" [value]="68" />`, {
      imports: [ProgressRingComponent],
    });

    expect(screen.queryByText(/%/)).toBeNull();
  });
});
