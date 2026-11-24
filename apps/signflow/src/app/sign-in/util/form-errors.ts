import { computed, type Signal, signal } from '@angular/core';
import {
  type FieldTree,
  isFieldTree,
  type ValidationError,
} from '@angular/forms/signals';

// Taken over from the Signal Forms prototype (apps/ui-storybook/src/forms-prototype,
// ADR-0021). The first real form lives here; when a second app needs it (Belegscan), it
// moves to a shared platform:web library and the prototype imports it from there.

/**
 * When a field error is visible (ADR-0021): recorded on leaving the field or on a submit
 * attempt, shown only while the field still has an error of that kind. So while the person
 * types, a new error never appears, but a fixed one disappears at once.
 */
export function errorDisplay(field: FieldTree<string>): {
  visible: Signal<ValidationError | null>;
  record: () => void;
} {
  const recorded = signal<string | null>(null);
  return {
    visible: computed(() => {
      const kind = recorded();
      return kind
        ? (field()
            .errors()
            .find((error) => error.kind === kind) ?? null)
        : null;
    }),
    record: () => recorded.set(field().errors()[0]?.kind ?? null),
  };
}

/**
 * Translation key of an error (ADR-0008: `errors.<code>`). Client rules have a bare kind
 * ("required", "email") and share the `validation.*` codes of the server.
 */
export function errorKey(kind: string): string {
  return kind.includes('.') ? `errors.${kind}` : `errors.validation.${kind}`;
}

interface FieldProblem {
  pointer: string;
  code: string;
}

/** "/signers/0/email" → ["signers", "0", "email"] (RFC 6901: ~1 is "/", ~0 is "~"). */
function segments(pointer: string): string[] {
  return pointer
    .split('/')
    .slice(1)
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/** Follows a JSON Pointer through the field tree. null = no such field. */
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
 * The `errors[]` of a 422 Problem Details → field errors for Signal Forms, with the server
 * code as `kind`; entries whose pointer names no field come back as `unmatched` codes.
 */
export function fieldErrorsOf(
  body: unknown,
  form: FieldTree<unknown>,
): { fieldErrors: ValidationError.WithFieldTree[]; unmatched: string[] } {
  const entries =
    typeof body === 'object' && body !== null && 'errors' in body
      ? ((body as { errors: unknown }).errors as FieldProblem[])
      : [];
  const fieldErrors: ValidationError.WithFieldTree[] = [];
  const unmatched: string[] = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    const field = resolve(form, entry.pointer);
    if (field) fieldErrors.push({ kind: entry.code, fieldTree: field });
    else unmatched.push(entry.code);
  }
  return { fieldErrors, unmatched };
}

/**
 * Minutes for `errors.auth.throttled` from the Retry-After header (seconds, ADR-0010),
 * rounded up: 61 s is "2 minutes", never "1" — the person must not try too early. A
 * missing or broken header counts as 1 minute (the API always sends it).
 */
export function throttleMinutes(retryAfter: string | null): number {
  const seconds = Number(retryAfter);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds / 60) : 1;
}
