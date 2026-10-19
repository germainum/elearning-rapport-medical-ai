/**
 * Exporte le contenu du module pour en faire une version Articulate Rise 360.
 *
 *   node scripts/export-rise.js          (ou : npm run export:rise)
 *
 * Lit content/module.json (texte, intitulés exacts du formulaire, questions, feedbacks, glossaire) et
 * docs/rise/exemples-remplis.json (réponses modèles), puis écrit dans docs/rise/ :
 *   lecons/NN-*.md      une leçon Rise par fichier, bloc par bloc, dans l'ordre de création
 *   glossaire.md        le glossaire (leçon facultative)
 *   evaluation-finale.md  les questions de la leçon « Quiz » notée
 *
 * Les fichiers rédigés à la main (prompt, plan du cours, fichiers à téléverser) ne sont pas touchés.
 * Ne pas modifier les fichiers générés : modifier module.json ou ce script, puis relancer.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'docs/rise');
const module = JSON.parse(readFileSync(resolve(root, 'content/module.json'), 'utf8'));
const examples = JSON.parse(readFileSync(resolve(out, 'exemples-remplis.json'), 'utf8'));
const screens = new Map(module.screens.map((screen) => [screen.id, screen]));
const screen = (id) => {
  if (!screens.has(id)) throw new Error(`Écran introuvable : ${id}`);
  return screens.get(id);
};

/* ---------- Choix pédagogiques propres à la version Rise ---------- */

// Questions notées, regroupées dans une leçon « Quiz » finale (Rise ne note que les leçons Quiz).
// Ce sont les points clés (3 piliers + transfert sur un autre cas) : dans les leçons, ils sont enseignés
// par un exemple rempli, puis évalués ici. Les autres questions sont des exercices de pratique non notés.
const QUIZ = ['q1-3', 'q2-4', 'q2-5', 'q2-7', 'q3-3', 'q3-4', 'q4-2', 'q4-3', 'qexigibles', 'qreinsertion', 'qmc-limitations', 'qmc-contexte'];

const CONTEXT = {
  mme: "Mme R., 47 ans, aide-soignante en EMS à 80 %, opérée d'une hernie discale L5-S1 le 10.02.2026, en arrêt de travail à 100 % depuis le 12.01.2026.",
  mc: "M. C., 46 ans, menuisier et chef d'équipe (7 personnes), arthrose du poignet droit et épicondylite chronique à droite, état dépressif réactionnel, divorce difficile depuis 8 mois.",
};

const OBJECTIVES = [
  'décrire des **diagnostics précis, datés et codés (CIM-10)**, en séparant ceux qui ont une incidence sur la capacité de travail de ceux qui n\'en ont pas ;',
  'formuler des **limitations fonctionnelles mesurables** (ce que la personne ne peut plus faire), sans répéter le diagnostic ;',
  'chiffrer **deux capacités de travail distinctes**, en heures par jour et sur un 100 %, et un pronostic avec taux et délai ;',
  'éviter les erreurs qui provoquent des demandes de complément et des allers-retours avec l\'Office AI.',
];

