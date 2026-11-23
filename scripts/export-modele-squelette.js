/**
 * Génère le modèle Word « squelette d'un e-learning » : un document à remplir pour concevoir le plan d'une formation
 * (identité, objectifs, fil rouge, parcours, fiches d'écran, évaluation, matériel à fournir) avant sa mise en forme dans
 * content/module.json. Un exemple rempli (la question 1.1 du module actuel) montre le niveau de détail attendu.
 *
 *   npm install --no-save docx                  # une seule fois (outil de génération, pas une dépendance du module)
 *   node scripts/export-modele-squelette.js     # → docs/modele-squelette-elearning.docx
 *   node scripts/export-modele-squelette.js --fiches=12   # nombre de fiches d'écran vierges (8 par défaut)
 */

import { readFileSync, writeFileSync } from 'node:fs';
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
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, LevelFormat, Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} = docx;

const module = JSON.parse(readFileSync(join(CONTENT_DIR, 'module.json'), 'utf8'));
const fichesArg = process.argv.find((arg) => arg.startsWith('--fiches='));
const FICHES = Math.max(1, Number(fichesArg?.split('=')[1]) || 8);

/* ---------- Mise en forme (même charte que le document de relecture) ---------- */

const C = { navy: '0F1D96', green: '007A20', text: '1F2330', muted: '5A6070', hint: '8A90A0', label: 'F2F3F7', labelText: '4A4F5C', line: 'C9CDD8', fillIn: 'FFFBEA', fillInLine: 'E8D98A', fillInLabel: 'FCF1BF', ok: '1D6B3B' };
const PAGE = { width: 11906, height: 16838, margin: 1134 };
const W = PAGE.width - 2 * PAGE.margin;
const LABEL_W = 2300;

function para(text, o = {}) {
  const { size = 20, color = C.text, bold, italics, after = 80, before = 0, bullet, keepNext, align } = o;
  // **gras** dans un texte simple
  const children =
    typeof text === 'string'
      ? text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part) => (part.startsWith('**') ? new TextRun({ text: part.slice(2, -2), size, color, bold: true, italics, font: 'Calibri' }) : new TextRun({ text: part, size, color, bold, italics, font: 'Calibri' })))
      : text;
  return new Paragraph({ children, spacing: { after, before, line: 276 }, keepNext, alignment: align, ...(bullet ? { numbering: { reference: 'bullets', level: 0 } } : {}) });
}
const hint = (text) => para(text, { size: 17, italics: true, color: C.hint, after: 40 });
const side = (color) => ({ style: BorderStyle.SINGLE, size: 4, color });
const borders = (color = C.line) => ({ top: side(color), bottom: side(color), left: side(color), right: side(color) });

function cell(children, { width, fillColor, color = C.line, valign = VerticalAlign.TOP } = {}) {
  const content = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return new TableCell({
    children: content.length ? content : [new Paragraph({ children: [] })],
    width: { size: width, type: WidthType.DXA },
    borders: borders(color),
    shading: fillColor ? { type: ShadingType.CLEAR, fill: fillColor, color: 'auto' } : undefined,
    margins: { top: 70, bottom: 70, left: 120, right: 120 },
    verticalAlign: valign,
  });
}

/** Ligne « libellé | zone à remplir » ; `hints` : consignes en gris ; `filled` : contenu déjà écrit (exemple). */
function formRow(name, { hints = [], filled = [], height = 0, labelFill = C.label, valueFill = C.fillIn, line = C.fillInLine } = {}) {
  const content = [...filled.map((text) => (typeof text === 'string' ? para(text, { after: 50 }) : text)), ...hints.map(hint)];
  return new TableRow({
    cantSplit: true,
    height: height ? { value: height, rule: 'atLeast' } : undefined,
    children: [
      cell(para(name, { size: 17, bold: true, color: C.labelText, after: 0 }), { width: LABEL_W, fillColor: labelFill, color: line }),
      cell(content, { width: W - LABEL_W, fillColor: valueFill, color: line }),
    ],
  });
}
const formTable = (rows) => new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [LABEL_W, W - LABEL_W], rows });

