import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

/**
 * Kontur Badge — `<k-badge tone="success">Signiert</k-badge>` (contract: BadgeProps).
 * The status is readable without colour (WCAG 1.4.1): the text is always there, and the
 * CSS dot (::before) has a different shape per tone — circle, diamond, square, ring.
 * The dot is decoration only, so there is nothing to hide from screen readers.
 * neutral = no modifier in the reference (like Button md).
 */
@Component({
  selector: 'k-badge',
  template: '<ng-content />',
  styleUrl: './badge-tag-avatar.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClass()' },
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');

  protected readonly hostClass = computed(() =>
    this.tone() === 'neutral' ? 'k-badge' : `k-badge k-badge--${this.tone()}`,
  );
}
