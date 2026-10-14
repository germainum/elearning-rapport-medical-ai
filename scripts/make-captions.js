/**
 * Génère un fichier de sous-titres WebVTT à partir d'une transcription (une phrase par ligne),
 * avec des minutages ESTIMÉS au prorata de la longueur du texte.
 * Les minutages sont à vérifier en regardant la vidéo, puis à corriger à la main dans le .vtt.
 *
 *   node scripts/make-captions.js <transcription.txt> <sortie.vtt> <début_s> <fin_s>
 */

import { readFileSync, writeFileSync } from 'node:fs';

const [input, output, startArg, endArg] = process.argv.slice(2);
if (!input || !output || !startArg || !endArg) {
  console.error('Usage : node scripts/make-captions.js <transcription.txt> <sortie.vtt> <début_s> <fin_s>');
  process.exit(1);
}

const MAX_CHARS = 84; // environ deux lignes de sous-titre

// Découpe en phrases (un point suivi d'une espace : « vd.oai.ch » reste entier),
// puis chaque phrase en segments de longueur équilibrée, deux lignes maximum
const sentences = readFileSync(input, 'utf8')
  .split(/\r?\n/)
  .flatMap((line) => line.split(/(?<=[.!?])\s+/))
  .map((s) => s.trim())
  .filter(Boolean)
  // espaces insécables : ne pas couper un numéro (« 021 925 24 24 ») ni « 87 % »
  .map((s) => s.replace(/(\d) (?=\d)/g, '$1 ').replace(/ (?=[%:?!;])/g, ' '));

const cues = [];
for (const sentence of sentences) {
  const words = sentence.split(/ +/);
  const parts = Math.ceil(sentence.length / MAX_CHARS);
  const target = sentence.length / parts;
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > target + 8) {
      cues.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) cues.push(current);
}

const start = Number(startArg);
const end = Number(endArg);
const totalChars = cues.reduce((n, cue) => n + cue.length, 0);
const pad = (n, size = 2) => String(n).padStart(size, '0');
const stamp = (t) => {
  const ms = Math.round(t * 1000);
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`;
};

// Deux lignes équilibrées par sous-titre
const wrap = (text) => {
  if (text.length <= 42) return text;
  const words = text.split(' ');
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (diff < bestDiff) [best, bestDiff] = [i, diff];
  }
  return `${words.slice(0, best).join(' ')}\n${words.slice(best).join(' ')}`;
};

let t = start;
const blocks = cues.map((cue, i) => {
  const duration = ((end - start) * cue.length) / totalChars;
  const block = `${i + 1}\n${stamp(t)} --> ${stamp(t + duration)}\n${wrap(cue)}`;
  t += duration;
  return block;
});

writeFileSync(
  output,
  `WEBVTT\n\nNOTE\nMinutages estimés automatiquement à partir de la transcription : à vérifier en regardant la vidéo.\n\n${blocks.join('\n\n')}\n`,
);
console.log(`${cues.length} sous-titres écrits dans ${output}`);
