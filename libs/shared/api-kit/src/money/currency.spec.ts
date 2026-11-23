import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { PROBLEM_CODES } from '../problem/problem-codes.js';
import { toFieldErrors } from '../problem/field-errors.js';
import {
  CURRENCY_CODES,
  currencyExponent,
  isCurrencyCode,
} from './currency.js';
import { MoneyDto } from './money.dto.js';

describe('currency table (ISO 4217, ADR-0008)', () => {
  it('knows the exponent of real currencies, including the zero- and three-digit ones', () => {
    expect(currencyExponent('EUR')).toBe(2);
    expect(currencyExponent('JPY')).toBe(0);
    expect(currencyExponent('KWD')).toBe(3);
    expect(currencyExponent('KGS')).toBe(2);
    // CFA franc: a real currency with an X code, kept (owner, 2026-11-23).
    expect(currencyExponent('XAF')).toBe(0);
  });

  it('has no metals, no special codes and no fund codes', () => {
    for (const code of ['XAU', 'XAG', 'XDR', 'XXX', 'XTS', 'CLF', 'UYW']) {
      expect(isCurrencyCode(code), code).toBe(false);
    }
  });

  it('accepts only the exact upper-case code', () => {
    expect(isCurrencyCode('EUR')).toBe(true);
    expect(isCurrencyCode('eur')).toBe(false);
    expect(isCurrencyCode('EURO')).toBe(false);
    // An inherited object key is not a currency.
    expect(isCurrencyCode('toString')).toBe(false);
  });

  it('lists every currency once, sorted, as three capital letters', () => {
    expect(CURRENCY_CODES.every((code) => /^[A-Z]{3}$/.test(code))).toBe(true);
    expect([...CURRENCY_CODES].sort()).toEqual(CURRENCY_CODES);
    expect(new Set(CURRENCY_CODES).size).toBe(CURRENCY_CODES.length);
  });
});

describe('MoneyDto validation', () => {
  async function fieldErrors(body: object) {
    return toFieldErrors(await validate(plainToInstance(MoneyDto, body)));
  }

  it('an unknown currency is money.currency_unsupported, a 422 code', async () => {
    expect(await fieldErrors({ amountMinor: 1586, currency: 'XAU' })).toEqual([
      { pointer: '/currency', code: 'money.currency_unsupported', params: {} },
    ]);
    expect(PROBLEM_CODES['money.currency_unsupported'].status).toBe(422);
  });

  it('accepts a safe integer amount in minor units, negative too', async () => {
    expect(await fieldErrors({ amountMinor: 1586, currency: 'EUR' })).toEqual(
      [],
    );
    expect(await fieldErrors({ amountMinor: -250, currency: 'JPY' })).toEqual(
      [],
    );
  });

  it('rejects fractions and amounts beyond 2^53 − 1', async () => {
    for (const amountMinor of [15.86, Number.MAX_SAFE_INTEGER + 1, '1586']) {
      expect(
        await fieldErrors({ amountMinor, currency: 'EUR' }),
        String(amountMinor),
      ).toEqual([
        { pointer: '/amountMinor', code: 'validation.invalid', params: {} },
      ]);
    }
  });
});
