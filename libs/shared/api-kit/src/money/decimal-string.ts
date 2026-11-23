import { registerDecorator, type ValidationOptions } from 'class-validator';

/**
 * An exact decimal as text: a unit price ("1.789"), a quantity ("35.42"), a tax rate ("19").
 * A JSON number with a fraction would be rounded to binary floating point (ADR-0008). The
 * brand makes a plain string unassignable until it has been checked.
 */
export type DecimalString = string & { readonly __brand: 'DecimalString' };

/** Digits, optionally a dot and more digits, optionally negative. No exponent, no comma. */
export const DECIMAL_STRING_PATTERN = /^-?\d+(\.\d+)?$/;

export function isDecimalString(value: unknown): value is DecimalString {
  return typeof value === 'string' && DECIMAL_STRING_PATTERN.test(value);
}

/** class-validator rule `isDecimalString`; a failure is `validation.invalid`. */
export function IsDecimalString(
  options?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isDecimalString',
      target: target.constructor,
      propertyName: String(propertyName),
      options,
      validator: { validate: isDecimalString },
    });
  };
}
