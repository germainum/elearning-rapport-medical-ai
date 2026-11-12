/**
 * Génère le document Word de relecture : tout le contenu du module, écran par écran, avec un cadre « Votre avis » par écran
 * et un formulaire de retours généraux. Destiné aux relecteurs de l'office AI avant publication.
 *
 *   npm install --no-save docx                # une seule fois (outil de génération, pas une dépendance du module)
 *   node scripts/export-relecture.js          # → docs/relecture-elearning-v<version>.docx
 *   node scripts/export-relecture.js --review-url=https://…   # ajoute le lien de la version de relecture (commentaires dans l'interface)
 *
 * Les captures d'écran viennent de docs/relecture-images/ (voir scripts/capture-relecture.js pour les refaire).
 * Le contenu est lu dans content/module.json : relancer ce script après chaque changement de contenu.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { CONTENT_DIR, ROOT } from './validate.js';

const require = createRequire(import.meta.url);
let docx;
try {
  docx = require('docx');
} catch {
  console.error('Ce script a besoin du paquet « docx » : lancez « npm install --no-save docx » puis relancez-le.');
  process.exit(1);
}
const {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, Header, HeadingLevel, ImageRun, LevelFormat, Packer, PageNumber,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} = docx;

const module = JSON.parse(readFileSync(join(CONTENT_DIR, 'module.json'), 'utf8'));
const reviewUrl = process.argv.find((arg) => arg.startsWith('--review-url='))?.split('=').slice(1).join('=');
const IMAGES_DIR = join(ROOT, 'docs', 'relecture-images');
const PAGES_URL = 'https://germainum.github.io/elearning-rapport-medical-ai/';

/* ---------- Données du module ---------- */

const screens = module.screens;
const questionsOf = (screen) => (screen.type === 'scene' ? screen.blocks.filter((block) => block.type === 'question') : []);
const questionCount = screens.reduce((total, screen) => total + questionsOf(screen).length, 0);
const reportAnswerCount = screens.reduce((total, screen) => total + questionsOf(screen).filter((q) => q.reportAnswer).length, 0);
const passingScore = module.scoring?.passingScore ?? 80;
const today = new Date().toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });

/* ---------- Mise en forme ---------- */

const COLORS = { navy: '0F1D96', green: '007A20', text: '1F2330', muted: '5A6070', label: 'F2F3F7', labelText: '4A4F5C', line: 'C9CDD8', yellow: 'FFF7D6', yellowLabel: 'FCEFB4', yellowLine: 'E3CF7A', blue: '0F1D96', ok: '1D6B3B' };
const PAGE = { width: 11906, height: 16838, margin: 1134 };
const CONTENT_WIDTH = PAGE.width - 2 * PAGE.margin; // 9638 DXA
const LABEL_WIDTH = 2300;

const plain = (text) => String(text ?? '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*?/g, '');
const fill = (text) =>
  String(text ?? '')
    .replaceAll('{today}', '(date du jour de lecture, calculée automatiquement)')
    .replaceAll('{minutes}', String(module.durationMinutes))
    .replaceAll('{questions}', String(questionCount));

/** Texte du module (gras, italique, liens) → morceaux de paragraphe. */
function runs(text, base = {}) {
  const result = [];
  for (const part of fill(text).split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\*[^*\s][^*]*\*)/)) {
    if (!part) continue;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      result.push(new ExternalHyperlink({ link: link[2], children: [new TextRun({ ...base, text: `${link[1]} (${link[2].replace(/^mailto:/, '')})`, color: COLORS.navy, underline: {} })] }));
    } else if (part.startsWith('**')) result.push(new TextRun({ ...base, text: part.slice(2, -2), bold: true }));
    else if (/^\*[^*]/.test(part)) result.push(new TextRun({ ...base, text: part.slice(1, -1), italics: true }));
    else result.push(new TextRun({ ...base, text: part }));
  }
  return result;
}

function para(content, options = {}) {
  const { size = 20, color = COLORS.text, bold, italics, after = 80, before = 0, bullet, keepNext, align, indent, line = 276 } = options;
  const base = { size, color, bold, italics, font: 'Calibri' };
  return new Paragraph({
    children: typeof content === 'string' ? runs(content, base) : content,
    spacing: { after, before, line },
    keepNext,
    alignment: align,
    indent,
    ...(bullet ? { numbering: { reference: 'bullets', level: 0 } } : {}),
  });
}

const cellBorders = (color = COLORS.line) => {
  const side = { style: BorderStyle.SINGLE, size: 4, color };
  return { top: side, bottom: side, left: side, right: side };
};

