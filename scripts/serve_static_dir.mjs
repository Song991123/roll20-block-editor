#!/usr/bin/env node
/**
 * Serve a workspace-owned directory for browser verification.
 *
 * Usage:
 *   node scripts/serve_static_dir.mjs <root_dir> [port]
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const root = resolve(process.argv[2] ?? repoRoot);
const port = Number(process.argv[3] ?? 4177);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
  });
  res.end(body);
}

function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] || '/');
  const clean = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const target = resolve(root, `.${sep}${clean}`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) return null;
  return target;
}

if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`static root is not a directory: ${root}`);
  process.exit(2);
}

const server = createServer((req, res) => {
  const target = resolveRequestPath(req.url || '/');
  if (!target) return send(res, 403, 'forbidden');
  let file = target;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file) || !statSync(file).isFile()) return send(res, 404, 'not found');

  res.writeHead(200, {
    'content-type': contentTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(JSON.stringify({ root, port, url: `http://127.0.0.1:${port}/` }));
});