const box = (label) => new TextRun({ text: `☐ ${label}`, size: 19, font: 'Segoe UI Symbol', color: C.text });
const gap = () => new TextRun({ text: '     ' });
const h1 = (text, pageBreak = true) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: 'Calibri' })], pageBreakBefore: pageBreak, spacing: { before: 0, after: 160 }, keepNext: true });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: 'Calibri' })], spacing: { before: 240, after: 100 }, keepNext: true });
const spacer = (after = 160) => new Paragraph({ children: [], spacing: { after } });

/* ---------- Exemple rempli : la question 1.1 du module actuel ---------- */

const example = (() => {
  const screen = module.screens.find((s) => s.id === '1-1');
  const question = screen.blocks.find((b) => b.type === 'question');
  const form = screen.blocks.find((b) => b.type === 'form');
  const point = form.items.find((item) => item.number);
  const hook = screen.blocks.find((b) => b.type === 'text').body[0];
  const fb = question.feedback;
  return { screen, question, point, hook, fb };
})();

function ficheEcran(number, { filled = null } = {}) {
  const f = filled;
  const rows = [
    formRow('N° et titre de l’écran', { filled: f ? [`${number} · ${f.screen.title}`] : [], hints: f ? [] : ['Un titre court, qui dit ce que l’on fait (ex. « Le traitement dispensé »).'] }),
    formRow('Ensemble et section', { filled: f ? [`${f.screen.part} · ${f.screen.section}`] : [], hints: f ? [] : ['Où se place l’écran dans le parcours (voir le tableau « Parcours »).'] }),
    new TableRow({
      cantSplit: true,
      children: [
        cell(para('Type d’écran', { size: 17, bold: true, color: C.labelText, after: 0 }), { width: LABEL_W, fillColor: C.label, color: C.fillInLine }),
        cell(
          [
            new Paragraph({ children: [box('Texte'), gap(), box('Scène (extrait + question)'), gap(), box('Synthèse'), gap(), box('Avis')], spacing: { after: 40 } }),
            hint('Texte : accueil, objectifs, épilogue. Scène : une mise en situation avec un extrait de document et une question. Synthèse : score et points clés. Avis : questionnaire de satisfaction.'),
          ],
          { width: W - LABEL_W, fillColor: C.fillIn, color: C.fillInLine },
        ),
      ],
    }),
    formRow('Objectif de l’écran', { filled: f ? ['Reporter les dates et les autres médecins qui ont suivi la patiente (question 1.1 du formulaire).'] : [], hints: f ? [] : ['Ce que l’apprenant sait ou fait en sortant de l’écran, avec un verbe d’action.'], height: f ? 0 : 560 }),
    formRow('Accroche ou texte', { filled: f ? [f.hook] : [], hints: f ? [] : ['Une phrase qui place l’apprenant dans la scène (2e personne, présent). Ne révèle jamais la réponse.'], height: f ? 0 : 700 }),
    formRow('Extrait de document affiché', { filled: f ? [`${f.point.number}  ${f.point.label}`] : [], hints: f ? [] : ['Le passage du formulaire ou du dossier montré à l’écran (intitulé exact, sans reformuler).'], height: f ? 0 : 560 }),
    formRow('Image, vidéo ou document', { filled: f ? ['Aucun : l’écran affiche le dossier de la patiente à côté du formulaire.'] : [], hints: f ? [] : ['Description, fichier prévu, et TEXTE ALTERNATIF obligatoire pour une image ; sous-titres pour une vidéo.'], height: f ? 0 : 500 }),
    formRow('Question (énoncé)', { filled: f ? [f.question.prompt] : [], hints: f ? [] : ['Une question à choix unique. Si l’énoncé répète le formulaire, le raccourcir (« Que reportez-vous pour Mme R. ? »).'], height: f ? 0 : 500 }),
  ];
  ['A', 'B', 'C'].forEach((letter, i) => {
    const option = f?.question.options[i];
    rows.push(
      formRow(`Réponse ${letter}`, {
        filled: option
          ? [
              new Paragraph({ children: [new TextRun({ text: option.correct ? '✔ ' : '', bold: true, color: C.ok, size: 20, font: 'Segoe UI Symbol' }), new TextRun({ text: option.text, size: 20, font: 'Calibri' })], spacing: { after: 40 } }),
              ...(option.feedback ? [para(`→ ${option.feedback}`, { size: 18, italics: true, color: C.muted })] : []),
            ]
          : [new Paragraph({ children: [box('Bonne réponse')], spacing: { after: 40 } })],
        hints: option ? [] : ['Le texte de la réponse, puis « Remarque si elle est choisie » : pourquoi elle ne convient pas.'],
        height: option ? 0 : 560,
      }),
    );
  });
  rows.push(
    formRow('Retour si bonne réponse', { filled: f ? [f.fb.correct] : [], hints: f ? [] : ['Une ou deux phrases : pourquoi c’est la bonne réponse (l’explication est le moment où l’on apprend).'], height: f ? 0 : 500 }),
    formRow('Retour si mauvaise réponse', {
      filled: f ? [para(f.fb.incorrect.title, { bold: true, after: 30 }), f.fb.incorrect.body] : [],
      hints: f ? [] : ['La CONSÉQUENCE concrète pour le dossier ou la patiente : un titre accrocheur (« Quelques semaines plus tard… »), puis l’effet.'],
      height: f ? 0 : 600,
    }),
    formRow('Réponse modèle écrite dans le formulaire', { filled: f ? f.question.reportAnswer : [], hints: f ? [] : ['Facultatif : le texte qui s’écrit dans le champ du formulaire quand la question est réussie.'], height: f ? 0 : 450 }),
    formRow('Bouton « suivant »', { filled: f ? ['(« Suivant » par défaut)'] : [], hints: f ? [] : ['Seulement si le libellé doit changer (ex. « Ouvrir le dossier de Mme R. »).'] }),
    formRow('À valider ou à fournir', { filled: f ? ['Dates du dossier à confirmer par l’office AI.'] : [], hints: f ? [] : ['Ce qui manque, ce qu’un expert doit confirmer, les sources utilisées.'], height: f ? 0 : 450 }),
  );
  return formTable(rows);
}

