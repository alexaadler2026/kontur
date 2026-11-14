import {
  booleanAttribute,
  computed,
  Directive,
  HostAttributeToken,
  inject,
  input,
  isDevMode,
} from '@angular/core';
import { K_FORM_FIELD } from './form-field-context';

export type InputSize = 'md' | 'touch';

/**
 * Kontur Input — directive on the native `<input k-input>` / `<textarea k-input>`
 * (contract: InputProps). The element stays native, so Angular forms use their standard
 * DefaultValueAccessor (formControlName, [formControl], ngModel) — no own ControlValueAccessor.
 * Id and ARIA links come from the surrounding k-form-field.
 */
@Directive({
  selector: 'input[k-input], textarea[k-input]',
  host: {
    '[class]': 'hostClass()',
    '[attr.id]': 'id',
    '[attr.aria-describedby]': 'field?.describedBy() ?? null',
    '[attr.aria-invalid]': 'field?.invalid() ? "true" : null',
    '[attr.aria-required]': 'field?.required() ? "true" : null',
  },
})
export class InputDirective {
  /** IBAN, amounts, numbers: IBM Plex Mono + tabular figures (class k-num). */
  readonly numeric = input(false, { transform: booleanAttribute });
  readonly size = input<InputSize>('md');

  protected readonly field = inject(K_FORM_FIELD, { optional: true });

  /** An explicit static id is kept; otherwise the field's generated id is used. */
  readonly id: string | null =
    inject(new HostAttributeToken('id'), { optional: true }) ??
    this.field?.generatedId ??
    null;

  protected readonly hostClass = computed(() => {
    const classes = ['k-field'];
    if (this.numeric()) classes.push('k-num');
    if (this.size() === 'touch') classes.push('k-field--touch');
    if (this.field?.invalid()) classes.push('is-invalid');
    return classes.join(' ');
  });

  constructor() {
    // Without k-form-field there is no label, hint or error link → inaccessible field.
    // Fail loudly while developing; production builds skip the check.
    if (!this.field && isDevMode()) {
      throw new Error(
        'k-input must be placed inside k-form-field (it provides the label and ARIA links).',
      );
    }
  }
}
