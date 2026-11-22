/**
 * The registry of error codes (ADR-0008): every code the API can send, with its HTTP status
 * and an English title for developers and logs (never shown to users — the frontend
 * translates `errors.<code>`). The contract lists these codes as the ProblemCode enum, and
 * i18n-check requires a translation for each.
 */
export const PROBLEM_CODES = {
  'validation.invalid': { status: 422, title: 'The request failed validation' },
  'validation.required': { status: 422, title: 'A required value is missing' },
  'validation.email': { status: 422, title: 'Not a valid e-mail address' },
  'request.malformed': {
    status: 400,
    title: 'The request could not be parsed',
  },
  'request.not_found': { status: 404, title: 'Not found' },
  'server.internal': { status: 500, title: 'Unexpected server error' },
} as const satisfies Record<string, { status: number; title: string }>;

export type ProblemCode = keyof typeof PROBLEM_CODES;

/** All codes, in registry order — the enum of the contract. */
export const PROBLEM_CODE_LIST = Object.keys(PROBLEM_CODES) as ProblemCode[];
