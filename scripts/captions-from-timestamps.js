/**
 * Convertit une transcription horodatée (format « Afficher la transcription » de YouTube)
 * en sous-titres WebVTT, avec un fichier de chapitres en option.
 *
 * Format d'entrée : une ligne d'horodatage (m:ss ou h:mm:ss), puis la ligne de texte.
 * Une ligne de texte qui ne suit pas un horodatage est un titre de chapitre.
 *
 *   node scripts/captions-from-timestamps.js <transcription.txt> <sous-titres.vtt> <durée_vidéo_s> [chapitres.vtt]
 *
 * Chaque sous-titre dure jusqu'au suivant (au plus 6 secondes) ; le dernier jusqu'à la fin de la vidéo.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const [input, output, durationArg, chaptersOutput] = process.argv.slice(2);
if (!input || !output || !durationArg) {
  console.error('Usage : node scripts/captions-from-timestamps.js <transcription.txt> <sous-titres.vtt> <durée_vidéo_s> [chapitres.vtt]');
  process.exit(1);
}

const MAX_CUE_SECONDS = 6;
const videoEnd = Number(durationArg);
const TIMESTAMP = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/;

const toSeconds = (text) => {
  const [, h = '0', m, s] = TIMESTAMP.exec(text);
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
};

const pad = (n, size = 2) => String(n).padStart(size, '0');
const stamp = (t) => {
  const ms = Math.round(t * 1000);
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`;
};

// Typographie française : espaces insécables avant « ? ! : ; % », sans toucher aux adresses (vd.oai.ch)
const typo = (text) =>
  text
    .replace(/\s*([?!;%])/g, ' $1')
    .replace(/(\S)\s*:(\s|$)/g, '$1 :$2')
    .replace(/(\d) (?=\d)/g, '$1 ');

const cues = [];
const chapters = [];
let pending = null;
for (const raw of readFileSync(input, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line) continue;
  if (TIMESTAMP.test(line)) {
    pending = toSeconds(line);
  } else if (pending !== null) {
    cues.push({ start: pending, text: typo(line) });
    pending = null;
  } else {
    // Titre de chapitre : commence au prochain sous-titre
    chapters.push({ title: line, cueIndex: cues.length });
  }
}

cues.forEach((cue, i) => {
  const next = cues[i + 1]?.start ?? videoEnd;
  cue.end = Math.min(next, cue.start + MAX_CUE_SECONDS, videoEnd);
});

const vtt = cues.map((cue, i) => `${i + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}`).join('\n\n');
writeFileSync(output, `WEBVTT\n\nNOTE\nMinutages fournis par l'OAI (transcription horodatée).\n\n${vtt}\n`);
console.log(`${cues.length} sous-titres écrits dans ${output}`);

if (chaptersOutput) {
  const blocks = chapters.map((chapter, i) => {
    const start = cues[chapter.cueIndex]?.start ?? 0;
    const end = chapters[i + 1] ? cues[chapters[i + 1].cueIndex]?.start ?? videoEnd : videoEnd;
    return `${stamp(i === 0 ? 0 : start)} --> ${stamp(end)}\n${chapter.title}`;
  });
  writeFileSync(chaptersOutput, `WEBVTT\n\n${blocks.join('\n\n')}\n`);
  console.log(`${chapters.length} chapitres écrits dans ${chaptersOutput}`);
}
