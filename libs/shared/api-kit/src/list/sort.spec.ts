import { describe, expect, it } from 'vitest';
import { ProblemException } from '../problem/problem.exception.js';
import { parseSort, toOrderBy } from './sort.js';

const FIELDS = ['updatedAt', 'title'] as const;

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    return error instanceof ProblemException
      ? error.code
      : 'not a ProblemException';
  }
  return undefined;
}

describe('parseSort (ADR-0008: comma-separated, "-" = descending, whitelisted fields)', () => {
  it('reads fields in order, with their direction', () => {
    expect(parseSort('-updatedAt,title', FIELDS)).toEqual([
      { field: 'updatedAt', direction: 'desc' },
      { field: 'title', direction: 'asc' },
    ]);
  });

  it('no sort parameter → the endpoint default', () => {
    expect(
      parseSort(undefined, FIELDS, [{ field: 'title', direction: 'asc' }]),
    ).toEqual([{ field: 'title', direction: 'asc' }]);
    expect(parseSort(undefined, FIELDS)).toEqual([]);
  });

  it('an unknown field, an empty part or a repeated field is 400 request.malformed', () => {
    for (const raw of [
      'password',
      'title,,updatedAt',
      '',
      '-',
      'title,-title',
      ' title',
    ]) {
      expect(
        codeOf(() => parseSort(raw, FIELDS)),
        JSON.stringify(raw),
      ).toBe('request.malformed');
    }
  });

  it('becomes a Prisma orderBy', () => {
    expect(toOrderBy(parseSort('-updatedAt,title', FIELDS))).toEqual([
      { updatedAt: 'desc' },
      { title: 'asc' },
    ]);
  });
});
