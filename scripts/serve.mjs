/**
 * A local preview server for `dist/`.
 *
 * Serves the built site over HTTP so the search index, which is fetched at runtime, behaves the way it
 * does on a host. Opening `dist/index.html` from the file system also works, except that the browser
 * blocks the `fetch` for `search-index.json`, so search quietly finds nothing there.
 *
 * Usage: `npm run serve` (defaults to port 4173), or `PORT=8080 npm run serve`.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const port = Number(process.env.PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const filePath = join(distDir, pathname);

  // Refuse a path that climbs out of dist/, which a decoded `..` would otherwise allow.
  if (!resolve(filePath).startsWith(distDir)) {
    response.writeHead(403, { 'content-type': 'text/plain' });
    response.end('Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) throw new Error('directory');
    const body = await readFile(filePath);
    response.writeHead(200, { 'content-type': TYPES[extname(filePath)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`Not found: ${pathname}\n`);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`guide: http://127.0.0.1:${port}/`);
});