function cell(children, { width, fillColor, valign = VerticalAlign.TOP, color = COLORS.line, span } = {}) {
  const content = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return new TableCell({
    children: content.length ? content : [new Paragraph({ children: [] })],
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders(color),
    shading: fillColor ? { type: ShadingType.CLEAR, fill: fillColor, color: 'auto' } : undefined,
    margins: { top: 70, bottom: 70, left: 120, right: 120 },
    verticalAlign: valign,
    columnSpan: span,
  });
}

const label = (text, fillColor = COLORS.label) => ({ text, fillColor });

/** Tableau « libellé | contenu » : le contenu est un texte, une liste de textes ou des paragraphes. */
function kvTable(rows, { labelFill = COLORS.label, line = COLORS.line, labelWidth = LABEL_WIDTH } = {}) {
  const valueWidth = CONTENT_WIDTH - labelWidth;
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [labelWidth, valueWidth],
    rows: rows.map(
      ([name, content, options = {}]) =>
        new TableRow({
          cantSplit: options.cantSplit ?? true,
          height: options.height ? { value: options.height, rule: 'atLeast' } : undefined,
          children: [
            cell(para(name, { size: 17, bold: true, color: COLORS.labelText, after: 0 }), { width: labelWidth, fillColor: labelFill, color: line }),
            cell(
              Array.isArray(content) && content[0] instanceof Paragraph ? content : (Array.isArray(content) ? content : [content]).map((item) => (item instanceof Paragraph ? item : para(item, { after: 60 }))),
              { width: valueWidth, color: line },
            ),
          ],
        }),
    ),
  });
}

const spacer = (after = 160) => new Paragraph({ children: [], spacing: { after, before: 0 } });

const CHECK = (text) => new TextRun({ text: `☐ ${text}`, size: 19, font: 'Segoe UI Symbol', color: COLORS.text });

/** Cadre jaune « Votre avis » sous chaque écran. */
function avisTable() {
  const valueWidth = CONTENT_WIDTH - LABEL_WIDTH;
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [LABEL_WIDTH, valueWidth],
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          cell(para('Votre avis', { size: 17, bold: true, color: COLORS.labelText, after: 0 }), { width: LABEL_WIDTH, fillColor: COLORS.yellowLabel, color: COLORS.yellowLine }),
          cell(
            new Paragraph({ children: [CHECK('Rien à changer'), new TextRun({ text: '     ' }), CHECK('À modifier'), new TextRun({ text: '     ' }), CHECK('À supprimer ou déplacer')], spacing: { after: 0 } }),
            { width: valueWidth, fillColor: COLORS.yellow, color: COLORS.yellowLine },
          ),
        ],
      }),
      new TableRow({
        cantSplit: true,
        height: { value: 760, rule: 'atLeast' },
        children: [
          cell(para('Commentaire', { size: 17, bold: true, color: COLORS.labelText, after: 0 }), { width: LABEL_WIDTH, fillColor: COLORS.yellowLabel, color: COLORS.yellowLine }),
          cell(para('', { after: 0 }), { width: valueWidth, fillColor: COLORS.yellow, color: COLORS.yellowLine }),
        ],
      }),
    ],
  });
}

function box(titleText, height = 1300) {
  return [
    para(titleText, { bold: true, color: COLORS.navy, size: 22, before: 200, after: 80, keepNext: true }),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [CONTENT_WIDTH],
      rows: [new TableRow({ cantSplit: true, height: { value: height, rule: 'atLeast' }, children: [cell(para('', { after: 0 }), { width: CONTENT_WIDTH, fillColor: COLORS.yellow, color: COLORS.yellowLine })] })],
    }),
  ];
}

const h1 = (text, pageBreak = true) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: 'Calibri' })], pageBreakBefore: pageBreak, spacing: { before: 0, after: 160 }, keepNext: true });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: 'Calibri' })], spacing: { before: 240, after: 100 }, keepNext: true });

/* ---------- Images ---------- */

function jpegSize(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    offset += 2 + length;
  }
  throw new Error('Taille JPEG illisible.');
}

function picture(file, maxWidth, alt) {
  const path = join(IMAGES_DIR, file);
  if (!existsSync(path)) return null;
  const data = readFileSync(path);
  const { width, height } = jpegSize(data);
  const w = Math.min(maxWidth, width);
  return new ImageRun({ type: 'jpg', data, transformation: { width: w, height: Math.round((w * height) / width) }, altText: { title: alt, description: alt, name: file } });
}

const figure = (file, caption, maxWidth = 600) => {
  const image = picture(file, maxWidth, caption);
  if (!image) return [];
  return [
    new Paragraph({ children: [image], alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 }, keepNext: true }),
    para(caption, { size: 17, italics: true, color: COLORS.muted, align: AlignmentType.CENTER, after: 200 }),
  ];
};

