import {
  type FieldTree,
  isFieldTree,
  type ValidationError,
} from '@angular/forms/signals';

/**
 * RFC 9457 Problem Details as defined in ADR-0008 (only the fields the UI uses).
 * Prototype for ADR-0021; moves to a platform:web library with task 8 (sign-in screen).
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  /** Stable machine-readable code; the UI shows the translation `errors.<code>`. */
  code: string;
  errors?: {
    pointer: string;
    code: string;
    params?: Record<string, unknown>;
  }[];
}

export interface MappedProblem {
  /** Errors for fields, ready to return from the submit() action of Signal Forms. */
  fieldErrors: ValidationError.WithFieldTree[];
  /** Codes without a field: shown once, as a general message of the whole form. */
  formErrors: string[];
}

/** "/signers/0/email" → ["signers", "0", "email"] (RFC 6901: ~1 is "/", ~0 is "~"). */
function segments(pointer: string): string[] {
  return pointer
    .split('/')
    .slice(1)
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/** Follows a JSON Pointer through the field tree: form.signers[0].email. null = no such field. */
function resolve(
  form: FieldTree<unknown>,
  pointer: string,
): FieldTree<unknown> | null {
  let node: unknown = form;
  for (const key of segments(pointer)) {
    if (node === null || typeof node !== 'function') return null;
    node = (node as unknown as Record<string, unknown>)[key];
  }
  return isFieldTree(node) ? node : null;
}

/**
 * Problem Details → errors for Signal Forms (ADR-0021):
 * - every errors[] entry whose pointer names a field becomes that field's error,
 *   with the server code as `kind` (e.g. "validation.email");
 * - a pointer that matches no field, and a problem without errors[], become form errors.
 */
export function mapProblem(
  problem: ProblemDetails,
  form: FieldTree<unknown>,
): MappedProblem {
  const fieldErrors: ValidationError.WithFieldTree[] = [];
  const formErrors: string[] = [];
  for (const entry of problem.errors ?? []) {
    const field = resolve(form, entry.pointer);
    if (field) fieldErrors.push({ kind: entry.code, fieldTree: field });
    else formErrors.push(entry.code);
  }
  if (!problem.errors?.length) formErrors.push(problem.code);
  return { fieldErrors, formErrors };
}

/**
 * Translation key of an error (ADR-0008: `errors.<code>`). Client rules have a bare kind
 * ("required", "email") and share the `validation.*` codes of the server.
 */
export function errorKey(kind: string): string {
  return kind.includes('.') ? `errors.${kind}` : `errors.validation.${kind}`;
}
