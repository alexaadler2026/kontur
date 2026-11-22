import type { ValidationError } from 'class-validator';
import type { ProblemCode } from './problem-codes.js';

/** One entry of `errors[]`: where (JSON Pointer), what (code), and the rule's parameters. */
export interface ProblemFieldError {
  pointer: string;
  code: ProblemCode;
  params: Record<string, string | number>;
}

/** class-validator rule name → code. Rules without their own code → validation.invalid. */
const RULE_CODES: Record<string, ProblemCode> = {
  isDefined: 'validation.required',
  isNotEmpty: 'validation.required',
  isEmail: 'validation.email',
};

/** RFC 6901: "~" → "~0", "/" → "~1" inside one path segment. */
function escapeSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * class-validator errors → `errors[]`, one entry per field. Only the property path and
 * the names of the failed rules are read: the sent value (`error.value`) and the object
 * (`error.target`) are never copied — they may be a password (ADR-0020).
 */
export function toFieldErrors(
  errors: ValidationError[],
  path: string[] = [],
): ProblemFieldError[] {
  return errors.flatMap((error) => {
    const segments = [...path, error.property];
    const rules = Object.keys(error.constraints ?? {});
    const codes = rules.map((rule) => RULE_CODES[rule] ?? 'validation.invalid');
    // "Required" wins: an empty field needs filling in first, other rules come after.
    const code = codes.includes('validation.required')
      ? 'validation.required'
      : codes[0];
    const own: ProblemFieldError[] = code
      ? [
          {
            pointer: '/' + segments.map(escapeSegment).join('/'),
            code,
            params: {},
          },
        ]
      : [];
    return [...own, ...toFieldErrors(error.children ?? [], segments)];
  });
}