/* ---------- Contenu d'un écran ---------- */

const feedbackParts = (value) => {
  if (value === undefined || value === null) return { title: '', body: [] };
  if (typeof value === 'string') return { title: '', body: [value] };
  return { title: value.title ?? '', body: [].concat(value.body ?? []) };
};
const feedbackParagraphs = (value) => {
  const { title, body } = feedbackParts(value);
  return [...(title ? [para(`**${title}**`, { after: 40 })] : []), ...body.map((line) => para(line, { after: 60 }))];
};

function formRows(block) {
  const lines = [];
  for (const item of block.items ?? []) {
    if (item.section) lines.push(para(`**${item.section}**`, { size: 19, before: 40, after: 40, color: COLORS.labelText }));
    else {
      lines.push(para(`**${item.number}**  ${item.label}`, { size: 19, after: 30 }));
      // « details » est une liste, ou un seul texte ; certains commencent déjà par la case ☐
      for (const detail of [].concat(item.details ?? [])) {
        lines.push(para(String(detail).startsWith('☐') ? detail : `☐ ${detail}`, { size: 18, color: COLORS.muted, after: 20, indent: { left: 200 } }));
      }
    }
  }
  return lines;
}

function questionRows(question, number) {
  const rows = [];
  const hidden = question.hidePrompt ? ' (énoncé masqué à l’écran, lu par les lecteurs d’écran)' : '';
  rows.push(['Question', [para(`${question.prompt}${hidden}`, { after: 40 })]]);
  const letters = 'ABCDEFGH';
  const answers = [];
  question.options.forEach((option, index) => {
    const head = [
      ...(option.correct ? [new TextRun({ text: '✔ ', bold: true, size: 20, color: COLORS.ok, font: 'Segoe UI Symbol' })] : []),
      new TextRun({ text: `${letters[index]}. `, bold: true, size: 20, color: COLORS.text, font: 'Calibri' }),
      ...runs(option.text, { size: 20, color: COLORS.text, font: 'Calibri' }),
    ];
    answers.push(new Paragraph({ children: head, spacing: { after: 20, before: 40 } }));
    if (option.feedback) answers.push(para(`→ ${option.feedback}`, { size: 18, italics: true, color: COLORS.muted, indent: { left: 280 }, after: 40 }));
  });
  rows.push([question.kind === 'multiple' ? 'Réponses (✔ = bonnes réponses)' : 'Réponses (✔ = bonne réponse)', answers, { cantSplit: false }]);
  if (question.reportAnswer) {
    rows.push(['Réponse modèle écrite dans le formulaire', (Array.isArray(question.reportAnswer) ? question.reportAnswer : [question.reportAnswer]).map((line) => para(line, { color: COLORS.blue, after: 40 }))]);
  }
  const correct = feedbackParagraphs(question.feedback?.correct);
  if (correct.length) rows.push(['Retour si bonne réponse', correct]);
  const wrong = feedbackParagraphs(question.feedback?.incorrect);
  if (wrong.length) rows.push(['Retour si mauvaise réponse', wrong]);
  return rows;
}

function documentRows(block) {
  if (block.kind === 'courrier') {
    const lines = [
      para([block.title, ...[].concat(block.sender ?? [])].join(' · '), { size: 18, color: COLORS.muted, after: 40 }),
      para(`À : ${[].concat(block.recipient ?? []).join(', ')}`, { size: 18, color: COLORS.muted, after: 40 }),
      para(`${block.date ?? ''}`, { size: 18, color: COLORS.muted, after: 80 }),
      block.subtitle ? para(`**${block.subtitle}**`, { after: 80 }) : null,
      ...[].concat(block.body ?? []).map((line) => para(line, { after: 80 })),
      block.signature ? para(block.signature, { italics: true, color: COLORS.muted, size: 18, after: 40 }) : null,
      ...[].concat(block.enclosures ?? []).map((item) => para(item, { size: 18, color: COLORS.muted, after: 20 })),
    ].filter(Boolean);
    return [['Courrier reçu', lines]];
  }
  return [[`Dossier de ${plain(block.title)}`, [para(`${block.title} · ${block.subtitle ?? ''} : voir l’annexe en fin de document.`, { after: 40 })]]];
}

