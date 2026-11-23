import { registerDecorator, type ValidationOptions } from 'class-validator';
import { ISO_4217_EXPONENTS } from './iso-4217.js';

/** A supported currency: a code from the pinned ISO 4217 table (ADR-0008). */
export type CurrencyCode = keyof typeof ISO_4217_EXPONENTS;

/** All supported codes, sorted — the currency enum of the contract. */
export const CURRENCY_CODES = Object.keys(
  ISO_4217_EXPONENTS,
).sort() as CurrencyCode[];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  // Own keys only: "toString" is a key of every object, not a currency.
  return typeof value === 'string' && Object.hasOwn(ISO_4217_EXPONENTS, value);
}

/**
 * Digits after the decimal point: EUR 2 (1586 = 15,86 €), JPY 0, KWD 3. From the table,
 * never from Intl — its data depends on the runtime's CLDR version (ADR-0008).
 */
export function currencyExponent(currency: CurrencyCode): number {
  return ISO_4217_EXPONENTS[currency];
}

/**
 * class-validator rule `isCurrencyCode`. A failure becomes the field error code
 * `money.currency_unsupported` (field-errors.ts), answered with 422.
 */
export function IsCurrencyCode(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isCurrencyCode',
      target: target.constructor,
      propertyName: String(propertyName),
      options,
      validator: { validate: isCurrencyCode },
    });
  };
}