const LESSONS = [
  { file: '01-bienvenue', title: 'Votre rapport, pièce maîtresse du dossier AI', section: 'Avant de commencer', kind: 'bienvenue' },
  { file: '02-courrier', title: "Un courrier de l'Office AI", section: 'Avant de commencer', kind: 'courrier' },
  { file: '03-section-1', title: 'Section 1 · Informations générales', section: 'Section 1', screens: ['1-1', '1-2', '1-3'] },
  { file: '04-section-2a', title: 'Section 2 · Antécédents, symptômes, médication et constats', section: 'Section 2', screens: ['2-1', '2-2', '2-3', '2-4'] },
  { file: '05-section-2b', title: 'Section 2 · Diagnostics, pronostic et plan de traitement', section: 'Section 2', screens: ['2-5', '2-6', '2-7', '2-8'] },
  { file: '06-section-3a', title: 'Section 3 · La situation professionnelle', section: 'Section 3', screens: ['3-1', '3-2', '3-3'] },
  { file: '07-section-3b', title: 'Section 3 · Limitations, ressources et conduite', section: 'Section 3', screens: ['3-4', '3-5', '3-6'] },
  { file: '08-section-4', title: 'Section 4 · Potentiel de réadaptation', section: 'Section 4', screens: ['4-1', '4-2', '4-3', '4-4', '4-5'] },
  { file: '09-section-5-annexes', title: 'Section 5 et annexes', section: 'Section 5 et annexes', screens: ['5', 'annexes', 'exigibles', 'reinsertion', 'amelioration'] },
  { file: '10-second-cas', title: 'Second cas : M. C.', section: 'Second cas', kind: 'second-cas' },
  { file: '11-en-pratique', title: 'En pratique', section: 'En pratique', screens: ['envoi', 'secret', 'detection'] },
  { file: '12-retenir', title: "Ce qu'il faut retenir", section: 'Conclusion', kind: 'retenir' },
  { file: '13-merci', title: 'Merci', section: 'Conclusion', kind: 'merci' },
];

/* ---------- Utilitaires ---------- */

const arr = (value) => [].concat(value ?? []);
const text = (value) => arr(value).join('\n\n');
const trunc = (value, n) => (value.length > n ? `${value.slice(0, n - 1).trimEnd()}…` : value);
const normalizeFeedback = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? { title: value.title, body: value.body } : { title: null, body: value };
const bold = (value) => (value ? `**${value}**` : '');
const quote = (value) => text(value).split('\n').map((line) => `> ${line}`.trimEnd()).join('\n');
const isProvisional = (line) => /^\*Contenu provisoire/.test(line);
const questionsOf = (s) => (s.blocks ?? []).filter((block) => block.type === 'question');
const allQuestions = module.screens.flatMap((s) => questionsOf(s).map((q) => ({ question: q, screen: s })));

/** Numérote les blocs d'une leçon. */
function lesson() {
  let n = 0;
  const parts = [];
  return {
    add(label, body = '') {
      n += 1;
      parts.push(`## Bloc ${n} · ${label}\n\n${body}`.trimEnd());
    },
    toString: () => parts.join('\n\n'),
  };
}

const imageMd = (image, caption) =>
  `Fichier : \`content/images/${image.src.replace('images/', '')}\`\nTexte alternatif (à saisir) : ${image.alt}${caption ? `\nLégende : ${caption}` : ''}`;

/** Dossier médical (patientFile ou document « dossier ») sous forme de texte à copier dans un accordéon. */
function recordMd(file) {
  const parts = [`**${file.title}**${file.subtitle ? ` — ${file.subtitle}` : ''}`];
  if (file.reference) parts.push(`*${file.reference}*`);
  if (file.body) parts.push(`**Notes** : ${text(file.body)}`);
  const rows = (data) => data.map((row) => `- ${row.label} : ${row.value}`).join('\n');
  if (file.data?.length) parts.push(`**Renseignements**\n${rows(file.data)}`);
  for (const section of file.sections ?? []) parts.push(`**${section.title}**\n${rows(section.data)}`);
  if (file.journal?.length) parts.push(`**Journal des consultations**\n${file.journal.map((e) => `- ${e.date} : ${e.text}`).join('\n')}`);
  return parts.join('\n\n');
}

