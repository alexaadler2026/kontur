import { InjectionToken, type Signal } from '@angular/core';

/**
 * What k-radio-group shares with the k-radio options inside it.
 * A token (instead of injecting RadioGroupComponent directly) avoids a circular import,
 * the same way K_FORM_FIELD does for k-form-field / k-input.
 */
export interface RadioGroupContext {
  /** Native `name` shared by all radios: gives arrow keys and one Tab stop per group. */
  readonly name: Signal<string>;
  /** The selected value; null = nothing selected. */
  readonly value: Signal<unknown>;
  readonly disabled: Signal<boolean>;
  readonly required: Signal<boolean>;
  /** Called by a radio on its native `change` event. */
  select(value: unknown): void;
}

export const K_RADIO_GROUP = new InjectionToken<RadioGroupContext>(
  'K_RADIO_GROUP',
);
