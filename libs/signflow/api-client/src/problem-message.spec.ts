import { describe, expect, it } from 'vitest';
import type { ProblemCode, ProblemDetailsDto } from './generated/model';
import { problemCodeKey, problemMessage } from './problem-message';

/** A body as the API sends it; typed with the generated model, so it cannot drift. */
function problem(code: ProblemCode, status: number): ProblemDetailsDto {
  return {
    type: `urn:kontur:problem:${code}`,
    title: 'English, for developers',
    status,
    code,
    instance: '/api/v1/envelopes',
    traceId: '0193a1c2-7b4e-7c1a-9f00-3c5d2e1b0a99',
  };
}

describe('problemMessage: failed request → translation key (ADR-0008)', () => {
  it('a code of the contract → errors.<code>', () => {
    expect(
      problemMessage({ status: 422, error: problem('validation.failed', 422) }),
    ).toEqual({ key: 'errors.validation.failed', params: {} });
    expect(
      problemMessage({ status: 404, error: problem('request.not_found', 404) }),
    ).toEqual({ key: 'errors.request.not_found', params: {} });
  });

  it('an unknown code → generic text by status: 4xx generic.client, 5xx server.internal', () => {
    expect(
      problemMessage({ status: 409, error: { code: 'conflict.new_in_v2' } }),
    ).toEqual({ key: 'errors.generic.client', params: {} });
    expect(
      problemMessage({ status: 503, error: { code: 'not.a.code' } }),
    ).toEqual({ key: 'errors.server.internal', params: {} });
  });

  it('a body that is not Problem Details (proxy page, plain text) → by status', () => {
    expect(
      problemMessage({ status: 502, error: '<html>Bad Gateway</html>' }),
    ).toEqual({ key: 'errors.server.internal', params: {} });
    expect(problemMessage({ status: 400, error: null })).toEqual({
      key: 'errors.generic.client',
      params: {},
    });
  });

  it('no answer at all (status 0: offline, DNS, CORS) → errors.generic.network', () => {
    expect(problemMessage({ status: 0, error: {} })).toEqual({
      key: 'errors.generic.network',
      params: {},
    });
  });

  it('field codes use the same rule', () => {
    expect(problemCodeKey('validation.email')).toBe('errors.validation.email');
  });
});
