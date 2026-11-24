import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  ElementRef,
  HostAttributeToken,
  inject,
  input,
  isDevMode,
  ViewEncapsulation,
} from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import { K_FORM_FIELD } from '../form-field/form-field-context';

export type NativeSelectSize = 'md' | 'sm' | 'touch';

/**
 * `<k-select-wrap>` — the frame of a native select, as in the mockup
 * (`<span class="k-field-wrap"><select class="k-select">…</select><svg class="k-ico">`).
 * It loads the styles and draws the chevron: decorative (aria-hidden), click-through
 * (pointer-events: none in .k-field-wrap .k-ico), colour from the tokens via currentColor.
 * The full combobox <k-select> (contract SelectProps) is UI-13, task 34.
 */
@Component({
  selector: 'k-select-wrap',
  imports: [LucideChevronDown],
  template: `<ng-content /><svg
      lucideChevronDown
      class="k-ico"
      aria-hidden="true"
    ></svg>`,
  styleUrls: ['../form-field/form-field.css', './native-select.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'k-field-wrap' },
})
export class SelectWrapComponent {}

/**
 * `select[k-select]` — Kontur classes on the native `<select>`. It stays native, so the
 * keyboard, screen readers and Angular forms work as the browser made them.
 * Inside k-form-field it takes the id and ARIA links, like k-input; outside it needs a
 * name of its own (aria-label / aria-labelledby).
 */
@Directive({
  selector: 'select[k-select]',
  host: {
    '[class]': 'hostClass()',
    '[attr.id]': 'id',
    '[attr.aria-describedby]': 'field?.describedBy() ?? null',
    '[attr.aria-invalid]': 'field?.invalid() ? "true" : null',
    '[attr.aria-required]': 'field?.required() ? "true" : null',
  },
})
export class NativeSelectDirective {
  readonly size = input<NativeSelectSize>('md');

  protected readonly field = inject(K_FORM_FIELD, { optional: true });

  readonly id: string | null =
    inject(new HostAttributeToken('id'), { optional: true }) ??
    this.field?.generatedId ??
    null;

  protected readonly hostClass = computed(() => {
    const classes = ['k-select'];
    if (this.size() === 'sm') classes.push('k-select--sm');
    if (this.size() === 'touch') classes.push('k-select--touch');
    if (this.field?.invalid()) classes.push('is-invalid');
    return classes.join(' ');
  });

  constructor() {
    if (!isDevMode()) return;
    // Without the wrapper there are no styles and no chevron.
    if (!inject(SelectWrapComponent, { optional: true })) {
      throw new Error(
        'select[k-select] must be placed inside <k-select-wrap>.',
      );
    }
    // The name is often a binding ([attr.aria-label]="t(…)"), so it is checked once
    // rendered, not from the static attributes.
    const element =
      inject<ElementRef<HTMLSelectElement>>(ElementRef).nativeElement;
    afterNextRender(() => {
      const named =
        this.field !== null ||
        element.hasAttribute('aria-label') ||
        element.hasAttribute('aria-labelledby');
      if (!named) {
        console.error(
          'select[k-select] needs a name: aria-label, aria-labelledby or a surrounding k-form-field.',
          element,
        );
      }
    });
  }
}