function sceneRows(screen) {
  const rows = [];
  let firstText = true;
  let questionNumber = 0;
  for (const block of screen.blocks) {
    switch (block.type) {
      case 'text':
        rows.push([firstText ? 'Accroche ou texte' : 'Texte', [].concat(block.body ?? []).map((line) => para(line, { after: 60 }))]);
        if (block.image?.alt) rows.push(['Illustration', [para(block.image.alt, { color: COLORS.muted, italics: true })]]);
        firstText = false;
        break;
      case 'document':
        rows.push(...documentRows(block));
        break;
      case 'attachment':
        rows.push(['Pièce jointe', [para(`${block.title} (${block.meta ?? 'PDF'})`)]]);
        if (block.label) rows.push(['Bouton de la pièce jointe', [para(block.label)]]);
        break;
      case 'patientFile':
        rows.push(['Dossier du patient', [para('Dossier de Mme R. : voir l’annexe en fin de document.')]]);
        break;
      case 'form':
        rows.push(['Extrait du formulaire 002.099 affiché', formRows(block), { cantSplit: false }]);
        break;
      case 'question':
        questionNumber += 1;
        rows.push(...questionRows(block, questionNumber));
        break;
      case 'reveal':
        rows.push(['Bouton d’action', [para(block.label)]]);
        break;
      case 'callout':
        rows.push([block.title ?? 'À retenir', [].concat(block.body ?? []).map((line) => para(line))]);
        break;
      case 'writing':
        rows.push(['Exercice de rédaction (non noté)', [para(block.prompt)]]);
        break;
      default:
    }
  }
  if (screen.tip) rows.push(['Astuce (affichée une seule fois)', [para(`**${screen.tip.title}**`, { after: 40 }), para(screen.tip.body, { after: 40 })]]);
  if (screen.dossierFocus?.length) rows.push(['Le dossier s’ouvre sur', [para(screen.dossierFocus.join(' · '), { color: COLORS.muted })]]);
  return rows;
}

function textRows(screen) {
  const rows = [];
  if (screen.video) {
    rows.push(['Vidéo', [para(`${screen.video.title}${screen.video.duration ? ` · ${screen.video.duration}` : ''}`, { after: 40 }), para('Sous-titres affichés par défaut. Questions pendant la vidéo : aucune.', { size: 18, color: COLORS.muted })]]);
  }
  if (screen.body?.length) rows.push(['Texte', [].concat(screen.body).map((line) => para(line, { after: 60 }))]);
  if (screen.facts?.length) rows.push(['Trois repères', screen.facts.map((fact) => para(fact.text, { bullet: true, after: 20 }))]);
  if (screen.objectives?.items?.length) rows.push([screen.objectives.title ?? 'Objectifs', screen.objectives.items.map((item) => para(item, { bullet: true, after: 30 }))]);
  if (screen.journey?.steps?.length) {
    rows.push([screen.journey.title ?? 'Frise', screen.journey.steps.map((step) => para(`**${step.label}** : ${step.text}`, { bullet: true, after: 30 }))]);
  }
  if (screen.image?.alt) rows.push(['Illustration', [para(screen.image.alt, { color: COLORS.muted, italics: true })]]);
  return rows;
}

function summaryRows(screen) {
  const rows = [];
  if (screen.messages?.passed) rows.push(['Message si le seuil est atteint', [para(screen.messages.passed)]]);
  if (screen.messages?.failed) rows.push(['Message si le seuil n’est pas atteint', [para(screen.messages.failed)]]);
  rows.push(['Score affiché', [para(`Oui, avec le seuil de réussite (${passingScore} %), le détail par section (Solide / À consolider / À revoir) et la possibilité de revoir les questions fausses.`)]]);
  if (screen.body?.length) rows.push(['Texte', [].concat(screen.body).map((line) => para(line, { after: 60 }))]);
  if (screen.keyPoints?.length) rows.push(['Points clés', screen.keyPoints.map((point) => para(point, { bullet: true, after: 30 }))]);
  if (screen.showReport) rows.push(['Carte « Votre rapport »', [para('Le rapport rempli au fil des réponses, à télécharger ou à imprimer, avec les corrigés dans les champs où la réponse était fausse.')]]);
  return rows;
}

function surveyRows(screen) {
  const rows = [['Introduction', [].concat(screen.intro ?? []).map((line) => para(line, { after: 60 }))]];
  for (const step of screen.steps ?? []) {
    rows.push([
      `Étape : ${step.title}`,
      step.items.map((item) => {
        const detail =
          item.kind === 'scale' ? ' [échelle de 1 à 5]' : item.kind === 'text' ? ' [commentaire libre]' : ` [${(item.options ?? []).map((option) => option.text).join(' / ')}]${item.kind === 'multiple' ? ' (plusieurs réponses possibles)' : ''}`;
        return para(`${item.prompt}${detail}`, { bullet: true, after: 30 });
      }),
    ]);
  }
  if (screen.scaleLabels?.length) rows.push(['Échelle', [para(screen.scaleLabels.map((text, i) => `${i + 1} = ${text}`).join(' · '))]]);
  if (screen.privacy) rows.push(['Texte sur l’usage des réponses', [para(screen.privacy)]]);
  if (screen.thanks) rows.push(['Message après envoi', [].concat(screen.thanks).map((line) => para(line))]);
  if (screen.submitLabel) rows.push(['Bouton d’envoi', [para(screen.submitLabel)]]);
  return rows;
}