/* ---------- Document ---------- */

const today = new Date().toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });
const children = [];

// Couverture
children.push(
  para('E-learning', { size: 22, bold: true, color: C.green, before: 600, after: 60 }),
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'Squelette de mon e-learning', font: 'Calibri' })], spacing: { after: 100 } }),
  para('Modèle à remplir pour concevoir le plan d’une formation, avant sa mise en ligne', { size: 22, color: C.muted, after: 300 }),
  formTable([
    formRow('Titre de la formation', { hints: ['Le nom que verront les apprenants.'], height: 500 }),
    formRow('Auteur·e / contact', { hints: ['Qui remplit ce document, et comment le joindre.'], height: 500 }),
    formRow('Date et version', { filled: [`Modèle du ${today}`], hints: ['Date de la dernière modification de ce squelette.'] }),
  ]),
);

// Mode d'emploi
children.push(
  h1('Comment remplir ce document'),
  para('Ce document sert à **décrire le plan de votre formation** avant de la construire : à qui elle s’adresse, ce qu’elle doit apprendre, comment elle se déroule, et ce que contient chaque écran. Il est pensé pour qu’une personne qui ne code pas puisse le remplir, et pour être ensuite transformé en contenu du module (le fichier de contenu du module).', { after: 120 }),
  para('Les cadres jaunes sont à remplir. Le texte gris en italique est une consigne : effacez-le une fois la zone remplie. Chaque partie peut rester vide ou provisoire : un squelette se précise par étapes.', { after: 120 }),
  para('Les étapes', { bold: true, color: C.navy, size: 24, after: 80, before: 120, keepNext: true }),
  para('1.  **Identité** : public, objectif général, durée, contraintes.', { after: 40 }),
  para('2.  **Objectifs** : ce que l’apprenant saura ou saura faire (5 au maximum).', { after: 40 }),
  para('3.  **Fil rouge** : un cas ou une histoire qui traverse la formation (facultatif, mais très efficace).', { after: 40 }),
  para('4.  **Parcours** : la liste des écrans, regroupés en sections.', { after: 40 }),
  para('5.  **Fiches d’écran** : une fiche par écran. L’exemple rempli (page suivante) montre le niveau de détail attendu.', { after: 40 }),
  para('6.  **Évaluation** : seuil de réussite, reprise, questionnaire de satisfaction.', { after: 40 }),
  para('7.  **Matériel à fournir** et **vérifications** avant la mise en ligne.', { after: 160 }),
  para('Bonnes pratiques retenues pour ce type de formation', { bold: true, color: C.navy, size: 24, after: 80, before: 120, keepNext: true }),
  para('Un écran = une idée = une question. Trop d’information par écran fatigue.', { bullet: true, after: 30 }),
  para('Écrire à partir de documents officiels (formulaires, FAQ, vidéos), pas de mémoire : citer les intitulés exacts.', { bullet: true, after: 30 }),
  para('Une mauvaise réponse doit montrer sa conséquence concrète, pas seulement dire « faux ».', { bullet: true, after: 30 }),
  para('Pensez aux médecins sur tablette ou téléphone, avec peu de temps : des textes courts, des phrases simples.', { bullet: true, after: 30 }),
  para('Chaque image a un texte alternatif, chaque vidéo des sous-titres (accessibilité).', { bullet: true, after: 30 }),
  para('Tout texte rédigé pour la formation et qui ne vient pas d’un document officiel doit être validé par un expert.', { bullet: true, after: 30 }),
);

