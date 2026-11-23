import { describe, expect, it } from 'vitest';
import { isCrossSiteRequest } from './cross-site.js';

// ADR-0010, CSRF: the API is same-origin only. State-changing requests from another site
// are rejected; SameSite=Lax on the cookie is the second layer.

const HOST = 'sign.example.de';

describe('isCrossSiteRequest (ADR-0010)', () => {
  it('Sec-Fetch-Site: same-origin and none (typed by the user) pass', () => {
    for (const site of ['same-origin', 'none']) {
      expect(
        isCrossSiteRequest('POST', { host: HOST, 'sec-fetch-site': site }),
      ).toBe(false);
    }
  });

  it('Sec-Fetch-Site: cross-site and same-site are rejected (beleg.* must not call sign.*)', () => {
    for (const site of ['cross-site', 'same-site']) {
      expect(
        isCrossSiteRequest('POST', { host: HOST, 'sec-fetch-site': site }),
      ).toBe(true);
    }
  });

  it('Sec-Fetch-Site wins over Origin (it is set by the browser, never by a page)', () => {
    expect(
      isCrossSiteRequest('POST', {
        host: HOST,
        origin: `https://${HOST}`,
        'sec-fetch-site': 'cross-site',
      }),
    ).toBe(true);
  });

  it('without Sec-Fetch-Site (older browser): Origin must be this host', () => {
    expect(
      isCrossSiteRequest('DELETE', { host: HOST, origin: `https://${HOST}` }),
    ).toBe(false);
    expect(
      isCrossSiteRequest('DELETE', {
        host: HOST,
        origin: 'https://evil.example',
      }),
    ).toBe(true);
    expect(isCrossSiteRequest('DELETE', { host: HOST, origin: 'null' })).toBe(
      true,
    );
  });

  it('neither header: not a browser (curl, scripts) — a page cannot send such a request', () => {
    expect(isCrossSiteRequest('POST', { host: HOST })).toBe(false);
  });

  it('reading methods are never blocked: GET, HEAD, OPTIONS change nothing', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(
        isCrossSiteRequest(method, {
          host: HOST,
          'sec-fetch-site': 'cross-site',
        }),
      ).toBe(false);
    }
  });

  it('every state-changing method is checked: POST, PUT, PATCH, DELETE', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(
        isCrossSiteRequest(method, {
          host: HOST,
          'sec-fetch-site': 'cross-site',
        }),
      ).toBe(true);
    }
  });
});