function screenBlocks(screen, number, previous) {
  const rows = [['Étiquette', [para(screen.kicker ?? '')]]];
  if (screen.type === 'scene') rows.push(...sceneRows(screen));
  else if (screen.type === 'summary') rows.push(...summaryRows(screen));
  else if (screen.type === 'survey') rows.push(...surveyRows(screen));
  else rows.push(...textRows(screen));
  if (screen.continueLabel) rows.push(['Bouton « suivant »', [para(screen.continueLabel)]]);

  const out = [];
  if (screen.section && screen.section !== previous?.section) {
    out.push(para(plain(screen.section).toUpperCase(), { size: 17, bold: true, color: COLORS.green, before: 360, after: 40, keepNext: true }));
  }
  out.push(h2(`Écran ${number} · ${plain(screen.title)}`));
  out.push(kvTable(rows.map(([name, content, options]) => [name, content, options])));
  out.push(spacer(120));
  out.push(avisTable());
  out.push(spacer(200));
  return out;
}

/* ---------- Annexes : dossiers ---------- */

function dossierAnnex(titleText, file) {
  const rows = [
    ['Identité', [para(`${file.title} · ${file.subtitle ?? ''}`, { after: 30 }), ...(file.reference ? [para(file.reference, { color: COLORS.muted, size: 18 })] : [])]],
  ];
  if (file.body) rows.push(['Notes', [].concat(file.body).map((line) => para(line, { after: 40 }))]);
  const lineOf = (entry) => para(`**${entry.label}** : ${entry.value}`, { after: 30 });
  if (file.data?.length) rows.push(['Renseignements', file.data.map(lineOf)]);
  for (const section of file.sections ?? []) rows.push([section.title, (section.data ?? []).map(lineOf)]);
  if (file.journal?.length) rows.push(['Journal des consultations', file.journal.map((entry) => para(`**${entry.date}** : ${entry.text}`, { after: 30 }))]);
  return [h2(titleText), kvTable(rows), spacer(120), avisTable(), spacer(200)];
}

/* ---------- Document ---------- */

const metadata = [
  ['Public', [para('Médecins généralistes vaudois (formation continue, plateforme Acamedia)')]],
  ['Producteur', [para(module.author ?? 'Office de l’assurance-invalidité pour le canton de Vaud')]],
  ['Formulaire travaillé', [para('Rapport médical somatique : réadaptation professionnelle / rente (formulaire 002.099, v. 09.2023)')]],
  ['Durée annoncée', [para(`${module.durationMinutes} minutes, ${screens.length} écrans, ${questionCount} questions`)]],
  ['Version relue', [para(`${module.version} du ${today}`)]],
  [
    'Voir le module en ligne',
    [new Paragraph({ children: [new ExternalHyperlink({ link: PAGES_URL, children: [new TextRun({ text: PAGES_URL, color: COLORS.navy, underline: {}, size: 20, font: 'Calibri' })] })], spacing: { after: 40 } })],
  ],
];
if (reviewUrl) {
  metadata.push([
    'Version de relecture (avec commentaires)',
    [
      new Paragraph({ children: [new ExternalHyperlink({ link: reviewUrl, children: [new TextRun({ text: reviewUrl, color: COLORS.navy, underline: {}, size: 20, font: 'Calibri' })] })], spacing: { after: 40 } }),
      para('Ajoutez « ?review » à la fin de l’adresse si ce n’est pas déjà fait ; le mot de passe vous est communiqué à part.', { size: 18, color: COLORS.muted }),
    ],
  ]);
}

