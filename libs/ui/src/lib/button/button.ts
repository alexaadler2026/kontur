import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostAttributeToken,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm' | 'touch';

/**
 * Kontur Button — `<button k-button>` or `<a k-button>` (contract: ButtonProps).
 * An attribute selector on the native element keeps native semantics (role, keyboard, form).
 * Classes match docs/design/components.css 1:1; size md = no modifier (ADR-0003).
 */
@Component({
  selector: 'button[k-button], a[k-button]',
  template: '<ng-content />',
  styleUrl: './button.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()',
    '[attr.type]': 'type',
    '[attr.disabled]': 'disabled() && !isLink ? "" : null',
    '[attr.aria-disabled]': 'blocked() ? "true" : null',
    '[attr.aria-busy]': 'loading() ? "true" : null',
    '[attr.tabindex]': 'disabled() && isLink ? "-1" : null',
  },
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  /** Hides the label, shows a spinner, sets aria-busy and blocks clicks — but keeps the focus. */
  readonly loading = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  protected readonly isLink = this.host.tagName === 'A';

  /**
   * `<button>` without `type` would be `submit` and send a surrounding form, so the default
   * is `button`. An explicit static `type="submit"` is kept. Links get no `type`.
   */
  protected readonly type = this.isLink
    ? null
    : (inject(new HostAttributeToken('type'), { optional: true }) ?? 'button');

  /** States in which a click must not reach the consumer's (click) handlers. */
  protected readonly blocked = computed(
    () => this.loading() || (this.isLink && this.disabled()),
  );

  protected readonly hostClass = computed(() => {
    const classes = ['k-btn', `k-btn--${this.variant()}`];
    if (this.size() !== 'md') classes.push(`k-btn--${this.size()}`);
    if (this.loading()) classes.push('is-loading');
    // :disabled does not exist on <a>; the reference styles .is-disabled for that case
    if (this.isLink && this.disabled()) classes.push('is-disabled');
    return classes.join(' ');
  });

  constructor() {
    // Capture phase on the element itself runs before the consumer's (click) listeners,
    // so stopImmediatePropagation() reliably swallows the click. This covers mouse, Enter
    // and Space (the browser turns both keys into a click on a <button>).
    const swallowClick = (event: Event): void => {
      if (!this.blocked()) return;
      event.preventDefault(); // no form submit, no link navigation
      event.stopImmediatePropagation();
    };
    this.host.addEventListener('click', swallowClick, { capture: true });
    inject(DestroyRef).onDestroy(() =>
      this.host.removeEventListener('click', swallowClick, { capture: true }),
    );
  }
}
