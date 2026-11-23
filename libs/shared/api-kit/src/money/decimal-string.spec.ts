import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { toFieldErrors } from '../problem/field-errors.js';
import { IsDecimalString, isDecimalString } from './decimal-string.js';

class ProbeDto {
  @IsDecimalString()
  quantity!: string;
}

describe('DecimalString (exact decimals as text, ADR-0008)', () => {
  it('accepts integers and decimals, negative too', () => {
    for (const value of ['0', '19', '35.42', '1.789', '-2.50']) {
      expect(isDecimalString(value), value).toBe(true);
    }
  });

  it('rejects what is not a plain decimal', () => {
    for (const value of [
      '',
      '1,5',
      '.5',
      '5.',
      '1e3',
      '+1',
      ' 1',
      '0x10',
      'NaN',
    ]) {
      expect(isDecimalString(value), JSON.stringify(value)).toBe(false);
    }
  });

  it('a JSON number is rejected: decimals travel as strings', async () => {
    const errors = await validate(
      plainToInstance(ProbeDto, { quantity: 35.42 }),
    );
    expect(toFieldErrors(errors)).toEqual([
      { pointer: '/quantity', code: 'validation.invalid', params: {} },
    ]);
    expect(
      await validate(plainToInstance(ProbeDto, { quantity: '35.42' })),
    ).toEqual([]);
  });
});