const toValidate = [
  ['Réponses modèles du formulaire', `Les ${reportAnswerCount} réponses écrites dans le formulaire (diagnostics avec CIM-10, taux, délais, limitations chiffrées) sont des exemples cohérents avec le cas de Mme R. Sont-elles crédibles et conformes à ce que l’office AI souhaite recevoir ?`],
  ['Conséquences décrites dans les retours', 'Après une mauvaise réponse, le module décrit l’effet concret (« l’office AI doit vous recontacter », « une capacité surestimée »…). Ces conséquences sont-elles justes ?'],
  ['Phrases d’accroche', 'Chaque écran s’ouvre sur une phrase qui place le médecin dans la scène (« Vous reprenez vos notes de l’examen clinique du 5 octobre »). Le ton convient-il ? Contiennent-elles des erreurs ?'],
  ['Épilogue « Trois mois plus tard »', 'Il montre la suite de l’histoire : décision de l’office AI, mesure de réinsertion, reprise par étapes. C’est un scénario plausible, pas un fait. Est-il fidèle à la pratique de l’office AI ?'],
  ['Dossiers de Mme R. et de M. C.', 'Cohérence clinique (diagnostics, traitements, dates, taux), vocabulaire médical, codes CIM-10.'],
  ['Astuce et présentation des outils', 'À l’écran 3, un paragraphe présente le menu (dossier de Mme R., rapport, glossaire, paramètres, aide) ; à la question 1.1, une astuce rappelle le dossier et « Mon rapport ». Les formulations sont-elles claires et suffisantes ?'],
  ['Seuil de réussite et reprise', `Seuil de ${passingScore} %. Après la synthèse, l’apprenant peut revoir ses questions fausses ; son score est recalculé. Cette règle convient-elle à une formation continue ?`],
  ['Durée annoncée', `${module.durationMinutes} minutes : est-ce réaliste pour un médecin installé ?`],
  ['Questionnaire de satisfaction', 'Questions posées en fin de parcours, et texte sur l’usage des réponses (confidentialité).'],
];

const impressions = [
  'Le sujet répond à un vrai besoin de formation pour les médecins généralistes.',
  'Le niveau de difficulté est adapté à des médecins installés.',
  `La durée (${module.durationMinutes} minutes) est adaptée.`,
  'Les deux cas (Mme R. et M. C.) sont réalistes.',
  'Le ton et le vocabulaire conviennent au public.',
  'Les retours après chaque réponse sont utiles et clairs.',
  'La navigation est simple, y compris sur tablette ou téléphone.',
  'Je recommanderais ce module à des collègues.',
];

const changes = [
  'Nouvelle interface : menu à gauche (Parcours, Dossier de Mme R., Mon rapport, Glossaire, Paramètres, Aide), en-tête compact avec la progression et le temps restant ; sur téléphone, barre d’onglets en bas.',
  'Le dossier de Mme R. s’ouvre à côté de la question (ordinateur) et « Mon rapport » se remplit au fil des réponses.',
  'Après une mauvaise réponse, on peut réessayer ; seule la première réponse compte pour le score. Le retour est présenté en quatre niveaux : verdict, phrase qui explique, bonne réponse, conséquence.',
  'La vidéo d’accueil est sous-titrée, avec un mode cinéma sur ordinateur.',
  'Réglages : taille du texte, thème clair ou sombre, raccourcis clavier, réinitialisation du module.',
  'Le questionnaire de satisfaction et l’épilogue « Trois mois plus tard » sont à valider (voir le tableau ci-dessus).',
];

const sections = [];

// Couverture
sections.push(
  para('E-learning', { size: 22, bold: true, color: COLORS.green, before: 600, after: 60 }),
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: module.title, font: 'Calibri' })], spacing: { after: 100 } }),
  para('Document de relecture : contenu complet du module et formulaire de retours', { size: 22, color: COLORS.muted, after: 280 }),
  kvTable(metadata, { labelWidth: 2600 }),
  ...figure('00-couverture.jpg', 'Premier écran du module', 560),
);

// Mode d'emploi
sections.push(
  h1('À quoi sert ce document'),
  para('Ce document présente **tout le contenu** de l’e-learning, écran par écran, tel qu’un médecin le verra : textes, extraits du formulaire, questions, réponses possibles et retours. Il sert à **recueillir vos avis** avant la mise en ligne définitive.', { after: 100 }),
  para('Le contenu pédagogique a été rédigé à partir des documents de l’office AI (vidéo pour les médecins, FAQ, atelier SMR du 5 septembre 2024, glossaire). Certaines parties sont toutefois des propositions de rédaction qui ont **besoin d’être validées** : elles sont listées plus bas.', { after: 160 }),
  para('Comment donner votre avis', { bold: true, color: COLORS.navy, size: 24, after: 80, before: 120, keepNext: true }),
  para('Parcourez le module en ligne (lien en couverture) et, si vous le souhaitez, relisez le détail dans ce document.', { bullet: true }),
  ...(reviewUrl ? [para('Vous pouvez aussi écrire vos remarques **directement dans le module** : le bouton « Commenter » (en bas à gauche) rattache chaque commentaire à l’écran concerné, et vos collègues voient les vôtres.', { bullet: true })] : []),
  para('Pour chaque écran, cochez une case dans le cadre jaune « Votre avis » et ajoutez un commentaire si besoin : ce qui est faux, ambigu, trop long ou manquant.', { bullet: true }),
  para('Répondez aux questions générales (pages suivantes) et ajoutez vos remarques libres à la fin.', { bullet: true }),
  para('Vous pouvez remplir ce fichier dans Word (cases à cocher : tapez un « X » à côté du symbole ☐), ou le commenter avec la fonction « Nouveau commentaire ».', { bullet: true }),
  para('Merci de retourner vos retours avant le : ________________________   à : ________________________', { before: 120, after: 200 }),
  para('Légende', { bold: true, color: COLORS.navy, size: 24, after: 80, keepNext: true }),
  new Paragraph({ children: [new TextRun({ text: '✔ ', bold: true, color: COLORS.ok, size: 20, font: 'Segoe UI Symbol' }), new TextRun({ text: 'devant une réponse = bonne réponse.', size: 20, font: 'Calibri' })], spacing: { after: 60 } }),
  para('Texte en bleu = réponse modèle qui s’écrit dans le formulaire quand la question est réussie.', { color: COLORS.blue, after: 60 }),
  para('Texte en gris italique = remarque associée à une réponse précise.', { italics: true, color: COLORS.muted, after: 200 }),
  para('Ce qui a changé depuis la version 0.67.0', { bold: true, color: COLORS.navy, size: 24, after: 80, before: 120, keepNext: true }),
  para('Si vous aviez relu la version précédente (21 octobre 2026), voici l’essentiel de ce qui est nouveau :', { after: 60 }),
  ...changes.map((line) => para(line, { bullet: true, after: 40 })),
);

