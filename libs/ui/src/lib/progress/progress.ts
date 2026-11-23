import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { KonturIntl } from '../intl/kontur-intl';
import { clampPercent, formatPercent } from './percent';

export type ProgressTone = 'brand' | 'success' | 'error';

let nextId = 0;

/**
 * Kontur Progress — `<k-progress label="Text erkennen" [value]="68" />` (contract:
 * ProgressProps). The visible label row (label left, percent right) above a 6 px bar.
 *
 * - The bar is role="progressbar", named by the visible label (aria-labelledby). The
 *   mockup had no name — an accessibility error, fixed by the owner (Progress.md).
 * - The percent is formatted per UI language (KonturIntl.locale) and given to screen
 *   readers as aria-valuetext; the visible copy is aria-hidden, so it is not read twice.
 * - value null = indeterminate: a sweeping bar, no aria-valuenow, no percent.
 */
@Component({
  selector: 'k-progress',
  template: `
    <div class="k-progress-head">
      <span class="k-caption k-progress-label" [id]="labelId">{{
        label()
      }}</span>
      @if (text(); as text) {
        <span class="k-caption k-num" aria-hidden="true">{{ text }}</span>
      }
    </div>
    <div
      class="k-progress"
      role="progressbar"
      [class.k-progress--success]="tone() === 'success'"
      [class.k-progress--error]="tone() === 'error'"
      [class.is-indeterminate]="percent() === null"
      [attr.aria-labelledby]="labelId"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="percent()"
      [attr.aria-valuetext]="text()"
    >
      <span [style.width.%]="percent()"></span>
    </div>
  `,
  styleUrl: './progress.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.k-progress-item--error]': 'tone() === "error"' },
})
export class ProgressComponent {
  /** 0–100; null = indeterminate. */
  readonly value = input.required<number | null>();
  readonly label = input.required<string>();
  readonly tone = input<ProgressTone>('brand');

  private readonly intl = inject(KonturIntl);
  protected readonly labelId = `k-progress-label-${nextId++}`;

  protected readonly percent = computed(() => {
    const value = this.value();
    return value === null ? null : clampPercent(value);
  });
  protected readonly text = computed(() => {
    const percent = this.percent();
    return percent === null ? null : formatPercent(percent, this.intl.locale());
  });
}
