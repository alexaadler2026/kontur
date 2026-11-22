import { ApiProperty } from '@nestjs/swagger';
import type { ProblemFieldError } from './field-errors.js';
import { PROBLEM_CODE_LIST, type ProblemCode } from './problem-codes.js';
import type { ProblemBody } from './problem.filter.js';

/**
 * The shape of Problem Details in the contract (ADR-0008). The classes only describe the
 * schema: ProblemFilter builds the body. `implements` keeps both in step — a field added
 * on one side and not on the other does not compile.
 */
const CODE = { enum: PROBLEM_CODE_LIST, enumName: 'ProblemCode' } as const;

/** One failed field of a validation problem. */
export class ProblemFieldErrorDto implements ProblemFieldError {
  /**
   * JSON Pointer (RFC 6901) to the field in the request body.
   * @example "/signers/0/email"
   */
  pointer!: string;

  /** Stable code; the UI shows the translation `errors.<code>`. */
  @ApiProperty({ ...CODE, example: 'validation.email' })
  code!: ProblemCode;

  /** Parameters of the rule for the message, e.g. `{ "max": 25 }`. */
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: ['string', 'number'] },
    example: {},
  })
  params!: Record<string, string | number>;
}

/** RFC 9457 Problem Details with the stable `code` (ADR-0008). */
export class ProblemDetailsDto implements ProblemBody {
  /**
   * URN of the problem type; its last part is the code.
   * @example "urn:kontur:problem:validation.invalid"
   */
  type!: string;

  /**
   * English summary for developers and logs — never shown to users.
   * @example "The request failed validation"
   */
  title!: string;

  /** HTTP status, repeated in the body. */
  @ApiProperty({ type: 'integer', example: 422 })
  status!: number;

  /** Stable code; the UI shows the translation `errors.<code>`. */
  @ApiProperty({ ...CODE, example: 'validation.invalid' })
  code!: ProblemCode;

  /**
   * Path of the request, without the query string.
   * @example "/api/v1/envelopes"
   */
  instance!: string;

  /**
   * Id of this error; the same id is in the server log of a 500.
   * @example "0193a1c2-7b4e-7c1a-9f00-3c5d2e1b0a99"
   */
  traceId!: string;

  /** Failed fields of a validation problem. */
  @ApiProperty({
    type: [ProblemFieldErrorDto],
    required: false,
    example: [{ pointer: '/email', code: 'validation.email', params: {} }],
  })
  errors?: ProblemFieldErrorDto[];
}