// À valider
sections.push(
  h1('Ce que nous aimerions surtout vous faire valider'),
  para('Ces éléments ont été rédigés pour le module et ne viennent pas tels quels d’un document officiel.', { after: 120 }),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2300, 5338, 2000],
    rows: [
      new TableRow({
        tableHeader: true,
        children: ['Sujet', 'Question', 'Votre avis'].map((text, i) => cell(para(text, { bold: true, size: 18, color: COLORS.labelText, after: 0 }), { width: [2300, 5338, 2000][i], fillColor: COLORS.label })),
      }),
      ...toValidate.map(
        ([subject, question]) =>
          new TableRow({
            cantSplit: true,
            children: [
              cell(para(subject, { bold: true, size: 19, after: 0 }), { width: 2300 }),
              cell(para(question, { size: 19, after: 0 }), { width: 5338 }),
              cell(new Paragraph({ children: [CHECK('OK'), new TextRun({ text: '   ' }), CHECK('À revoir')], spacing: { after: 0 } }), { width: 2000, fillColor: COLORS.yellow, color: COLORS.yellowLine }),
            ],
          }),
      ),
    ],
  }),
);

// Impressions générales
sections.push(
  h1('Vos impressions générales'),
  para('Sur une échelle de 1 (pas du tout d’accord) à 5 (tout à fait d’accord) :', { after: 120 }),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [4300, 2638, 2700],
    rows: [
      new TableRow({ tableHeader: true, children: ['Affirmation', '1 à 5', 'Commentaire'].map((text, i) => cell(para(text, { bold: true, size: 18, color: COLORS.labelText, after: 0 }), { width: [4300, 2638, 2700][i], fillColor: COLORS.label })) }),
      ...impressions.map(
        (statement) =>
          new TableRow({
            cantSplit: true,
            children: [
              cell(para(statement, { size: 19, after: 0 }), { width: 4300 }),
              cell(new Paragraph({ children: [1, 2, 3, 4, 5].flatMap((n) => [CHECK(String(n)), new TextRun({ text: ' ' })]), spacing: { after: 0 } }), { width: 2638, fillColor: COLORS.yellow, color: COLORS.yellowLine, valign: VerticalAlign.CENTER }),
              cell(para('', { after: 0 }), { width: 2700, fillColor: COLORS.yellow, color: COLORS.yellowLine }),
            ],
          }),
      ),
    ],
  }),
  ...box('Ce qui vous a le plus plu', 1300),
  ...box('Ce qui devrait changer en priorité', 1300),
);

