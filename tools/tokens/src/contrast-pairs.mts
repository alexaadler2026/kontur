import type { ContrastPair } from './contrast.mts';

/**
 * THE list of colour pairs that the UI really draws on top of each other.
 * Checked in both themes by contrast.spec.mts (task 007). Add a pair when a component
 * starts drawing a new combination; say where in `usedIn`.
 *
 * WCAG 2.1 AA:
 * - 1.4.3 Contrast (Minimum): text ≥ 4.5:1 (12–16 px text everywhere in Kontur).
 * - 1.4.11 Non-text Contrast: UI component boundaries and focus indicators ≥ 3:1.
 *
 * Not in the list, on purpose:
 * - Disabled states (text-disabled, disabled borders): 1.4.3 and 1.4.11 explicitly exempt
 *   inactive components.
 * - overlay-scrim (rgba): alpha — its contrast depends on the content underneath.
 */

const TEXT = { criterion: '1.4.3', minimum: 4.5 } as const;
const UI = { criterion: '1.4.11', minimum: 3 } as const;

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  // ---- 1.4.3 text ≥ 4.5:1 ----
  {
    ...TEXT,
    foreground: 'text-primary',
    background: 'bg-page',
    usedIn: 'page text',
  },
  {
    ...TEXT,
    foreground: 'text-primary',
    background: 'bg-surface',
    usedIn: 'text on cards, field values',
  },
  {
    ...TEXT,
    foreground: 'text-primary',
    background: 'bg-subtle',
    usedIn: 'table hover row, secondary button hover',
  },
  {
    ...TEXT,
    foreground: 'text-secondary',
    background: 'bg-page',
    usedIn: 'labels, hints, captions on the page',
  },
  {
    ...TEXT,
    foreground: 'text-secondary',
    background: 'bg-surface',
    usedIn: 'hints, placeholders in fields',
  },
  {
    ...TEXT,
    foreground: 'text-secondary',
    background: 'bg-subtle',
    usedIn: 'table header, pagination',
  },
  {
    ...TEXT,
    foreground: 'success',
    background: 'success-subtle',
    usedIn: 'Badge success',
  },
  {
    ...TEXT,
    foreground: 'warning',
    background: 'warning-subtle',
    usedIn: 'Badge warning',
  },
  {
    ...TEXT,
    foreground: 'error',
    background: 'error-subtle',
    usedIn: 'Badge error',
  },
  {
    ...TEXT,
    foreground: 'info',
    background: 'info-subtle',
    usedIn: 'Badge info',
  },
  {
    ...TEXT,
    foreground: 'text-on-brand',
    background: 'brand',
    usedIn: 'primary button',
  },
  {
    ...TEXT,
    foreground: 'text-on-brand',
    background: 'brand-hover',
    usedIn: 'primary button :hover',
  },
  {
    ...TEXT,
    foreground: 'text-on-brand',
    background: 'brand-active',
    usedIn: 'primary button :active',
  },
  {
    ...TEXT,
    foreground: 'text-on-brand',
    background: 'error',
    usedIn: 'danger button',
  },
  {
    ...TEXT,
    foreground: 'text-on-brand',
    background: 'error-hover',
    usedIn: 'danger button :hover',
  },
  {
    ...TEXT,
    foreground: 'text-on-brand',
    background: 'error-active',
    usedIn: 'danger button :active',
  },
  {
    ...TEXT,
    foreground: 'text-primary',
    background: 'error-subtle',
    usedIn: 'value in a field with an error',
  },
  {
    ...TEXT,
    foreground: 'text-secondary',
    background: 'error-subtle',
    usedIn: 'placeholder in a field with an error',
  },
  {
    ...TEXT,
    foreground: 'error',
    background: 'bg-surface',
    usedIn: 'error message (k-error-msg) on cards',
  },
  {
    ...TEXT,
    foreground: 'error',
    background: 'bg-page',
    usedIn: 'error message (k-error-msg) on the page',
  },
  {
    ...TEXT,
    foreground: 'brand',
    background: 'bg-page',
    usedIn: 'ghost button, k-link',
  },
  {
    ...TEXT,
    foreground: 'brand',
    background: 'brand-subtle',
    usedIn: 'ghost button :hover',
  },

  // ---- 1.4.11 non-text ≥ 3:1 ----
  {
    ...UI,
    foreground: 'error',
    background: 'bg-subtle',
    usedIn: 'Tag remove icon (.k-tag-x) :hover',
  },
  {
    ...UI,
    foreground: 'border-input',
    background: 'bg-surface',
    usedIn: 'field, checkbox and radio border',
  },
  {
    ...UI,
    foreground: 'border-input',
    background: 'bg-page',
    usedIn: 'field border directly on the page',
  },
  {
    ...UI,
    foreground: 'focus-ring',
    background: 'bg-page',
    usedIn: 'focus ring on the page',
  },
  {
    ...UI,
    foreground: 'focus-ring',
    background: 'bg-surface',
    usedIn: 'focus ring on cards',
  },
  {
    ...UI,
    foreground: 'switch-knob',
    background: 'brand',
    usedIn: 'Switch knob, on',
  },
  {
    ...UI,
    foreground: 'switch-knob',
    background: 'border-input',
    usedIn: 'Switch knob, off',
  },
  {
    ...UI,
    foreground: 'brand',
    background: 'bg-surface',
    usedIn: 'checked checkbox / radio fill',
  },
];