// 1. Identité
children.push(
  h1('1. Identité de la formation'),
  formTable([
    formRow('Public cible', { hints: ['Profession, niveau d’expérience, contexte de travail. Ex. « médecins généralistes installés, peu de temps, souvent sur tablette ».'], height: 700 }),
    formRow('Producteur', { hints: ['Organisation qui produit et signe la formation.'] }),
    formRow('Plateforme de diffusion', { filled: ['Acamedia (plateforme de formation continue), chargement dans un LMS au format SCORM 1.2.'], hints: ['À modifier si la plateforme change.'] }),
    formRow('Objectif général', { hints: ['En une phrase : à la fin de la formation, l’apprenant sait…'], height: 700 }),
    formRow('Durée visée', { hints: ['En minutes (ex. 45). Un écran avec question prend environ 1 minute.'] }),
    formRow('Langue et ton', { filled: ['Français. Vouvoiement, ton professionnel et simple.'], hints: ['À adapter.'] }),
    formRow('Documents officiels de référence', { hints: ['Formulaires, FAQ, vidéos, guides sur lesquels s’appuie le contenu (titre, version, date).'], height: 800 }),
    formRow('Contraintes', { hints: ['Délais, charte graphique, accessibilité, mots à éviter, contenus déjà validés ou interdits.'], height: 700 }),
    formRow('Experts à consulter', { hints: ['Qui valide le fond (nom, fonction).'], height: 560 }),
  ]),
);

// 2. Objectifs
children.push(
  h1('2. Objectifs pédagogiques'),
  para('À la fin de la formation, l’apprenant sait… (cinq objectifs au maximum, chacun avec un verbe d’action différent : décrire, attester, formuler, chiffrer, distinguer…).', { after: 120 }),
  formTable(
    [1, 2, 3, 4, 5].map((n) => formRow(`Objectif ${n}`, { hints: n === 1 ? ['Ex. « Décrire l’état de santé avec des constats objectifs et des diagnostics datés. »'] : [], height: 560 })),
  ),
  spacer(),
  para('Comment saurez-vous que l’objectif est atteint ?', { bold: true, color: C.navy, size: 24, before: 160, after: 80, keepNext: true }),
  formTable([formRow('Critères', { hints: ['Ex. « 70 % de bonnes réponses aux questions. », « le formulaire est rempli sans demande de complément. »'], height: 800 })]),
);

