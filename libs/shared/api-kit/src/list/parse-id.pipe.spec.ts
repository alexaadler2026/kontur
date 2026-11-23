import { describe, expect, it } from 'vitest';
import { ProblemException } from '../problem/problem.exception.js';
import { ParseIdPipe } from './parse-id.pipe.js';

const pipe = new ParseIdPipe();
const UUID_V7 = '019a7f3c-5b2e-7c41-9d3a-2f6e8b1c4d50';

describe('ParseIdPipe (a path id that is not a UUID → 404, without asking the database)', () => {
  it('passes a UUID through, upper case too', () => {
    expect(pipe.transform(UUID_V7)).toBe(UUID_V7);
    expect(pipe.transform(UUID_V7.toUpperCase())).toBe(UUID_V7.toUpperCase());
  });

  it('anything else is request.not_found: no such record can exist', () => {
    for (const id of ['Geheim-123', '', '42', `${UUID_V7}x`, `{${UUID_V7}}`]) {
      let code: string | undefined;
      try {
        pipe.transform(id);
      } catch (error) {
        code = error instanceof ProblemException ? error.code : 'other';
      }
      expect(code, JSON.stringify(id)).toBe('request.not_found');
    }
  });
});
