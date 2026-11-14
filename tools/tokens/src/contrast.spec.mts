import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTRAST_PAIRS } from './contrast-pairs.mts';
import {
  contrastRatio,
  findContrastFailures,
  resolveColor,
} from './contrast.mts';
import type { KonturTokens } from './generate-tokens.mts';

const tokens = JSON.parse(
  readFileSync(
    new URL('../../../docs/design/tokens.json', import.meta.url),
    'utf8',
  ),
) as KonturTokens;
const themes = tokens.color.themes.map((theme) => theme.id);

describe('contrastRatio — WCAG 2.1 formula', () => {
  it('black on white is 21:1, a colour on itself is 1:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5); // order does not matter
    expect(contrastRatio('#0e5a6b', '#0e5a6b')).toBe(1);
  });

  it('#767676 on white is 4.54:1 — the classic grey just above the 4.5 threshold', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});

describe('resolveColor', () => {
  it('follows {aliases} to the hex value of the theme', () => {
    // switch-knob → {text-on-brand} → #ffffff (light) / #12161c (dark), tokens.json v3
    expect(resolveColor(tokens, 'switch-knob', 'light')).toBe('#ffffff');
    expect(resolveColor(tokens, 'switch-knob', 'dark')).toBe('#12161c');
  });

  it('refuses unknown tokens and non-hex values (alpha cannot be judged without a backdrop)', () => {
    expect(() => resolveColor(tokens, 'no-such-token', 'light')).toThrow(
      'Unknown colour token',
    );
    expect(() => resolveColor(tokens, 'overlay-scrim', 'light')).toThrow(
      'not a hex colour',
    );
  });
});

describe('token contrast pairs (docs/design/tokens.json)', () => {
  it('the list is not empty and every token exists in both themes (a typo must fail, not skip)', () => {
    expect(CONTRAST_PAIRS.length).toBeGreaterThan(0);
    for (const pair of CONTRAST_PAIRS) {
      for (const theme of themes) {
        expect(() =>
          resolveColor(tokens, pair.foreground, theme),
        ).not.toThrow();
        expect(() =>
          resolveColor(tokens, pair.background, theme),
        ).not.toThrow();
      }
    }
  });

  for (const theme of themes) {
    for (const pair of CONTRAST_PAIRS) {
      it(`${pair.foreground} on ${pair.background} (${theme}, WCAG ${pair.criterion}) ≥ ${pair.minimum}:1 — ${pair.usedIn}`, () => {
        const ratio = contrastRatio(
          resolveColor(tokens, pair.foreground, theme),
          resolveColor(tokens, pair.background, theme),
        );
        // exact comparison (no rounding, as WCAG requires); the message shows the ratio
        expect(
          ratio,
          `${ratio.toFixed(2)} ≥ ${pair.minimum}`,
        ).toBeGreaterThanOrEqual(pair.minimum);
      });
    }
  }

  it('detects a broken palette (built-in mutation check)', () => {
    const broken = structuredClone(tokens);
    const secondary = broken.color.tokens.find(
      (token) => token.name === 'text-secondary',
    );
    if (!secondary) throw new Error('text-secondary missing in tokens.json');
    secondary.value['light'] = '#c0c0c0'; // light grey on white ≈ 1.8:1

    const failures = findContrastFailures(broken, CONTRAST_PAIRS);

    expect(
      failures.map(
        (f) => `${f.pair.foreground} on ${f.pair.background} (${f.theme})`,
      ),
    ).toEqual(expect.arrayContaining(['text-secondary on bg-surface (light)']));
    expect(failures.every((f) => f.theme === 'light')).toBe(true);
    expect(findContrastFailures(tokens, CONTRAST_PAIRS)).toEqual([]);
  });
});
