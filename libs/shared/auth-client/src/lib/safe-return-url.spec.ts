import { safeReturnUrl } from './safe-return-url';

// Owner, 2026-11-23: returnUrl is accepted only as a path inside the app. Anything else
// would be an open redirect: /login?returnUrl=https://evil.example signs the person in and
// sends them to a stranger's page that looks like ours.

describe('safeReturnUrl', () => {
  it.each([
    '/',
    '/dokumente',
    '/dokumente/0193a5c0-0000-7000-8000-000000000001',
    '/dokumente?status=offen#liste',
  ])('keeps an in-app path: %s', (path) => {
    expect(safeReturnUrl(path)).toBe(path);
  });

  it.each([
    ['another site', 'https://evil.example/'],
    ['protocol-relative', '//evil.example/'],
    ['backslash, read as // by browsers', '/\\evil.example'],
    ['javascript: URL', 'javascript:alert(1)'],
    ['relative without /', 'dokumente'],
    ['empty', ''],
    ['not a string (twice in the query)', ['/a', '/b']],
    ['missing', undefined],
    ['a control character', '/doku\nmente'],
  ])('%s → "/"', (_case, value) => {
    expect(safeReturnUrl(value)).toBe('/');
  });
});
