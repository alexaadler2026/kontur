import {
  ChangeDetectionStrategy,
  Component,
  HostAttributeToken,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';

export type IconButtonSize = 'md' | 'sm';

/**
 * Kontur IconButton — `<button k-icon-button ariaLabel="…">` (contract: IconButtonProps).
 * Icon-only buttons have no visible text, so the accessible name is required.
 */
@Component({
  selector: 'button[k-icon-button]',
  template: '<ng-content />',
  styleUrl: './button.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'k-icon-btn',
    '[class.k-icon-btn--sm]': 'size() === "sm"',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.type]': 'type',
  },
})
export class IconButtonComponent {
  /** REQUIRED accessible name — the template does not compile without it. */
  readonly ariaLabel = input.required<string>();
  readonly size = input<IconButtonSize>('md');

  /** Same rule as k-button: no implicit form submit; an explicit static type is kept. */
  protected readonly type =
    inject(new HostAttributeToken('type'), { optional: true }) ?? 'button';
}
