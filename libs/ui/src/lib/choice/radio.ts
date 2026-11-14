import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { K_RADIO_GROUP, type RadioGroupContext } from './radio-group-context';

/**
 * Kontur radio option — `<k-radio value="…" label="…" />` inside `<k-radio-group>`
 * (contract: RadioProps<T>). A real `<input type="radio">` in the reference label markup.
 * The group owns the form value; values are compared with Object.is
 * (strings and numbers by value, objects by reference).
 */
@Component({
  selector: 'k-radio',
  template: `
    <label class="k-radio" [class.is-disabled]="isDisabled()">
      <input
        type="radio"
        [name]="group.name()"
        [checked]="checked()"
        [disabled]="isDisabled()"
        [required]="group.required()"
        (change)="group.select(value())"
      />{{ label() }}
    </label>
  `,
  styleUrl: './choice.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioComponent<T = unknown> {
  readonly value = input.required<T>();
  readonly label = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly group: RadioGroupContext = radioGroup();

  protected readonly checked = computed(() =>
    Object.is(this.group.value(), this.value()),
  );
  protected readonly isDisabled = computed(
    () => this.disabled() || this.group.disabled(),
  );
}

/**
 * The enclosing group. Without it a radio has no name and no form value, so it cannot work
 * at all — a clear error in every mode (k-input only checks in dev mode, because it still
 * works without its field, just without label and ARIA links).
 */
function radioGroup(): RadioGroupContext {
  const group = inject(K_RADIO_GROUP, { optional: true });
  if (!group) {
    throw new Error(
      'k-radio must be placed inside k-radio-group (it provides the name and the form value).',
    );
  }
  return group;
}
