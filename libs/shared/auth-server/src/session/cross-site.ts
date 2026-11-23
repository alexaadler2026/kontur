/** Methods that change nothing: never blocked (they must stay safe, HTTP semantics). */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Request headers as Node gives them: lower-case names. */
export type RequestHeaders = Record<string, string | string[] | undefined>;

function header(headers: RequestHeaders, name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * True when a state-changing request comes from another site (CSRF, ADR-0010). Follows
 * OWASP's Fetch Metadata guidance:
 * 1. `Sec-Fetch-Site` (set by the browser, a page cannot fake it): only `same-origin` and
 *    `none` (the user typed the address) pass. `same-site` is rejected too: beleg.<domain>
 *    must not act on sign.<domain>.
 * 2. Without it (older browsers): `Origin` must name this host (`Host` header).
 * 3. Neither header: not a browser — a foreign page cannot make one send such a request.
 */
export function isCrossSiteRequest(
  method: string,
  headers: RequestHeaders,
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;

  const site = header(headers, 'sec-fetch-site');
  if (site !== undefined) return site !== 'same-origin' && site !== 'none';

  const origin = header(headers, 'origin');
  if (origin === undefined) return false;
  try {
    return new URL(origin).host !== header(headers, 'host');
  } catch {
    return true; // "null" (sandboxed page, file://) or junk
  }
}