// 3. Fil rouge
children.push(
  h1('3. Fil rouge : le cas ou l’histoire'),
  para('Un cas fictif relie les écrans entre eux et donne du sens aux questions. Si vous n’en voulez pas, écrivez « sans fil rouge ».', { after: 120 }),
  formTable([
    formRow('Personnage principal', { hints: ['Nom (initiales), âge, profession, situation. Mention « cas fictif » obligatoire.'], height: 700 }),
    formRow('Situation de départ', { hints: ['Ce qui lance l’histoire (ex. un courrier de l’office AI qui demande un rapport).'], height: 700 }),
    formRow('Déroulé', { hints: ['Les grandes étapes de l’histoire, de la situation de départ à la conclusion.'], height: 900 }),
    formRow('Dossier du personnage', { hints: ['Les informations factuelles (dates, diagnostics, traitements, poste) : elles ne doivent jamais se contredire d’un écran à l’autre.'], height: 900 }),
    formRow('Second cas (facultatif)', { hints: ['Un autre cas pour s’entraîner sans l’aide du premier.'], height: 560 }),
    formRow('Épilogue', { hints: ['Comment l’histoire se termine, et ce que cela montre (scénario plausible : à valider).'], height: 700 }),
  ]),
);

// 4. Parcours
const parcoursRow = (cells, header = false) =>
  new TableRow({
    cantSplit: true,
    tableHeader: header,
    height: header ? undefined : { value: 520, rule: 'atLeast' },
    children: cells.map((text, i) =>
      cell(para(text, { size: header ? 18 : 19, bold: header, color: header ? C.labelText : C.text, italics: !header && text.startsWith('Ex.'), after: 0 }), {
        width: [2000, 2900, 1900, 1100, 1738][i],
        fillColor: header ? C.label : C.fillIn,
        color: header ? C.line : C.fillInLine,
      }),
    ),
  });
children.push(
  h1('4. Le parcours'),
  para('La liste des écrans, regroupés en sections. Une ligne par section. Le nombre d’écrans et de questions donne la durée : environ 1 minute par écran avec question.', { after: 120 }),
  new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [2000, 2900, 1900, 1100, 1738],
    rows: [
      parcoursRow(['Ensemble', 'Section', 'Écrans (n° à n°)', 'Questions', 'Objectif visé'], true),
      parcoursRow(['Ex. Démarrage', 'Ex. Introduction', 'Ex. 1 à 3', 'Ex. 0', 'Ex. objectifs']),
      parcoursRow(['Ex. Le formulaire', 'Ex. Section 1 · Informations générales', 'Ex. 7 à 9', 'Ex. 3', 'Ex. 1']),
      ...Array.from({ length: 12 }, () => parcoursRow(['', '', '', '', ''])),
    ],
  }),
  spacer(),
  para('Écrans de conclusion à prévoir (cochez ceux que vous voulez)', { bold: true, color: C.navy, size: 24, before: 160, after: 80, keepNext: true }),
  para('☐ Synthèse : score, résultats par section, points clés à retenir.', { after: 40 }),
  para('☐ Épilogue : la suite de l’histoire.', { after: 40 }),
  para('☐ Questionnaire de satisfaction : facultatif, non noté (réaction, apprentissage perçu, transfert).', { after: 40 }),
  para('☐ Remerciements : mention « cas fictif », coordonnées de contact.', { after: 40 }),
);

// 5. Exemple + fiches
children.push(
  h1('5. Fiches d’écran'),
  para('Une fiche par écran. Voici d’abord un **exemple rempli** (l’écran 7 de la formation « Le rapport médical AI »), puis des fiches vierges à copier autant de fois que nécessaire.', { after: 120 }),
  para('Exemple rempli', { bold: true, color: C.green, size: 22, after: 80, keepNext: true }),
  ficheEcran(example.screen.number ?? 7, { filled: example }),
);
for (let i = 1; i <= FICHES; i += 1) {
  children.push(h1(`Fiche d’écran ${i}`), ficheEcran(i));
}

