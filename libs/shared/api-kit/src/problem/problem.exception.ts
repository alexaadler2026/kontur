import type { ProblemFieldError } from './field-errors.js';
import type { ProblemCode } from './problem-codes.js';

/**
 * An error the API answers on purpose, with a registered code. Thrown by the validation
 * pipe (and later by services: `throw new ProblemException('envelope.pdf_encrypted')`);
 * ProblemFilter turns it into the response.
 */
export class ProblemException extends Error {
  constructor(
    readonly code: ProblemCode,
    readonly errors?: ProblemFieldError[],
  ) {
    super(code);
  }
}
