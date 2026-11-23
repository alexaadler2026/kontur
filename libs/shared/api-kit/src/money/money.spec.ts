import { describe, expect, it } from 'vitest';
import {
  addMoney,
  compareMoney,
  CurrencyMismatchError,
  type Money,
  toAmountMinor,
} from './money.js';

const eur = (amountMinor: number): Money => ({ amountMinor, currency: 'EUR' });

describe('Money arithmetic (ADR-0008: integers in minor units, never mixed)', () => {
  it('adds amounts of one currency as integers', () => {
    // 0.1 + 0.2 in euros: exact, because the integers 10 and 20 are added.
    expect(addMoney(eur(10), eur(20))).toEqual(eur(30));
    expect(addMoney(eur(1586), eur(-250))).toEqual(eur(1336));
  });

  it('refuses to add different currencies', () => {
    expect(() =>
      addMoney(eur(100), { amountMinor: 100, currency: 'KGS' }),
    ).toThrow(CurrencyMismatchError);
  });

  it('refuses a sum beyond 2^53 − 1, where integers stop being exact', () => {
    expect(() => addMoney(eur(Number.MAX_SAFE_INTEGER), eur(1))).toThrow(
      RangeError,
    );
  });

  it('compares amounts of one currency, and refuses to compare different ones', () => {
    expect(compareMoney(eur(5), eur(7))).toBeLessThan(0);
    expect(compareMoney(eur(7), eur(7))).toBe(0);
    expect(compareMoney(eur(9), eur(7))).toBeGreaterThan(0);
    expect(() =>
      compareMoney(eur(1), { amountMinor: 1, currency: 'USD' }),
    ).toThrow(CurrencyMismatchError);
  });
});

describe('toAmountMinor: a BigInt column → a JSON-safe number', () => {
  it('converts values inside ±(2^53 − 1)', () => {
    expect(toAmountMinor(1586n)).toBe(1586);
    expect(toAmountMinor(-1586n)).toBe(-1586);
    expect(toAmountMinor(BigInt(Number.MAX_SAFE_INTEGER))).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it('rejects values a JavaScript number cannot hold exactly', () => {
    expect(() => toAmountMinor(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow(
      RangeError,
    );
    expect(() => toAmountMinor(-BigInt(Number.MAX_SAFE_INTEGER) - 1n)).toThrow(
      RangeError,
    );
  });
});