// Le module en images
const shots = [
  ['01-courrier.jpg', '1. Le courrier de l’office AI qui lance le cas de Mme R.'],
  ['02-dossier.jpg', '2. Le dossier de Mme R., consultable pendant tout le parcours'],
  ['03-question.jpg', '3. Un écran de question : extrait du formulaire et trois réponses'],
  ['04-apres-reponse.jpg', '4. Après la réponse : retour immédiat, dossier ouvert à côté'],
  ['05-formulaire-rempli.jpg', '5. La réponse écrite dans le formulaire, à l’encre bleue'],
  ['06-synthese.jpg', '6. La synthèse : score et points clés'],
  ['07-sections.jpg', '7. Résultats par section, avec la possibilité de revoir les questions fausses'],
  ['08-epilogue.jpg', '8. L’épilogue « Trois mois plus tard »'],
];
sections.push(h1('Le module en images'), para('Quelques écrans, pour se représenter le parcours (le détail des textes suit).', { after: 80 }));
for (const [file, caption] of shots) sections.push(...figure(file, caption, 520));
const phoneA = picture('09-mobile-accueil.jpg', 230, 'Le premier écran sur téléphone');
const phoneB = picture('10-mobile-parcours.jpg', 230, 'Le parcours sur téléphone');
if (phoneA && phoneB) {
  const half = CONTENT_WIDTH / 2;
  const noBorder = { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } };
  const phoneCell = (image, caption) =>
    new TableCell({
      width: { size: half, type: WidthType.DXA },
      borders: noBorder,
      children: [new Paragraph({ children: [image], alignment: AlignmentType.CENTER, spacing: { after: 40 } }), para(caption, { size: 17, italics: true, color: COLORS.muted, align: AlignmentType.CENTER })],
    });
  sections.push(
    new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: [half, half], rows: [new TableRow({ cantSplit: true, children: [phoneCell(phoneA, '9. Le premier écran sur téléphone'), phoneCell(phoneB, '10. Le parcours sur téléphone (barre d’onglets en bas)')] })] }),
  );
}

// Liste des écrans
sections.push(
  h1('Les écrans du parcours'),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [600, 3900, 4138, 1000],
    rows: [
      new TableRow({ tableHeader: true, children: ['N°', 'Écran', 'Ensemble', 'Question'].map((text, i) => cell(para(text, { bold: true, size: 18, color: COLORS.labelText, after: 0 }), { width: [600, 3900, 4138, 1000][i], fillColor: COLORS.label })) }),
      ...screens.map(
        (screen, index) =>
          new TableRow({
            cantSplit: true,
            children: [
              cell(para(String(index + 1), { size: 18, after: 0 }), { width: 600 }),
              cell(para(plain(screen.title), { size: 18, after: 0 }), { width: 3900 }),
              cell(para([screen.part, screen.section].filter(Boolean).map(plain).join(' · '), { size: 18, color: COLORS.muted, after: 0 }), { width: 4138 }),
              cell(para(questionsOf(screen).length ? 'oui' : '', { size: 18, after: 0, align: AlignmentType.CENTER }), { width: 1000 }),
            ],
          }),
      ),
    ],
  }),
);

// Détail de chaque écran
sections.push(h1('Le contenu, écran par écran'));
screens.forEach((screen, index) => sections.push(...screenBlocks(screen, index + 1, screens[index - 1])));

// Annexes
sections.push(h1('Annexe : dossier de Mme R.'), ...dossierAnnex('Dossier de Mme R.', module.patientFile));
const mcDossier = screens.flatMap((screen) => (screen.type === 'scene' ? screen.blocks : [])).find((block) => block.type === 'document' && block.kind === 'dossier');
if (mcDossier) sections.push(h1('Annexe : dossier de M. C.'), ...dossierAnnex('Dossier de M. C.', mcDossier));

sections.push(h1('Autres remarques'), ...box('Ce qui manque, ce qui est de trop, ce que vous changeriez', 3400), para('Merci de votre relecture.', { bold: true, color: COLORS.navy, size: 24, before: 300 }));

const document = new Document({
  creator: module.author ?? 'Office AI du canton de Vaud',
  title: `${module.title} : document de relecture`,
  description: `Contenu du module version ${module.version}`,
  styles: {
    default: { document: { run: { font: 'Calibri', size: 20, color: COLORS.text } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { size: 60, bold: true, color: COLORS.navy, font: 'Calibri' }, paragraph: { spacing: { after: 100 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 36, bold: true, color: COLORS.navy, font: 'Calibri' }, paragraph: { spacing: { before: 0, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: COLORS.navy, font: 'Calibri' }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] }],
  },
  sections: [
    {
      properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: PAGE.margin, right: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin } } },
      headers: {
        default: new Header({
          children: [new Paragraph({ children: [new TextRun({ text: `E-learning « ${module.title} » · relecture · version ${module.version}`, size: 16, color: COLORS.muted, font: 'Calibri' })], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line, space: 4 } } })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' sur ', PageNumber.TOTAL_PAGES], size: 16, color: COLORS.muted, font: 'Calibri' })] })],
        }),
      },
      children: sections,
    },
  ],
});

const output = join(ROOT, 'docs', `relecture-elearning-v${module.version}.docx`);
writeFileSync(output, await Packer.toBuffer(document));
console.log(`Document de relecture : docs/relecture-elearning-v${module.version}.docx (${screens.length} écrans, ${questionCount} questions)`);
