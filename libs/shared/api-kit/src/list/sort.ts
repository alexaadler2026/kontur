import { ProblemException } from '../problem/problem.exception.js';

export type SortDirection = 'asc' | 'desc';

export interface SortTerm<F extends string> {
  field: F;
  direction: SortDirection;
}

/**
 * `?sort=-updatedAt,title` → sort terms (ADR-0008): comma-separated fields, "-" means
 * descending, only fields the endpoint allows. An unknown field, an empty part or a field
 * named twice is 400 `request.malformed` — never passed on to the database.
 */
export function parseSort<F extends string>(
  raw: string | undefined,
  allowed: readonly F[],
  fallback: SortTerm<F>[] = [],
): SortTerm<F>[] {
  if (raw === undefined) return fallback;

  const terms = raw.split(',').map((part): SortTerm<F> => {
    const descending = part.startsWith('-');
    const field = descending ? part.slice(1) : part;
    if (!(allowed as readonly string[]).includes(field)) {
      throw new ProblemException('request.malformed');
    }
    return { field: field as F, direction: descending ? 'desc' : 'asc' };
  });

  if (new Set(terms.map((term) => term.field)).size !== terms.length) {
    throw new ProblemException('request.malformed');
  }
  return terms;
}

/** Sort terms → Prisma `orderBy`: `[{ updatedAt: 'desc' }, { title: 'asc' }]`. */
export function toOrderBy<F extends string>(
  terms: SortTerm<F>[],
): Record<F, SortDirection>[] {
  return terms.map(
    ({ field, direction }) =>
      ({ [field]: direction }) as Record<F, SortDirection>,
  );
}
