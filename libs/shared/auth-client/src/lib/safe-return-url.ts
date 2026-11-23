/**
 * returnUrl only as a path inside the app (owner, 2026-11-23); anything else → "/".
 * Otherwise /login?returnUrl=https://evil.example would sign the person in and hand them
 * to a stranger's page (an open redirect). Browsers read "//host" and "/\host" as another
 * host, so both are refused; so are control characters.
 */
export function safeReturnUrl(value: unknown): string {
  if (typeof value !== 'string') return '/';
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//') || value.startsWith('/\\')) return '/';
  const hasControl = [...value].some((char) => {
    const code = char.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });
  return hasControl ? '/' : value;
}
