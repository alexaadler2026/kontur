/** Keeps a progress value within 0–100 (the bar never overflows or goes negative). */
export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * The percent in the UI language (owner, 2026-11-23, Progress.md):
 * Intl.NumberFormat(locale, { style: 'percent' }) — de "68 %", en "68%", ru "68 %".
 * Intl takes a fraction (0.68), and rounds to whole percent by default.
 */
export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent' }).format(
    value / 100,
  );
}
