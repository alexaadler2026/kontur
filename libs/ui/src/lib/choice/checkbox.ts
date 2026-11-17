import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideTriangleAlert } from '@lucide/angular';

let nextId = 0;

/**
 * Kontur Checkbox — `<k-checkbox label="…" [formControl]="…" />` (contract: CheckboxProps v3).
 * A real `<input type="checkbox">` inside the reference markup gives focus, Space, label click
 * and the screen-reader role for free; the value is a boolean exchanged with Angular forms
 * through ControlValueAccessor (ADR-0004).
 */
@Component({
  selector: 'k-checkbox',
  imports: [LucideTriangleAlert],
  template: `
    <label
      class="k-check"
      [class.is-invalid]="invalid()"
      [class.is-disabled]="disabled()"
    >
      <input
        type="checkbox"
        [checked]="checked()"
        [indeterminate]="indeterminate()"
        [disabled]="disabled()"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        [attr.aria-describedby]="describedBy()"
        (change)="onToggle($event)"
        (blur)="onTouched()"
      />{{ label() }}
    </label>
    @if (hint()) {
      <span class="k-hint" [id]="hintId">{{ hint() }}</span>
    }
    @if (error()) {
      <span class="k-error-msg" [id]="errorId"
        ><svg lucideTriangleAlert size="14"></svg>{{ error() }}</span
      >
    }
  `,
  styleUrl: './choice.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'k-choice-item' },
  providers: [
    // forwardRef: the class is referenced inside its own decorator, before it is defined.
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxComponent),
      multi: true,
    },
  ],
})
export class CheckboxComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  /** model(): the browser clears "indeterminate" on click; the change flows back to the parent. */
  readonly indeterminate = model(false);
  readonly hint = input<string>();
  /** v3: a text, not a boolean — an error must not be color-only (WCAG 1.4.1, 3.3.1). */
  readonly error = input<string | null>(null);

  protected readonly checked = signal(false);
  protected readonly disabled = signal(false);

  private readonly id = `k-check-${++nextId}`;
  protected readonly hintId = `${this.id}-hint`;
  protected readonly errorId = `${this.id}-error`;

  protected readonly invalid = computed(() => !!this.error());
  // Hint first, then error — the same order as k-form-field.
  protected readonly describedBy = computed(() => {
    const ids = [
      this.hint() ? this.hintId : null,
      this.error() ? this.errorId : null,
    ];
    return ids.filter((id) => id !== null).join(' ') || null;
  });

  // Replaced by Angular forms via registerOnChange / registerOnTouched.
  private onChange: (value: boolean) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected onToggle(event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.checked.set(value);
    this.indeterminate.set(false);
    this.onChange(value);
  }

  // ControlValueAccessor: form → component
  writeValue(value: boolean | null): void {
    this.checked.set(value === true);
  }
  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
