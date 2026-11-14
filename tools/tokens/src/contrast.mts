import type { KonturTokens } from './generate-tokens.mts';

/** One pair of colour tokens that is drawn on top of each other somewhere in the UI. */
export interface ContrastPair {
  foreground: string; // token name, e.g. "text-secondary"
  background: string; // token name, e.g. "bg-surface"
  /** "1.4.3" text (4.5:1) or "1.4.11" non-text UI components and focus indicators (3:1). */
  criterion: '1.4.3' | '1.4.11';
  minimum: 4.5 | 3;
  /** Where the pair is drawn (component / state), so a failure points at real UI. */
  usedIn: string;
}

export interface ContrastFailure {
  pair: ContrastPair;
  theme: string;
  ratio: number;
}

/**
 * Hex value of a colour token in a theme. Follows "{other}" aliases (switch-knob → {text-on-brand}).
 * Throws for unknown names and for non-hex values: rgba(…) has alpha, and its contrast depends
 * on what lies underneath — it cannot be judged from tokens alone.
 */
export function resolveColor(
  tokens: KonturTokens,
  name: string,
  theme: string,
): string {
  const token = tokens.color.tokens.find((t) => t.name === name);
  const value = token?.value[theme];
  if (value === undefined)
    throw new Error(`Unknown colour token "${name}" in theme "${theme}"`);
  if (value.startsWith('{'))
    return resolveColor(tokens, value.slice(1, -1), theme);
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`Token "${name}" (${theme}) is not a hex colour: ${value}`);
  }
  return value;
}

/** WCAG 2.1 relative luminance of an sRGB hex colour (0 = black, 1 = white). */
function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    // undo the sRGB gamma curve: from stored value to linear light
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio, 1 (none) … 21 (black on white). Order of the colours does not matter. */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Every pair × theme below its minimum. Empty array = the palette passes.
 * No rounding before the comparison: WCAG thresholds are exact (4.499:1 fails 4.5:1).
 */
export function findContrastFailures(
  tokens: KonturTokens,
  pairs: readonly ContrastPair[],
): ContrastFailure[] {
  return tokens.color.themes.flatMap(({ id: theme }) =>
    pairs
      .map((pair) => ({
        pair,
        theme,
        ratio: contrastRatio(
          resolveColor(tokens, pair.foreground, theme),
          resolveColor(tokens, pair.background, theme),
        ),
      }))
      .filter((result) => result.ratio < result.pair.minimum),
  );
}
