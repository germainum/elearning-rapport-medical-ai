/**
 * Faux LRS local pour vérifier ce que le module envoie en xAPI (aucune donnée n'est conservée sur disque).
 *
 *   npm run lrs                 → http://localhost:8090/ ; affiche chaque statement reçu
 *
 * Lancer le module avec, par exemple :
 *   http://localhost:8080/?endpoint=http://localhost:8090/&auth=Basic%20dGVzdDp0ZXN0&actor={"name":"Test","mbox":"mailto:test@example.org"}
 * « GET /statements » renvoie les statements reçus depuis le démarrage (JSON).
 */

import { createServer } from 'node:http';

const PORT = Number(process.env.LRS_PORT) || 8090;
const received = [];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Experience-API-Version, If-Match, If-None-Match',
  'Access-Control-Expose-Headers': 'X-Experience-API-Version, ETag',
};

function show(statement) {
  const verb = statement.verb?.display?.['en-US'] ?? statement.verb?.id;
  const target = String(statement.object?.id ?? '').split('/').slice(-2).join('/');
  const result = statement.result
    ? ` ${JSON.stringify({ ...(statement.result.success !== undefined && { success: statement.result.success }), ...(statement.result.score && { score: statement.result.score.raw }), ...(statement.result.response && { response: statement.result.response }) })}`
    : '';
  console.log(`${statement.timestamp?.slice(11, 19)}  ${statement.actor?.name ?? statement.actor?.mbox}  ${verb}  ${target}${result}`);
}

const server = createServer((request, response) => {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  if (request.method === 'OPTIONS') {
    response.writeHead(204, CORS).end();
    return;
  }
  if (url.pathname === '/statements' && request.method === 'GET') {
    response.writeHead(200, { ...CORS, 'Content-Type': 'application/json' }).end(JSON.stringify({ statements: received, more: '' }));
    return;
  }
  if (url.pathname === '/statements' && request.method === 'POST') {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      try {
        let raw = Buffer.concat(chunks).toString('utf8');
        // Requête « simple » (page qui se ferme) : formulaire avec le contenu dans « content »
        if (url.searchParams.get('method') === 'POST') raw = new URLSearchParams(raw).get('content') ?? raw;
        const list = [].concat(JSON.parse(raw));
        for (const statement of list) {
          received.push(statement);
          show(statement);
        }
        response.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'X-Experience-API-Version': '1.0.3' }).end(JSON.stringify(list.map((s) => s.id)));
      } catch (error) {
        console.error('Statement refusé :', error.message);
        response.writeHead(400, CORS).end('Statement invalide');
      }
    });
    return;
  }
  response.writeHead(404, CORS).end();
});

server.listen(PORT, () => {
  console.log(`Faux LRS xAPI sur http://localhost:${PORT}/ (Ctrl+C pour arrêter)\n`);
});
