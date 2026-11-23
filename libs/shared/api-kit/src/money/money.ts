import type { CurrencyCode } from './currency.js';

/**
 * An amount (total, tax amount, contract value): an integer in minor units plus its currency
 * (ADR-0008). 15,86 € is `{ amountMinor: 1586, currency: 'EUR' }`. The integer stays exact
 * up to 2^53 − 1; dividing by 10^exponent happens only for display, in the client.
 */
export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

/** Thrown when two amounts in different currencies meet: they are never mixed. */
export class CurrencyMismatchError extends Error {
  constructor(a: CurrencyCode, b: CurrencyCode) {
    super(`Cannot combine amounts in ${a} and ${b}`);
    this.name = 'CurrencyMismatchError';
  }
}

function sameCurrency(a: Money, b: Money): CurrencyCode {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
  return a.currency;
}

function safe(amountMinor: number): number {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Amount is outside ±(2^53 − 1) minor units');
  }
  return amountMinor;
}

/** a + b, as integers; different currencies throw, and so does a sum beyond 2^53 − 1. */
export function addMoney(a: Money, b: Money): Money {
  const currency = sameCurrency(a, b);
  return { amountMinor: safe(a.amountMinor + b.amountMinor), currency };
}

/** Negative if a < b, 0 if equal, positive if a > b; different currencies throw. */
export function compareMoney(a: Money, b: Money): number {
  sameCurrency(a, b);
  return Math.sign(a.amountMinor - b.amountMinor);
}

/**
 * A Prisma `BigInt` column → the JSON number of the contract. A 32-bit integer ends at about
 * 21 million units of currency, so the column is 64-bit; values a JavaScript number cannot
 * hold exactly are refused instead of silently rounded (ADR-0008).
 */
export function toAmountMinor(value: bigint): number {
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    value < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new RangeError('Amount is outside ±(2^53 − 1) minor units');
  }
  return Number(value);
}