/** Question à choix unique : intitulé, réponses, retours. */
function questionMd(question, { stemPrefix = '' } = {}) {
  const correct = normalizeFeedback(question.feedback?.correct);
  const wrong = normalizeFeedback(question.feedback?.incorrect);
  const notes = question.options.filter((option) => !option.correct && option.feedback);
  const wrongText = [
    wrong.title ? bold(wrong.title) : '',
    text(wrong.body),
    notes.length ? `À propos des réponses écartées :\n${notes.map((o) => `- « ${trunc(o.text, 90)} » : ${o.feedback}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  const correctText = [correct.title ? bold(correct.title) : '', text(correct.body)].filter(Boolean).join('\n\n');
  const options = question.options.map((option, i) => `${i + 1}. ${option.text}${option.correct ? '  ✅ **BONNE RÉPONSE**' : ''}`).join('\n');
  return [
    `**Question** : ${stemPrefix}${question.prompt}`,
    `**Réponses** (une seule bonne réponse ; activer « mélanger les réponses » si l'option existe) :\n${options}`,
    `**Retour si bonne réponse** :\n${quote(correctText)}`,
    `**Retour si mauvaise réponse** (un seul texte pour toutes les mauvaises réponses dans Rise) :\n${quote(wrongText)}`,
  ].join('\n\n');
}

/** Élément principal du formulaire d'un écran « point ». */
function formItemOf(s) {
  const form = s.blocks.find((block) => block.type === 'form');
  const items = form.items.filter((item) => item.label && item.field !== false);
  return { form, section: form.items.find((item) => item.section)?.section, item: items.find((i) => i.number) ?? items[0], info: form.items.filter((i) => i.label && i.field === false) };
}

function formNoteMd(s) {
  const { form, section, item, info } = formItemOf(s);
  const header = `${form.title ?? module.form.title} — ${module.form.reference}${section ? `\n${section}` : ''}`;
  const lines = [`*${header.replace('\n', ' · ')}*`];
  for (const i of info) lines.push(i.label);
  lines.push(`**${item.number ? `${item.number} ` : ''}${item.label}**`);
  if (item.details) lines.push(arr(item.details).join('\n'));
  return lines.join('\n\n');
}

/* ---------- Leçons ---------- */

function bienvenue() {
  const s = screen('introduction');
  const b = lesson();
  b.add('Vidéo', `Fichier vidéo : \`content/videos/${s.video.src.replace('videos/', '')}\` (${s.video.duration})\nSous-titres (.vtt) : \`content/videos/${s.video.captions.replace('videos/', '')}\` (langue : français)\nTitre : ${s.video.title}\n\n*Rise ne permet pas de démarrer la vidéo à la 8ᵉ seconde ni de la lancer automatiquement : voir le plan du cours.*`);
  b.add('Accordéon « Lire la transcription »', `Un seul élément, titre « Transcription de la vidéo », contenu :\n\n${text(s.video.transcript)}`);
  b.add('Texte (paragraphes)', s.body.filter((line) => !isProvisional(line)).join('\n\n'));
  b.add('Texte : objectifs', `**À la fin de cette formation, vous saurez :**\n\n${OBJECTIVES.map((o) => `- ${o}`).join('\n')}`);
  b.add(`Processus (« ${s.journey.title} »)`, s.journey.steps.map((step, i) => `${i + 1}. **${step.label}** — ${step.text}`).join('\n'));
  return { title: s.title, body: b.toString() };
}

function courrier() {
  const s = screen('courrier');
  const letter = s.blocks.find((block) => block.type === 'document');
  const attachment = s.blocks.find((block) => block.type === 'attachment');
  const intro = s.blocks.find((block) => block.type === 'text');
  const b = lesson();
  b.add('Image (pleine largeur)', imageMd(intro.image));
  b.add('Texte', text(intro.body));
  b.add(
    'Déclaration, style « Note » (la lettre reçue)',
    quote(
      [
        `**${letter.title}**\n${arr(letter.sender).join('\n')}`,
        arr(letter.recipient).join('\n'),
        letter.date,
        `**${letter.subtitle}**`,
        text(letter.body),
        `${arr(letter.signature).join('\n')}`,
        `*${text(letter.enclosures)}*`,
      ].join('\n\n'),
    ),
  );
  b.add(
    'Pièce jointe',
    `Fichier : \`content/documents/${attachment.src.replace('documents/', '')}\`\nTitre : ${attachment.title}\nDescription : ${attachment.meta}\nTexte du bouton : ${attachment.label}`,
  );
  b.add('Accordéon « Dossier patient »', `Un seul élément, titre « Dossier de Mme R. », contenu :\n\n${recordMd(module.patientFile)}\n\nImage à placer dans l'élément : \`content/images/mme-r.jpg\`\nTexte alternatif : ${module.patientFile.image.alt}`);
  const q = questionsOf(s)[0];
  b.add('Contrôle des connaissances · Choix multiple (non noté)', questionMd(q));
  return { title: s.title, body: b.toString() };
}

/** Écran « point du formulaire » : intro éventuelle, extrait du formulaire, puis exercice de pratique ou exemple rempli. */
function pointBlocks(b, s) {
  const q = questionsOf(s)[0];
  const inQuiz = QUIZ.includes(q.id);
  b.add('Titre', `${s.title}\n\n*${s.kicker}*`);
  for (const block of s.blocks.filter((x) => x.type === 'text')) {
    b.add(block.image ? 'Texte + image' : 'Texte', `${text(block.body)}${block.image ? `\n\n${imageMd(block.image)}` : ''}`);
  }
  if (s.blocks.some((block) => block.type === 'form')) b.add('Déclaration, style « Note » (extrait du formulaire 002.099)', formNoteMd(s));
  if (inQuiz) {
    const example = examples[s.id] ?? [];
    const correct = normalizeFeedback(q.feedback?.correct);
    b.add(
      'Texte : règle à retenir',
      [correct.title ? bold(correct.title) : '', text(correct.body)].filter(Boolean).join('\n\n'),
    );
    b.add(
      'Texte : exemple rempli pour Mme R.',
      example.map((e) => `${e.number ? `**${e.number}**` : ''} ${text(e.answer)}`.trim()).join('\n\n') || '*(pas d\'exemple)*',
    );
    b.add('Déclaration, style « Note »', '**À vous de jouer** : une question sur ce point figure dans l\'évaluation finale.');
  } else {
    b.add('Contrôle des connaissances · Choix multiple (non noté)', questionMd(q));
  }
}

function pointLesson(def) {
  const b = lesson();
  // Les écrans « En pratique » ne concernent plus Mme R. : pas de rappel de son dossier
  if (!screen(def.screens[0]).hidePatientFile) {
    b.add('Accordéon « Rappel du dossier »', `Un seul élément, titre « 📁 Dossier de Mme R. (rappel) », même contenu que dans la leçon « Un courrier de l'Office AI ».\n\n*Dans Rise, copier le bloc depuis la leçon 2 (menu du bloc) ; sinon le recréer à partir de \`docs/rise/lecons/02-courrier.md\`.*`);
  }
  for (const id of def.screens) pointBlocks(b, screen(id));
  return { title: def.title, body: b.toString() };
}

function secondCas() {
  const limits = screen('mc-limitations');
  const doc = limits.blocks.find((block) => block.type === 'document');
  const b = lesson();
  b.add('Titre', 'Second cas : séparer le médical du psychosocial');
  b.add('Texte', `${text(screen('mc-contexte').blocks.find((x) => x.type === 'text').body)}\n\n${text(limits.blocks.find((x) => x.type === 'text').body)}`);
  b.add('Image', `${imageMd(doc.image)}\n\n*Texte alternatif à saisir tel quel (le portrait n'est plus décoratif).*`);
  b.add('Accordéon « Dossier patient »', `Un seul élément, titre « Dossier de M. C. », contenu :\n\n${recordMd(doc)}`);
  b.add(
    'Texte : les principes à appliquer',
    [
      '- Décrivez ce que M. C. **ne peut plus faire** (gestes, durées, charges), pas ses symptômes ni sa situation de vie.',
      "- Le **contexte psychosocial** a sa place dans l'anamnèse (question 2.1) quand il éclaire l'atteinte à la santé, mais il ne fonde ni les limitations ni la capacité de travail.",
      "- Une contrainte personnelle (garde des enfants, trajets) n'est pas une limitation liée à la santé.",
    ].join('\n'),
  );
  b.add('Déclaration, style « Note »', "**À vous de jouer** : deux questions sur M. C. figurent dans l'évaluation finale (limitations, puis contexte psychosocial).");
  return { title: 'Second cas : M. C.', body: b.toString() };
}

function retenir() {
  const s = screen('synthese');
  const b = lesson();
  b.add('Titre', s.title);
  b.add('Liste numérotée', s.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n'));
  b.add('Texte', text(s.body));
  return { title: s.title, body: b.toString() };
}

function merci() {
  const s = screen('merci');
  const b = lesson();
  b.add('Image', imageMd(s.image));
  b.add('Titre', s.title);
  b.add('Texte', text(s.body));
  return { title: s.title, body: b.toString() };
}

/* ---------- Évaluation finale (leçon Quiz notée) ---------- */

function evaluation() {
  const lines = [
    '# Évaluation finale — leçon « Quiz » notée\n',
    `> Leçon de type **Quiz** (la seule qui produit une note dans Rise). ${QUIZ.length} questions à choix multiple, une seule bonne réponse chacune.`,
    '> Réglages : seuil de réussite **70 %**, nouvelles tentatives autorisées (illimitées), retour affiché après chaque question,',
    '> questions et réponses dans un ordre aléatoire, résultats affichés à la fin.',
    '',
    "Chaque intitulé reprend, en tête, le **contexte du cas** et l'**extrait du formulaire** : le quiz est autonome (pas de dossier patient affiché).\n",
  ];
  QUIZ.forEach((id, i) => {
    const entry = allQuestions.find((x) => x.question.id === id);
    if (!entry) throw new Error(`Question introuvable : ${id}`);
    const { item } = formItemOf(entry.screen);
    const context = entry.screen.section?.startsWith('Second cas') ? CONTEXT.mc : CONTEXT.mme;
    const prefix = `${context}\n\nExtrait du formulaire — **${item.number ? `${item.number} ` : ''}${item.label}**\n\n`;
    lines.push(`## Question ${i + 1} sur ${QUIZ.length}\n\n${questionMd(entry.question, { stemPrefix: prefix })}\n`);
  });
  return lines.join('\n');
}

/* ---------- Glossaire ---------- */

function glossaire() {
  const g = module.glossary;
  const lines = [
    `# Glossaire — leçon facultative\n`,
    `> Une leçon « ${g.title} » placée juste après la leçon d'accueil, consultable à tout moment depuis le sommaire (navigation libre).`,
    `> Pour chaque rubrique : un bloc **Titre**, puis un bloc **Accordéon** (un élément par terme : titre = terme, contenu = définition).`,
    `> ${g.sections.reduce((n, section) => n + section.terms.length, 0)} termes. Source : ${g.source}\n`,
  ];
  let n = 0;
  for (const section of g.sections) {
    n += 1;
    lines.push(`## Bloc ${2 * n - 1} · Titre\n\n${section.title}\n`);
    lines.push(`## Bloc ${2 * n} · Accordéon (${section.terms.length} éléments)\n`);
    for (const term of section.terms) lines.push(`### ${term.term}\n\n${term.definition}\n`);
  }
  return lines.join('\n');
}

/* ---------- Écriture ---------- */

mkdirSync(resolve(out, 'lecons'), { recursive: true });

const builders = { bienvenue, courrier, 'second-cas': secondCas, retenir, merci };
let count = 0;
for (const def of LESSONS) {
  const { title, body } = def.kind ? builders[def.kind]() : pointLesson(def);
  const header = `# Leçon ${def.file.slice(0, 2)} — ${title}\n\n> Section du sommaire : **${def.section}** · Type : **leçon de contenu** · Contenu généré depuis \`content/module.json\` : ne pas modifier ce fichier à la main.\n> Les blocs sont à créer **dans cet ordre**. La mise en forme légère du texte (**gras**, *italique*, listes « - » ou « 1. ») s'applique avec l'éditeur de Rise : ne pas taper les astérisques.\n\n`;
  writeFileSync(resolve(out, 'lecons', `${def.file}.md`), `${header}${body}\n`);
  count += 1;
}
writeFileSync(resolve(out, 'evaluation-finale.md'), `${evaluation()}\n`);
writeFileSync(resolve(out, 'glossaire.md'), `${glossaire()}\n`);

/* Tableau des leçons du plan du cours (entre les repères LECONS:DEBUT et LECONS:FIN) */
const countBlocks = (markdown) => (markdown.match(/^## Bloc /gm) ?? []).length;
const countPractice = (markdown) => (markdown.match(/Contrôle des connaissances/g) ?? []).length;
const read = (path) => readFileSync(resolve(out, path), 'utf8');
const lessonRow = (def) => {
  const md = read(`lecons/${def.file}.md`);
  return { section: def.section, title: def.title, file: `lecons/${def.file}.md`, blocks: countBlocks(md), practice: countPractice(md) };
};
const byFile = Object.fromEntries(LESSONS.map((def) => [def.file, lessonRow(def)]));
const glossaryMd = read('glossaire.md');
const order = [
  { header: 'Avant de commencer' },
  byFile['01-bienvenue'],
  { section: 'Avant de commencer', title: 'Glossaire (leçon facultative)', file: 'glossaire.md', blocks: countBlocks(glossaryMd), practice: 0 },
  byFile['02-courrier'],
  { header: 'Section 1 · Informations générales' },
  byFile['03-section-1'],
  { header: 'Section 2 · Situation médicale' },
  byFile['04-section-2a'],
  byFile['05-section-2b'],
  { header: 'Section 3 · Situation professionnelle' },
  byFile['06-section-3a'],
  byFile['07-section-3b'],
  { header: 'Section 4 · Potentiel de réadaptation' },
  byFile['08-section-4'],
  { header: 'Section 5 et annexes' },
  byFile['09-section-5-annexes'],
  { header: 'Second cas' },
  byFile['10-second-cas'],
  { header: 'En pratique' },
  byFile['11-en-pratique'],
  { header: 'Évaluation' },
  { title: 'Évaluation finale (leçon Quiz notée)', file: 'evaluation-finale.md', blocks: `${QUIZ.length} questions`, practice: 0 },
  { header: 'Conclusion' },
  byFile['12-retenir'],
  byFile['13-merci'],
];
let leçonNo = 0;
const rows = ['| N° | Leçon Rise | Fichier de contenu | Blocs | Pratique |', '|---|---|---|---|---|'];
for (const entry of order) {
  if (entry.header) rows.push(`| | **${entry.header}** | | | |`);
  else {
    leçonNo += 1;
    rows.push(`| ${leçonNo} | ${entry.title} | \`${entry.file}\` | ${entry.blocks} | ${entry.practice || ''} |`);
  }
}
const planPath = resolve(out, '01-plan-du-cours.md');
const plan = readFileSync(planPath, 'utf8');
const markers = /<!-- LECONS:DEBUT -->[\s\S]*?<!-- LECONS:FIN -->/;
if (!markers.test(plan)) throw new Error('Repères LECONS:DEBUT / LECONS:FIN introuvables dans 01-plan-du-cours.md');
writeFileSync(planPath, plan.replace(markers, () => `<!-- LECONS:DEBUT -->\n${rows.join('\n')}\n<!-- LECONS:FIN -->`));

const practice = allQuestions.filter((x) => !QUIZ.includes(x.question.id)).length;
console.log(`Rise : ${count} leçons, ${QUIZ.length} questions notées, ${practice} exercices de pratique, glossaire de ${module.glossary.sections.reduce((n, s) => n + s.terms.length, 0)} termes.`);
