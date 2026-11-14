import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Kontur Switch — `<k-switch label="…" [formControl]="…" />` (contract: SwitchProps).
 * Only for settings applied immediately; in forms with a Save button use k-checkbox.
 * A native `<input type="checkbox" role="switch">` in the reference markup: focus, Space and
 * label click come from the browser; role="switch" makes screen readers say "on/off"
 * instead of "checked". The boolean value goes through ControlValueAccessor (ADR-0004).
 */
@Component({
  selector: 'k-switch',
  template: `
    <label class="k-switch" [class.is-disabled]="disabled()">
      <input
        type="checkbox"
        role="switch"
        [checked]="checked()"
        [disabled]="disabled()"
        (change)="onToggle($event)"
        (blur)="onTouched()"
      />{{ label() }}
    </label>
  `,
  styleUrl: './choice.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // forwardRef: the class is referenced inside its own decorator, before it is defined.
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SwitchComponent),
      multi: true,
    },
  ],
})
export class SwitchComponent implements ControlValueAccessor {
  readonly label = input.required<string>();

  protected readonly checked = signal(false);
  protected readonly disabled = signal(false);

  // Replaced by Angular forms via registerOnChange / registerOnTouched.
  private onChange: (value: boolean) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected onToggle(event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.checked.set(value);
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
