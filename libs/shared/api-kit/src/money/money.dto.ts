import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import {
  CURRENCY_CODES,
  type CurrencyCode,
  IsCurrencyCode,
} from './currency.js';

/** An amount in request and response bodies (ADR-0008): integer minor units + currency. */
export class MoneyDto {
  /**
   * Integer in minor units of the currency: 1586 is 15,86 € (EUR has 2 minor digits).
   * @example 1586
   */
  @ApiProperty({
    type: 'integer',
    minimum: Number.MIN_SAFE_INTEGER,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  @IsInt()
  @Min(Number.MIN_SAFE_INTEGER)
  @Max(Number.MAX_SAFE_INTEGER)
  amountMinor!: number;

  /**
   * ISO 4217 code from the supported table; any other is `money.currency_unsupported`.
   * @example "EUR"
   */
  @ApiProperty({ enum: CURRENCY_CODES, enumName: 'CurrencyCode' })
  @IsCurrencyCode()
  currency!: CurrencyCode;
}
