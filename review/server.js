/**
 * Serveur de la version de relecture : sert le module (paquet construit avec --review) et garde les commentaires.
 * Node pur, aucune dépendance. Réservé à la relecture : le paquet SCORM livré à Acamedia ne contient rien de tout cela.
 *
 * Variables d'environnement :
 *   REVIEW_PASSWORD   mot de passe commun des relecteurs (obligatoire ; l'identifiant saisi est ignoré)
 *   PORT              port d'écoute (8080 par défaut)
 *   SITE_DIR          dossier du module construit (build/package par défaut)
 *   DATA_DIR          dossier des commentaires, à placer sur un volume persistant (/data dans l'image, ./review-data en local)
 *
 * Avec --dev : mot de passe « review » et données dans ./review-data (test local uniquement).
 *
 * API (toutes protégées par le mot de passe, sauf /api/review/health) :
 *   GET    /api/review/comments            liste
 *   POST   /api/review/comments            ajoute { screenId, screenTitle, screenIndex, section, version, author, text, quote? }
 *   PATCH  /api/review/comments/:id        { status: "open" | "done", text? }
 *   DELETE /api/review/comments/:id
 *   GET    /api/review/export.md           Markdown (?status=open pour les seuls commentaires ouverts)
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEV = process.argv.includes('--dev');
const PORT = Number(process.env.PORT) || 8080;
const SITE_DIR = resolve(process.env.SITE_DIR ?? join(ROOT, 'build', 'package'));
const DATA_DIR = resolve(process.env.DATA_DIR ?? (DEV ? join(ROOT, 'review-data') : '/data'));
const PASSWORD = process.env.REVIEW_PASSWORD ?? (DEV ? 'review' : '');

if (!PASSWORD) {
  console.error('REVIEW_PASSWORD est obligatoire : sans mot de passe, la relecture serait ouverte à tout le monde.');
  process.exit(1);
}
if (!existsSync(join(SITE_DIR, 'index.html'))) {
  console.error(`Module introuvable dans ${SITE_DIR} : lancez « node scripts/build.js --review » avant.`);
  process.exit(1);
}

/* ---------- Stockage : un fichier JSON, écrit de façon atomique ---------- */

const FILE = join(DATA_DIR, 'comments.json');
const MAX_COMMENTS = 5000;
try {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, '.test'), 'ok');
} catch (error) {
  console.error(`Impossible d'écrire dans ${DATA_DIR} (${error.code}). Montez un volume inscriptible sur ce dossier.`);
  process.exit(1);
}

let comments = [];
if (existsSync(FILE)) {
  try {
    comments = JSON.parse(readFileSync(FILE, 'utf8'));
  } catch {
    console.error(`${FILE} est illisible : corrigez-le ou renommez-le avant de relancer (rien n'a été écrasé).`);
    process.exit(1);
  }
}