// 6. Évaluation
children.push(
  h1('6. Évaluation et règles'),
  formTable([
    formRow('Seuil de réussite', { filled: ['70 % de bonnes réponses.'], hints: ['À adapter. Une question vaut un point ; seule la première réponse compte.'] }),
    formRow('Reprise après un échec', { filled: ['Oui : on peut revoir les questions fausses et le score est recalculé.'], hints: ['À adapter (oui / non, nombre d’essais).'] }),
    formRow('Navigation', { filled: ['On avance écran par écran ; on ne quitte un écran qu’après avoir répondu à sa question ; retour libre sur les écrans déjà vus.'], hints: ['À adapter.'] }),
    formRow('Crédits ou attestation', { hints: ['Y a-t-il une attestation de formation continue, des crédits ? Que demande la plateforme ?'], height: 560 }),
    formRow('Questionnaire de satisfaction', { hints: ['Questions à poser en fin de parcours (échelle de 1 à 5, choix, commentaire libre). Mention sur l’usage des réponses (confidentialité).'], height: 900 }),
  ]),
);

// 7. Matériel et vérifications
children.push(
  h1('7. Matériel à fournir et vérifications'),
  para('Matériel à rassembler', { bold: true, color: C.navy, size: 24, after: 80, keepNext: true }),
  formTable([
    formRow('Documents sources', { hints: ['Fichiers officiels (PDF, vidéos) avec leur origine.'], height: 560 }),
    formRow('Images et illustrations', { hints: ['Style, format, droits d’utilisation. Photos réelles ou illustrations ?'], height: 560 }),
    formRow('Vidéo', { hints: ['Fichier, durée, transcription horodatée pour les sous-titres.'], height: 560 }),
    formRow('Glossaire', { hints: ['Termes à définir pour les apprenants.'], height: 560 }),
    formRow('Contact d’aide', { hints: ['Téléphone et courriel à afficher aux apprenants.'] }),
  ]),
  para('Avant la mise en ligne', { bold: true, color: C.navy, size: 24, before: 300, after: 80, keepNext: true }),
  ...[
    'Chaque texte qui ne vient pas d’un document officiel a été relu par un expert.',
    'Les intitulés du formulaire ou du document de référence sont cités tels quels.',
    'Les dates, les taux et les diagnostics du cas ne se contredisent jamais.',
    'Chaque image a un texte alternatif ; chaque vidéo a des sous-titres.',
    'Le parcours a été essayé sur téléphone et au clavier seul.',
    'La durée annoncée correspond à la durée réelle (test avec une personne extérieure).',
    'Le module a été testé dans la plateforme de test avant la livraison.',
  ].map((line) => new Paragraph({ children: [box(line)], spacing: { after: 50 } })),
  para('Merci : une fois ce document rempli, il peut être transformé en contenu de formation.', { bold: true, color: C.navy, size: 24, before: 300 }),
);

const document = new Document({
  creator: module.author ?? 'Office AI du canton de Vaud',
  title: 'Squelette de mon e-learning : modèle à remplir',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 20, color: C.text } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { size: 60, bold: true, color: C.navy, font: 'Calibri' }, paragraph: { spacing: { after: 100 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 36, bold: true, color: C.navy, font: 'Calibri' }, paragraph: { spacing: { before: 0, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: C.navy, font: 'Calibri' }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] }] },
  sections: [
    {
      properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: PAGE.margin, right: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin } } },
      headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'E-learning · squelette à remplir', size: 16, color: C.muted, font: 'Calibri' })], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 } } })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' sur ', PageNumber.TOTAL_PAGES], size: 16, color: C.muted, font: 'Calibri' })] })] }) },
      children,
    },
  ],
});

writeFileSync(join(ROOT, 'docs', 'modele-squelette-elearning.docx'), await Packer.toBuffer(document));
console.log(`Modèle de squelette : docs/modele-squelette-elearning.docx (${FICHES} fiches vierges)`);
