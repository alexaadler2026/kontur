// TEMPORARY (task 1d). Serves the SignFlow production build for e2e on one origin with
// the API, as production will: /api/* goes to the built signflow-api, files come from
// dist/apps/signflow/browser, every other path gets index.html (SPA routing).
// Task 22 replaces it: e2e run against the Docker images with Caddy, as in production
// (ADR-0014), and this file is deleted. Run: pnpm nx run signflow:serve-static
import { createReadStream, statSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const PORT = 4300;
const API_PORT = 4310;
const root = resolve(import.meta.dirname, '../../dist/apps/signflow/browser');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, text) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function proxyToApi(req, res) {
  const upstream = request(
    {
      host: 'localhost',
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (apiRes) => {
      res.writeHead(apiRes.statusCode ?? 502, apiRes.headers);
      apiRes.pipe(res);
    },
  );
  upstream.on('error', () => send(res, 502, 'API not reachable'));
  req.pipe(upstream);
}

function serveFile(res, file) {
  res.writeHead(200, {
    'content-type': types[extname(file)] ?? 'application/octet-stream',
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  // The raw path, not new URL(): URL parsing would silently drop `/../` before the check.
  const rawPath = (req.url ?? '/').split('?')[0];
  if (rawPath.startsWith('/api/')) return proxyToApi(req, res);

  let file;
  try {
    file = resolve(root, '.' + decodeURIComponent(rawPath));
  } catch {
    return send(res, 400, 'Bad request');
  }
  // Path check: whatever the URL says, the file must lie inside the build folder.
  if (file !== root && !file.startsWith(root + sep))
    return send(res, 404, 'Not found');

  const isFile = statSync(file, { throwIfNoEntry: false })?.isFile() ?? false;
  serveFile(res, isFile ? file : resolve(root, 'index.html'));
}).listen(PORT, () => {
  console.log(
    `SignFlow static on http://localhost:${PORT}, /api -> ${API_PORT}`,
  );
});