function persist() {
  const temp = `${FILE}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(comments, null, 2));
  renameSync(temp, FILE);
}

/* ---------- Authentification : Basic, mot de passe commun, avec limitation des essais ---------- */

const digest = (text) => createHash('sha256').update(String(text)).digest();
const PASSWORD_HASH = digest(PASSWORD);
const failures = new Map(); // adresse → { count, since }
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 20;

const clientAddress = (request) => String(request.headers['x-forwarded-for'] ?? request.socket.remoteAddress ?? '').split(',')[0].trim();

function checkAuth(request) {
  const address = clientAddress(request);
  const record = failures.get(address);
  if (record && Date.now() - record.since > WINDOW_MS) failures.delete(address);
  if ((failures.get(address)?.count ?? 0) >= MAX_FAILURES) return 'blocked';
  const match = /^Basic (.+)$/.exec(request.headers.authorization ?? '');
  if (match) {
    const supplied = Buffer.from(match[1], 'base64').toString('utf8');
    const password = supplied.slice(supplied.indexOf(':') + 1);
    if (timingSafeEqual(digest(password), PASSWORD_HASH)) {
      failures.delete(address);
      return 'ok';
    }
    const entry = failures.get(address) ?? { count: 0, since: Date.now() };
    entry.count += 1;
    failures.set(address, entry);
  }
  return 'denied';
}

/* ---------- Utilitaires ---------- */

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Cache-Control': 'no-store',
};

function send(response, status, body, headers = {}) {
  const isText = typeof body === 'string';
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': isText ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    ...headers,
  });
  response.end(isText ? body : JSON.stringify(body));
}

function readBody(request, limit = 32 * 1024) {
  return new Promise((resolveBody, rejectBody) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        rejectBody(Object.assign(new Error('Requête trop volumineuse.'), { status: 413 }));
        request.destroy();
      } else chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        rejectBody(Object.assign(new Error('JSON invalide.'), { status: 400 }));
      }
    });
    request.on('error', rejectBody);
  });
}

const clean = (value, max) => String(value ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);

function validate(input) {
  const comment = {
    screenId: clean(input.screenId, 60),
    screenTitle: clean(input.screenTitle, 200),
    screenIndex: Number.isInteger(input.screenIndex) && input.screenIndex >= 0 && input.screenIndex < 1000 ? input.screenIndex : 0,
    section: clean(input.section, 200),
    version: clean(input.version, 30),
    author: clean(input.author, 60),
    text: clean(input.text, 4000),
    quote: clean(input.quote, 500),
  };
  if (!/^[a-zA-Z0-9_-]+$/.test(comment.screenId)) return { error: 'Écran inconnu.' };
  if (!comment.author) return { error: 'Indiquez votre nom.' };
  if (!comment.text) return { error: 'Le commentaire est vide.' };
  return { comment };
}

function toMarkdown(list, title) {
  const sorted = [...list].sort((a, b) => a.screenIndex - b.screenIndex || a.createdAt.localeCompare(b.createdAt));
  const lines = [`# Retours de relecture${title ? ` · ${title}` : ''}`, '', `${sorted.length} commentaire${sorted.length > 1 ? 's' : ''} · exporté le ${new Date().toLocaleDateString('fr-CH')}`, ''];
  let last = null;
  for (const c of sorted) {
    if (c.screenId !== last) {
      last = c.screenId;
      lines.push(`## Écran ${c.screenIndex + 1} · ${c.screenTitle} (\`${c.screenId}\`)`, '');
      if (c.section) lines.push(`_${c.section}_`, '');
    }
    const when = new Date(c.createdAt).toLocaleDateString('fr-CH');
    lines.push(`- [${c.status === 'done' ? 'x' : ' '}] **${c.author}** (${when}, v${c.version}) : ${c.text.replace(/\n/g, '\n  ')}`);
    if (c.quote) lines.push(`  > « ${c.quote.replace(/\n/g, ' ')} »`);
  }
  return `${lines.join('\n')}\n`;
}

/* ---------- API ---------- */

