/**
 * Refait les captures d'écran du document de relecture (docs/relecture-images/*.jpg).
 *
 *   npm install --no-save playwright          # une seule fois (outil, pas une dépendance du module)
 *   npm start                                 # dans un premier terminal (http://localhost:8080)
 *   node scripts/capture-relecture.js         # dans un second terminal
 *
 * Joue le parcours avec les bonnes réponses, sauf une question sur quatre (≈ 76 % de réussite : la synthèse montre ainsi
 * des sections « Solide » et « À consolider »). Écrans de 1280×800 pour l'ordinateur, 393×852 pour le téléphone.
 * Puis relancer : node scripts/export-relecture.js
 */

import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { CONTENT_DIR, ROOT } from './validate.js';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Ce script a besoin de Playwright : « npm install --no-save playwright », puis « npx playwright install chromium ».');
  process.exit(1);
}

const URL_BASE = process.env.MODULE_URL ?? 'http://localhost:8080/';
const OUT = join(ROOT, 'docs', 'relecture-images');
mkdirSync(OUT, { recursive: true });
const module = JSON.parse(readFileSync(join(CONTENT_DIR, 'module.json'), 'utf8'));

// question → bonne et mauvaise réponse ; une question sur quatre est volontairement ratée
const questions = {};
let count = 0;
for (const screen of module.screens) {
  for (const block of screen.blocks ?? []) {
    if (block.type !== 'question') continue;
    count += 1;
    questions[block.id] = { n: count, correct: block.options.find((o) => o.correct).id, wrong: block.options.find((o) => !o.correct).id };
  }
}
const missed = new Set(Object.values(questions).filter((q) => q.n % 4 === 2).map((q) => q.n));
const shot = (name) => ({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 82 });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(URL_BASE);
await page.waitForTimeout(2500);

const done = new Set();
const currentId = () => page.evaluate(() => (document.querySelector('main article')?.getAttribute('aria-labelledby') || '').replace(/^screen-|-title$/g, ''));

for (let step = 0; step < 900; step += 1) {
  const id = await currentId();
  if (id === 'introduction' && !done.has(id)) { done.add(id); await page.waitForTimeout(1500); await page.screenshot(shot('00-couverture')); }
  if (id === 'courrier' && !done.has(id)) { done.add(id); await page.waitForTimeout(1800); await page.screenshot(shot('01-courrier')); }
  if (id === 'dossier-mme-r' && !done.has(id)) { done.add(id); await page.waitForTimeout(1800); await page.screenshot(shot('02-dossier')); }
  if (id === '3-4' && !done.has('avant')) { done.add('avant'); await page.waitForTimeout(1800); await page.screenshot(shot('03-question')); }
  if (id === 'synthese' && !done.has(id)) {
    done.add(id);
    await page.waitForTimeout(2200);
    await page.screenshot(shot('06-synthese'));
    await page.evaluate(() => document.querySelector('.by-section, [class*=by-section]')?.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(900);
    await page.screenshot(shot('07-sections'));
  }
  if (id === 'epilogue' && !done.has(id)) { done.add(id); await page.waitForTimeout(1800); await page.screenshot(shot('08-epilogue')); break; }

  const action = await page.evaluate(() => {
    const next = document.getElementById('next');
    if (next && next.getAttribute('aria-disabled') !== 'true') { next.click(); return 'next'; }
    if (document.querySelector('.question:not(.question--answered)')) return 'question';
    const reveal = [...document.querySelectorAll('main button')].find((b) => b.offsetParent && !b.disabled && !b.closest('.question') && !b.closest('.video') && b.id !== 'next' && !/Activer|cinéma|Imprimer|Télécharger/i.test(b.textContent));
    if (reveal) { reveal.click(); return 'reveal'; }
    return 'rien';
  });

  if (action === 'question') {
    const ids = await page.evaluate(() => [...document.querySelectorAll('.question:not(.question--answered) input')].map((input) => input.id));
    const key = Object.keys(questions).find((k) => ids[0]?.startsWith(k));
    const q = questions[key];
    if (!q) throw new Error(`Question inconnue : ${ids[0]}`);
    const pick = missed.has(q.n) ? q.wrong : q.correct;
    await page.evaluate((option) => {
      document.querySelector(`.question:not(.question--answered) .option[data-option="${option}"] input`).click();
      [...document.querySelectorAll('.question button')].find((b) => /Valider/i.test(b.textContent) && b.offsetParent)?.click();
    }, pick);
    await page.waitForTimeout(500);
    if (id === '3-4' && !done.has('apres') && !missed.has(q.n)) {
      done.add('apres');
      await page.waitForTimeout(1900);
      await page.evaluate(() => document.querySelector('.feedback')?.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(400);
      await page.screenshot(shot('04-apres-reponse'));
      const sheet = page.locator('.form-sheet').first();
      await sheet.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await sheet.screenshot(shot('05-formulaire-rempli'));
    }
  }
  await page.waitForTimeout(action === 'next' ? 330 : 260);
}

const phone = await (await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
await phone.goto(URL_BASE);
await phone.waitForTimeout(2200);
await phone.screenshot(shot('09-mobile-accueil'));
await phone.click('#side-path');
await phone.waitForTimeout(1000);
await phone.screenshot(shot('10-mobile-parcours'));
await browser.close();
console.log(`Captures enregistrées dans docs/relecture-images/ (${done.size} repères atteints).`);
