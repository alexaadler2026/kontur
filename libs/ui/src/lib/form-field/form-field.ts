import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { type FormFieldContext, K_FORM_FIELD } from './form-field-context';
import { InputDirective } from './input';

let nextId = 0;

/**
 * Kontur FormField — `<k-form-field label="…"><input k-input /></k-form-field>`
 * (contract: FormFieldProps). Renders label, hint and error exactly like the mockup
 * (docs/design/components/TextField.html) and links them to the input:
 * label[for] → input id; aria-describedby → hint, then error; aria-invalid; aria-required.
 * Texts arrive already translated.
 */
@Component({
  selector: 'k-form-field',
  template: `
    <label [for]="inputId()"
      >{{ label() }}
      @if (required()) {
        <span class="k-required" aria-hidden="true">*</span>
      }
    </label>
    <ng-content />
    @if (hint()) {
      <span class="k-hint" [id]="hintId">{{ hint() }}</span>
    }
    @if (error()) {
      <span class="k-error-msg" [id]="errorId">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <path
            d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"
          />
          <path d="M12 9v4m0 4h.01" />
        </svg>
        {{ error() }}
      </span>
    }
  `,
  styleUrl: './form-field.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'k-form-item' },
  providers: [{ provide: K_FORM_FIELD, useExisting: FormFieldComponent }],
})
export class FormFieldComponent implements FormFieldContext {
  readonly label = input.required<string>();
  /** Shown under the field; often explains how to fix an error, so it stays visible with it. */
  readonly hint = input<string>();
  /** Non-empty → invalid state, message with icon, aria-invalid="true". */
  readonly error = input<string | null>(null);
  /** Decorative marker (aria-hidden) + aria-required on the input. */
  readonly required = input(false, { transform: booleanAttribute });

  readonly generatedId = `k-field-${++nextId}`;
  protected readonly hintId = `${this.generatedId}-hint`;
  protected readonly errorId = `${this.generatedId}-error`;

  private readonly control = contentChild(InputDirective);
  protected readonly inputId = computed(
    () => this.control()?.id ?? this.generatedId,
  );

  readonly invalid = computed(() => !!this.error());

  // Hint first, then error (GOV.UK pattern): the hint often explains how to fix the error.
  readonly describedBy = computed(() => {
    const ids = [
      this.hint() ? this.hintId : null,
      this.error() ? this.errorId : null,
    ];
    return ids.filter((id) => id !== null).join(' ') || null;
  });
}
