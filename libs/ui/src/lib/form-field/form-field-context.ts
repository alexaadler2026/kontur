import { InjectionToken, type Signal } from '@angular/core';

/**
 * What k-form-field shares with the k-input inside it.
 * A token (instead of injecting FormFieldComponent directly) avoids a circular import:
 * form-field.ts imports input.ts for its content query, input.ts only imports this file.
 */
export interface FormFieldContext {
  /** Id for the input when it has no explicit id. */
  readonly generatedId: string;
  /** "hintId errorId" — only the parts that are shown; null when nothing is shown. */
  readonly describedBy: Signal<string | null>;
  readonly invalid: Signal<boolean>;
  readonly required: Signal<boolean>;
}

export const K_FORM_FIELD = new InjectionToken<FormFieldContext>(
  'K_FORM_FIELD',
);
