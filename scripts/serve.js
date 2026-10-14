/**
 * Serveur local de test (aucune API LMS : le module passe en mode API simulée).
 *
 *   node scripts/serve.js                 → src/ à la racine + content/ sur /content/
 *   node scripts/serve.js build/package   → sert le paquet généré par le build
 *
 * Port : 8080 par défaut, modifiable avec la variable d'environnement PORT.
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { CONTENT_DIR, ROOT } from './validate.js';

const PORT = Number(process.env.PORT) || 8080;
const target = process.argv[2];

const MOUNTS = target
  ? [['/', resolve(ROOT, target)]]
  : [
      ['/content/', CONTENT_DIR],
      ['/', join(ROOT, 'src')],
    ];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.vtt': 'text/vtt; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function resolvePath(pathname) {
  for (const [prefix, dir] of MOUNTS) {
    if (!pathname.startsWith(prefix)) continue;
    const file = resolve(dir, `.${sep}${pathname.slice(prefix.length)}`);
    if (file !== dir && !file.startsWith(dir + sep)) return null; // sortie du dossier interdite
    if (existsSync(file) && statSync(file).isDirectory()) return join(file, 'index.html');
    return file;
  }
  return null;
}

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Requête invalide');
    return;
  }

  const file = resolvePath(pathname);
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`Introuvable : ${pathname}`);
    return;
  }

  const headers = {
    'Content-Type': MIME_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
    'Accept-Ranges': 'bytes',
  };
  const size = statSync(file).size;

  // Requêtes partielles : indispensables pour lire et parcourir une vidéo
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? '');
  if (range) {
    let start = range[1] === '' ? size - Number(range[2]) : Number(range[1]);
    let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) {
      response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
      return;
    }
    response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    createReadStream(file, { start, end }).pipe(response);
    return;
  }

  response.writeHead(200, { ...headers, 'Content-Length': size });
  createReadStream(file).pipe(response);
});

server.listen(PORT, () => {
  console.log(`Module disponible sur http://localhost:${PORT}/`);
  console.log(target ? `Source : ${target}` : 'Source : src/ + content/');
  console.log('API SCORM simulée : appels visibles dans la console du navigateur. Ctrl+C pour arrêter.');
});
