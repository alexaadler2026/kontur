import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ErrorIconComponent } from '../util/error-icon';
import { K_RADIO_GROUP, type RadioGroupContext } from './radio-group-context';

let nextId = 0;

/**
 * Kontur radio group — `<k-radio-group legend="…" name="…" [formControl]="…">` with `<k-radio>`
 * options (contract: RadioGroupProps v3). Renders the reference fieldset; the form value is the
 * `value` of the chosen option, exchanged with Angular forms through ControlValueAccessor
 * (ADR-0004). Keyboard (arrows, one Tab stop) comes from the native radios sharing `name`.
 */
@Component({
  selector: 'k-radio-group',
  imports: [ErrorIconComponent],
  template: `
    <fieldset
      class="k-choice-group"
      [class.is-invalid]="invalid()"
      [attr.aria-describedby]="describedBy()"
      (focusout)="onFocusOut($event)"
    >
      <legend class="k-label">
        {{ legend() }}
        @if (required()) {
          <span class="k-required" aria-hidden="true">*</span>
        }
      </legend>
      @if (hint()) {
        <span class="k-hint" [id]="hintId">{{ hint() }}</span>
      }
      @if (error()) {
        <span class="k-error-msg" [id]="errorId"
          ><svg k-error-icon></svg>{{ error() }}</span
        >
      }
      <div class="k-choice-options"><ng-content /></div>
    </fieldset>
  `,
  styleUrl: './choice.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // forwardRef: the class is referenced inside its own decorator, before it is defined.
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioGroupComponent),
      multi: true,
    },
    {
      provide: K_RADIO_GROUP,
      useExisting: forwardRef(() => RadioGroupComponent),
    },
  ],
})
export class RadioGroupComponent<T = unknown>
  implements ControlValueAccessor, RadioGroupContext
{
  readonly legend = input.required<string>();
  /** Required by the contract: it is sent with a native form submit, so it is never invented. */
  readonly name = input.required<string>();
  readonly hint = input<string>();
  /** A text, not a boolean — an error must not be color-only (WCAG 1.4.1, 3.3.1). */
  readonly error = input<string | null>(null);
  readonly required = input(false, { transform: booleanAttribute });

  readonly value = signal<T | null>(null);
  readonly disabled = signal(false);

  private readonly id = `k-radio-group-${++nextId}`;
  protected readonly hintId = `${this.id}-hint`;
  protected readonly errorId = `${this.id}-error`;

  protected readonly invalid = computed(() => !!this.error());
  // Hint first, then error — the same order as k-form-field (GOV.UK).
  protected readonly describedBy = computed(() => {
    const ids = [
      this.hint() ? this.hintId : null,
      this.error() ? this.errorId : null,
    ];
    return ids.filter((id) => id !== null).join(' ') || null;
  });

  // Replaced by Angular forms via registerOnChange / registerOnTouched.
  private onChange: (value: T | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  select(value: unknown): void {
    this.value.set(value as T);
    this.onChange(value as T);
  }

  /**
   * Touched when focus leaves the whole group — not on every radio blur like Angular's built-in
   * RadioControlValueAccessor: arrow keys move focus between radios, and an error must not appear
   * while the person is still choosing.
   */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !(event.currentTarget as Node).contains(next)) {
      this.onTouched();
    }
  }

  // ControlValueAccessor: form → component
  writeValue(value: T | null): void {
    this.value.set(value ?? null);
  }
  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
