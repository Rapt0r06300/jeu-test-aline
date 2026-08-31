import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const defaultRoot = process.argv.includes('--dist') ? 'dist' : '.';
const root = resolve(process.env.ROOT || defaultRoot);
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const relative = pathname.replace(/^\/+/, '');
  let candidate = normalize(join(root, relative || 'index.html'));
  if (!candidate.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (existsSync(candidate) && statSync(candidate).isDirectory()) candidate = join(candidate, 'index.html');
  if (!existsSync(candidate) || statSync(candidate).isDirectory()) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.setHeader('Content-Type', mime[extname(candidate)] || 'application/octet-stream');
  createReadStream(candidate).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`));
