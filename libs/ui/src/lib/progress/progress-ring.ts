import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { KonturIntl } from '../intl/kontur-intl';
import { clampPercent, formatPercent } from './percent';

/**
 * Kontur ProgressRing — `<k-progress-ring label="Text erkennen" [value]="68" showValue />`
 * (contract: ProgressRingProps). The SVG of the mockup: 48 px, r 20, stroke 3, the bar
 * drawn with stroke-dasharray / stroke-dashoffset.
 *
 * - The host is role="progressbar" with aria-label (the mockup had no name, Progress.md);
 *   the SVG is decoration (aria-hidden).
 * - showValue: the percent in the centre, aria-hidden (the ring already says it).
 */
@Component({
  selector: 'k-progress-ring',
  template: `
    <svg
      class="k-ring"
      aria-hidden="true"
      [attr.width]="size()"
      [attr.height]="size()"
      [attr.viewBox]="'0 0 ' + size() + ' ' + size()"
    >
      <circle
        class="k-ring-track"
        [attr.cx]="centre()"
        [attr.cy]="centre()"
        [attr.r]="radius()"
      />
      <circle
        class="k-ring-bar"
        [attr.cx]="centre()"
        [attr.cy]="centre()"
        [attr.r]="radius()"
        [attr.stroke-dasharray]="circumference()"
        [attr.stroke-dashoffset]="offset()"
      />
    </svg>
    @if (showValue()) {
      <span class="k-ring-value k-caption k-num" aria-hidden="true">{{
        text()
      }}</span>
    }
  `,
  styleUrl: './progress.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuenow]': 'percent()',
    '[attr.aria-valuetext]': 'text()',
  },
})
export class ProgressRingComponent {
  /** 0–100. */
  readonly value = input.required<number>();
  readonly label = input.required<string>();
  /** px; 48 in the mockup. */
  readonly size = input(48);
  readonly showValue = input(false, { transform: booleanAttribute });

  private readonly intl = inject(KonturIntl);

  protected readonly percent = computed(() => clampPercent(this.value()));
  protected readonly text = computed(() =>
    formatPercent(this.percent(), this.intl.locale()),
  );
  protected readonly centre = computed(() => this.size() / 2);
  /** 48 px → r 20 as in the mockup: half the size minus the stroke (3) and 1 px air. */
  protected readonly radius = computed(() => this.size() / 2 - 4);
  protected readonly circumference = computed(
    () => 2 * Math.PI * this.radius(),
  );
  /** The part of the circle left open: 68 % → 32 % of the circumference. */
  protected readonly offset = computed(
    () => this.circumference() * (1 - this.percent() / 100),
  );
}