async function handleApi(request, response, url) {
  const route = url.pathname.replace(/^\/api\/review\//, '');
  const mutating = request.method !== 'GET' && request.method !== 'HEAD';

  // Protection contre les requêtes envoyées depuis un autre site avec les identifiants du navigateur
  if (mutating) {
    const origin = request.headers.origin;
    if (origin && new URL(origin).host !== request.headers.host) return send(response, 403, { error: 'Origine refusée.' });
    if (request.headers['x-review'] !== '1') return send(response, 403, { error: 'En-tête manquant.' });
  }

  if (route === 'comments' && request.method === 'GET') return send(response, 200, { comments });

  if (route === 'comments' && request.method === 'POST') {
    const { comment, error } = validate(await readBody(request));
    if (error) return send(response, 400, { error });
    if (comments.length >= MAX_COMMENTS) return send(response, 507, { error: 'Limite de commentaires atteinte.' });
    const now = new Date().toISOString();
    const saved = { id: randomUUID(), ...comment, status: 'open', createdAt: now, updatedAt: now };
    comments.push(saved);
    persist();
    return send(response, 201, { comment: saved });
  }

  if (route === 'export.md' && request.method === 'GET') {
    const onlyOpen = url.searchParams.get('status') === 'open';
    const list = onlyOpen ? comments.filter((c) => c.status !== 'done') : comments;
    const title = comments.find((c) => c.version)?.version ? `version ${comments.at(-1).version}` : '';
    return send(response, 200, toMarkdown(list, title), {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="retours-relecture.md"',
    });
  }

  const match = /^comments\/([0-9a-f-]{36})$/.exec(route);
  if (match) {
    const comment = comments.find((c) => c.id === match[1]);
    if (!comment) return send(response, 404, { error: 'Commentaire introuvable.' });
    if (request.method === 'PATCH') {
      const input = await readBody(request);
      if (input.status !== undefined) {
        if (!['open', 'done'].includes(input.status)) return send(response, 400, { error: 'État inconnu.' });
        comment.status = input.status;
      }
      if (input.text !== undefined) {
        const text = clean(input.text, 4000);
        if (!text) return send(response, 400, { error: 'Le commentaire est vide.' });
        comment.text = text;
      }
      comment.updatedAt = new Date().toISOString();
      persist();
      return send(response, 200, { comment });
    }
    if (request.method === 'DELETE') {
      comments = comments.filter((c) => c.id !== comment.id);
      persist();
      return send(response, 200, { ok: true });
    }
  }

  return send(response, 404, { error: 'Route inconnue.' });
}

/* ---------- Fichiers du module (avec requêtes partielles pour la vidéo) ---------- */

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
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
  '.vtt': 'text/vtt; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function serveFile(request, response, pathname) {
  let file = resolve(SITE_DIR, `.${sep}${pathname.slice(1)}`);
  if (file !== SITE_DIR && !file.startsWith(SITE_DIR + sep)) return send(response, 403, 'Interdit');
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file) || !statSync(file).isFile()) return send(response, 404, 'Introuvable');

  const size = statSync(file).size;
  const type = MIME_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  const headers = { ...SECURITY_HEADERS, 'Content-Type': type, 'Accept-Ranges': 'bytes' };
  // Les adresses du paquet sont versionnées (?v=) : le contenu statique peut être gardé quelques minutes, pas la page ni les données
  if (!/\.(html|json)$/.test(file)) headers['Cache-Control'] = 'private, max-age=300';

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? '');
  if (range) {
    let start = range[1] === '' ? size - Number(range[2]) : Number(range[1]);
    let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) return response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
    response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    return createReadStream(file, { start, end }).pipe(response);
  }
  response.writeHead(200, { ...headers, 'Content-Length': size });
  if (request.method === 'HEAD') return response.end();
  return createReadStream(file).pipe(response);
}

/* ---------- Serveur ---------- */

const server = createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url, 'http://localhost');
    decodeURIComponent(url.pathname);
  } catch {
    return send(response, 400, 'Requête invalide');
  }

  // Sonde de santé (sans donnée) : utile à la plateforme d'hébergement
  if (url.pathname === '/api/review/health') return send(response, 200, { ok: true });

  const auth = checkAuth(request);
  if (auth === 'blocked') return send(response, 429, 'Trop d\'essais. Réessayez dans quelques minutes.', { 'Retry-After': '600' });
  if (auth !== 'ok') {
    return send(response, 401, 'Mot de passe requis.', { 'WWW-Authenticate': 'Basic realm="Relecture du module", charset="UTF-8"' });
  }

  try {
    if (url.pathname.startsWith('/api/review/')) return await handleApi(request, response, url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, 'Méthode non autorisée');
    return serveFile(request, response, decodeURIComponent(url.pathname));
  } catch (error) {
    if (!response.headersSent) send(response, error.status ?? 500, { error: error.status ? error.message : 'Erreur du serveur.' });
  }
});

server.listen(PORT, () => {
  console.log(`Relecture disponible sur http://localhost:${PORT}/?review`);
  console.log(`Module : ${SITE_DIR}`);
  console.log(`Commentaires : ${FILE} (${comments.length})`);
  if (DEV) console.log('Mode --dev : mot de passe « review ». Ne l\'utilisez pas en ligne.');
});
