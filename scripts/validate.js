/**
 * Validation de content/module.json, avec des messages en français
 * compréhensibles par une personne qui ne code pas.
 *
 *   node scripts/validate.js
 *
 * Utilisé aussi par scripts/build.js : le build échoue s'il reste des erreurs.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CONTENT_DIR = join(ROOT, 'content');
export const MODULE_FILE = join(CONTENT_DIR, 'module.json');

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const OPTION_ID_PATTERN = /^[a-z0-9]$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const FILE_PATTERN = /^[A-Za-z0-9_-][A-Za-z0-9._/-]*$/;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|svg|webp)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm)$/i;
const SCORM12_SUSPEND_LIMIT = 4096;
const VIDEO_SIZE_WARNING = 50 * 1024 * 1024;

const SCREEN_TYPES = ['text', 'scene', 'quiz', 'summary', 'survey'];
const SURVEY_KINDS = ['scale', 'choice', 'multiple', 'text'];
const BLOCK_TYPES = ['text', 'video', 'attachment', 'writing', 'document', 'patientFile', 'form', 'callout', 'question', 'reveal'];
const DOCUMENT_KINDS = ['dossier', 'courrier', 'note'];
const QUESTION_KINDS = ['single', 'multiple'];
const JOURNEY_ICONS = ['courrier', 'dossier', 'examen', 'redaction', 'envoi', 'decision'];
const IMAGE_POSITIONS = ['top', 'bottom', 'side'];

const SCREEN_COMMON_KEYS = ['id', 'type', 'kicker', 'title', 'continueLabel', 'storyTitle', 'hidePatientFile', 'hideReport', 'hideKicker', 'section', 'part', 'optional'];

const ALLOWED_KEYS = {
  module: ['$schema', 'schemaVersion', 'id', 'version', 'title', 'description', 'language', 'author', 'durationMinutes', 'storyTitle', 'help', 'glossary', 'logo', 'form', 'patientFile', 'report', 'scoring', 'screens'],
  report: ['title', 'availableFrom', 'fileName', 'header', 'note'],
  survey: [...SCREEN_COMMON_KEYS, 'intro', 'steps', 'scaleLabels', 'submitLabel', 'privacy', 'thanks'],
  surveyStep: ['title', 'items'],
  surveyItem: ['id', 'kind', 'prompt', 'options'],
  logo: ['src', 'alt'],
  patientFile: ['title', 'subtitle', 'body', 'data', 'image', 'reference', 'sections', 'journal', 'availableFrom'],
  patientFileBlock: ['type'],
  form: ['title', 'reference'],
  scoring: ['passingScore', 'allowRetry'],
  text: [...SCREEN_COMMON_KEYS, 'body', 'image', 'video', 'objectives', 'journey', 'layout', 'facts'],
  fact: ['icon', 'text'],
  objectives: ['title', 'items'],
  journey: ['title', 'steps'],
  journeyStep: ['icon', 'label', 'text'],
  video: ['src', 'captions', 'title', 'duration', 'poster', 'transcript', 'start', 'autoplay'],
  writingBlock: ['type', 'id', 'prompt', 'placeholder', 'model', 'checklist'],
  attachmentBlock: ['type', 'title', 'src', 'meta', 'label', 'preview'],
  preview: ['title', 'reference', 'fields', 'items', 'footer'],
  videoBlock: ['type', 'src', 'captions', 'title', 'duration', 'poster', 'transcript', 'start', 'autoplay'],
  scene: [...SCREEN_COMMON_KEYS, 'blocks', 'consigne'],
  quiz: [...SCREEN_COMMON_KEYS, 'body', 'questions'],
  summary: [...SCREEN_COMMON_KEYS, 'body', 'keyPoints', 'showScore', 'showReport', 'messages'],
  textBlock: ['type', 'title', 'body', 'image'],
  documentBlock: ['type', 'kind', 'title', 'subtitle', 'body', 'data', 'image', 'sender', 'recipient', 'date', 'signature', 'enclosures', 'reference', 'sections', 'journal'],
  formBlock: ['type', 'title', 'reference', 'items'],
  formItem: ['number', 'label', 'answer', 'field', 'details'],
  formSection: ['section'],
  calloutBlock: ['type', 'title', 'body'],
  revealBlock: ['type', 'label'],
  dataItem: ['label', 'value'],
  image: ['src', 'alt', 'caption', 'position', 'decorative', 'show'],
  question: ['id', 'kind', 'prompt', 'options', 'feedback', 'points', 'reportAnswer', 'hidePrompt'],
  questionBlock: ['type', 'id', 'kind', 'prompt', 'options', 'feedback', 'points', 'reportAnswer', 'hidePrompt'],
  option: ['id', 'text', 'correct', 'feedback'],
  feedback: ['correct', 'incorrect'],
  feedbackObject: ['title', 'body'],
  messages: ['passed', 'failed', 'completed'],
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isRichText = (value) =>
  isText(value) || (Array.isArray(value) && value.length > 0 && value.every((line) => typeof line === 'string'));

/** Lit module.json. Retourne { module } ou { error } si le JSON est invalide. */
export function readModule(file = MODULE_FILE) {
  if (!existsSync(file)) return { error: `Fichier introuvable : ${relative(ROOT, file)}` };
  const text = readFileSync(file, 'utf8').replace(/^﻿/, '');
  try {
    return { module: JSON.parse(text) };
  } catch (error) {
    return {
      error:
        `${relative(ROOT, file)} n'est pas un JSON valide : ${error.message}\n` +
        '  Vérifiez les virgules (pas de virgule après le dernier élément d\'une liste),\n' +
        '  les guillemets droits "…" et les accolades/crochets fermants.',
    };
  }
}

/** Valide le contenu. Retourne { errors: [], warnings: [] }. */
export function validateModule(module, { contentDir = CONTENT_DIR } = {}) {
  const errors = [];
  const warnings = [];
  const error = (where, message) => errors.push(`${where} : ${message}`);
  const warn = (where, message) => warnings.push(`${where} : ${message}`);

  function checkKeys(object, allowed, where) {
    for (const key of Object.keys(object)) {
      if (!allowed.includes(key)) {
        warn(where, `champ « ${key} » inconnu, il sera ignoré (faute de frappe ?). Champs possibles : ${allowed.join(', ')}.`);
      }
    }
  }

  function checkImage(image, where) {
    if (!isObject(image)) return error(where, '« image » doit être un objet { "src": …, "alt": … }.');
    checkKeys(image, ALLOWED_KEYS.image, where);
    if (!isText(image.src)) {
      error(where, '« src » (chemin de l\'image) est obligatoire.');
    } else if (!FILE_PATTERN.test(image.src) || image.src.includes('..')) {
      error(where, `chemin « ${image.src} » invalide : utilisez uniquement lettres sans accents, chiffres, « - », « _ », « . » et « / » (pas d'espaces).`);
    } else if (!IMAGE_EXTENSIONS.test(image.src)) {
      error(where, `« ${image.src} » : format non pris en charge (png, jpg, gif, svg ou webp).`);
    } else {
      const path = join(contentDir, image.src);
      if (!existsSync(path) || !statSync(path).isFile()) error(where, `image introuvable : content/${image.src}`);
    }
    if (image.show !== undefined && typeof image.show !== 'boolean') error(where, '« show » doit valoir true ou false (false : l\'image reste dans le contenu mais n\'est pas affichée).');
    if (image.decorative === true) {
      if (isText(image.alt)) warn(where, 'image marquée décorative : son texte alternatif ne sera pas lu.');
    } else if (!isText(image.alt)) {
      error(where, '« alt » (texte alternatif) est obligatoire. Décrivez ce que montre l\'image, ou ajoutez "decorative": true si elle est purement décorative.');
    }
    if (image.position !== undefined && !IMAGE_POSITIONS.includes(image.position)) {
      error(where, `« position » doit valoir ${IMAGE_POSITIONS.map((p) => `"${p}"`).join(', ')}.`);
    }
  }

  /** Fichier du dossier content/ : nom sans espace ni accent, extension attendue, présent sur le disque. */
  function checkFile(path, where, field, extensions, label) {
    if (!isText(path)) return error(where, `« ${field} » est obligatoire.`);
    if (!FILE_PATTERN.test(path) || path.includes('..')) {
      return error(where, `chemin « ${path} » invalide : utilisez uniquement lettres sans accents, chiffres, « - », « _ », « . » et « / » (pas d'espaces).`);
    }
    if (!extensions.test(path)) return error(where, `« ${path} » : format non pris en charge (${label}).`);
    const full = join(contentDir, path);
    if (!existsSync(full) || !statSync(full).isFile()) return error(where, `fichier introuvable : content/${path}`);
    return statSync(full).size;
  }

  function checkVideo(video, where, allowedKeys = ALLOWED_KEYS.video) {
    if (!isObject(video)) return error(where, '« video » doit être un objet { "src": …, "captions": …, "title": … }.');
    checkKeys(video, allowedKeys, where);
    const size = checkFile(video.src, where, 'src', VIDEO_EXTENSIONS, 'mp4 ou webm');
    if (size > VIDEO_SIZE_WARNING) {
      warn(where, `vidéo de ${Math.round(size / 1024 / 1024)} Mo : vérifiez la taille maximale de paquet acceptée par la plateforme.`);
    }
    if (video.captions === undefined) {
      error(where, '« captions » (sous-titres .vtt) est obligatoire pour l\'accessibilité (WCAG 2.1 AA).');
    } else {
      checkFile(video.captions, where, 'captions', /\.vtt$/i, 'vtt');
    }
    if (!isText(video.title)) error(where, '« title » (titre de la vidéo, lu par les lecteurs d\'écran) est obligatoire.');
    if (video.duration !== undefined && !isText(video.duration)) error(where, '« duration » doit être un texte (ex. "2 min 30").');
    if (video.poster !== undefined) checkFile(video.poster, where, 'poster', IMAGE_EXTENSIONS, 'png, jpg, gif, svg ou webp');
    if (video.start !== undefined && !(typeof video.start === 'number' && video.start >= 0)) {
      error(where, '« start » doit être un nombre de secondes (ex. 8).');
    }
    if (video.autoplay !== undefined && typeof video.autoplay !== 'boolean') error(where, '« autoplay » doit valoir true ou false.');
    if (video.transcript === undefined) {
      warn(where, 'pas de « transcript » : ajoutez la transcription pour les personnes qui ne peuvent pas regarder la vidéo.');
    } else if (!isRichText(video.transcript)) {
      error(where, '« transcript » doit être un texte ou une liste de lignes.');
    }
  }

  function checkQuestion(question, where, questionIds, allowedKeys = ALLOWED_KEYS.question) {
    if (!isObject(question)) return error(where, 'chaque question doit être un objet.');
    checkKeys(question, allowedKeys, where);
    if (question.hidePrompt !== undefined && typeof question.hidePrompt !== 'boolean') {
      error(where, '« hidePrompt » doit valoir true ou false.');
    }
    if (question.reportAnswer !== undefined && !isRichText(question.reportAnswer)) {
      error(where, '« reportAnswer » (réponse affichée dans « Mon rapport ») doit être un texte ou une liste de lignes.');
    }

    if (!isText(question.id) || !ID_PATTERN.test(question.id)) {
      error(where, '« id » obligatoire : lettres sans accents, chiffres, « - » ou « _ », sans espace.');
    } else if (questionIds.has(question.id)) {
      error(where, `l'identifiant « ${question.id} » est déjà utilisé par une autre question.`);
    } else {
      questionIds.add(question.id);
    }
    if (!QUESTION_KINDS.includes(question.kind)) error(where, '« kind » doit valoir "single" (choix unique) ou "multiple" (choix multiple).');
    if (!isText(question.prompt)) error(where, '« prompt » (énoncé de la question) est obligatoire.');
    if (question.points !== undefined && !(typeof question.points === 'number' && question.points > 0)) {
      error(where, '« points » doit être un nombre positif.');
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      error(where, '« options » doit contenir au moins deux réponses.');
    } else {
      const optionIds = new Set();
      question.options.forEach((option, i) => {
        const at = `${where} › option ${i + 1}`;
        if (!isObject(option)) return error(at, 'chaque option doit être un objet { "id": …, "text": … }.');
        checkKeys(option, ALLOWED_KEYS.option, at);
        if (typeof option.id !== 'string' || !OPTION_ID_PATTERN.test(option.id)) {
          error(at, '« id » doit être une seule lettre minuscule ou un chiffre (a, b, c…).');
        } else if (optionIds.has(option.id)) {
          error(at, `l'identifiant « ${option.id} » est utilisé deux fois dans cette question.`);
        } else {
          optionIds.add(option.id);
        }
        if (!isText(option.text)) error(at, '« text » est obligatoire.');
        if (option.correct !== undefined && typeof option.correct !== 'boolean') error(at, '« correct » doit valoir true ou false (sans guillemets).');
        if (option.feedback !== undefined && !isText(option.feedback)) error(at, '« feedback » doit être un texte.');
      });

      const correctCount = question.options.filter((option) => option?.correct === true).length;
      if (question.kind === 'single' && correctCount !== 1) {
        error(where, `une question à choix unique doit avoir exactement une option "correct": true (actuellement ${correctCount}).`);
      }
      if (question.kind === 'multiple' && correctCount < 1) {
        error(where, 'une question à choix multiple doit avoir au moins une option "correct": true.');
      }
    }

    if (question.feedback === undefined) {
      warn(where, 'pas de « feedback » : l\'apprenant verra seulement « Bonne réponse » ou « Réponse incorrecte ».');
    } else if (!isObject(question.feedback)) {
      error(where, '« feedback » doit être un objet { "correct": …, "incorrect": … }.');
    } else {
      checkKeys(question.feedback, ALLOWED_KEYS.feedback, `${where} › feedback`);
      for (const key of ['correct', 'incorrect']) {
        const value = question.feedback[key];
        if (value === undefined) {
          warn(where, `feedback « ${key} » manquant.`);
        } else if (isObject(value)) {
          // Feedback par conséquence : { "title": "Quelques semaines plus tard…", "body": "…" }
          checkKeys(value, ALLOWED_KEYS.feedbackObject, `${where} › feedback › ${key}`);
          if (value.title !== undefined && !isText(value.title)) error(where, `feedback « ${key} » : « title » doit être un texte.`);
          if (!isRichText(value.body)) error(where, `feedback « ${key} » : « body » (le texte du feedback) est obligatoire.`);
        } else if (!isRichText(value)) {
          error(where, `feedback « ${key} » doit être un texte, une liste de lignes ou un objet { "title": …, "body": … }.`);
        }
      }
    }
  }

  function checkQuestions(questions, where, questionIds) {
    if (!Array.isArray(questions) || questions.length === 0) return error(where, '« questions » doit contenir au moins une question.');
    questions.forEach((question, i) => {
      const label = isText(question?.id) ? ` « ${question.id} »` : '';
      checkQuestion(question, `${where} › question ${i + 1}${label}`, questionIds);
    });
  }

  function checkData(data, where) {
    if (!Array.isArray(data)) return error(where, '« data » doit être une liste de { "label": …, "value": … }.');
    data.forEach((item, j) => {
      const at = `${where} › donnée ${j + 1}`;
      if (!isObject(item)) return error(at, 'doit être un objet { "label": …, "value": … }.');
      checkKeys(item, ALLOWED_KEYS.dataItem, at);
      if (!isText(item.label) || !isText(item.value)) error(at, '« label » et « value » sont obligatoires.');
    });
  }

  /** Champs propres au dossier médical : n° de dossier, rubriques, journal des consultations. */
  function checkRecord(file, where) {
    if (file.reference !== undefined && !isText(file.reference)) error(where, '« reference » doit être un texte (ex. "Dossier n° 2014-0387").');
    if (file.sections !== undefined) {
      if (!Array.isArray(file.sections)) error(where, '« sections » doit être une liste de { "title": …, "data": [ … ] }.');
      else file.sections.forEach((section, j) => {
        const at = `${where} › rubrique ${j + 1}`;
        if (!isObject(section)) return error(at, 'doit être un objet { "title": …, "data": [ … ] }.');
        checkKeys(section, ['title', 'data'], at);
        if (!isText(section.title)) error(at, '« title » est obligatoire.');
        checkData(section.data, at);
      });
    }
    if (file.journal !== undefined) {
      if (!Array.isArray(file.journal)) error(where, '« journal » doit être une liste de { "date": …, "text": … }.');
      else file.journal.forEach((entry, j) => {
        const at = `${where} › journal ${j + 1}`;
        if (!isObject(entry)) return error(at, 'doit être un objet { "date": …, "text": … }.');
        checkKeys(entry, ['date', 'text'], at);
        if (!isText(entry.date) || !isText(entry.text)) error(at, '« date » et « text » sont obligatoires.');
      });
    }
  }

  /** Questions d'un formulaire (bloc « form » ou aperçu d'une pièce jointe). */
  function checkFormItems(items, at) {
    if (!Array.isArray(items) || items.length === 0) {
      return error(at, '« items » doit contenir au moins une question du formulaire.');
    }
    items.forEach((item, k) => {
      const itemAt = `${at} › élément ${k + 1}`;
      if (!isObject(item)) return error(itemAt, 'doit être un objet { "number": …, "label": … }.');
      // Titre de section du formulaire : { "section": "2 Situation médicale" }
      if (item.section !== undefined) {
        checkKeys(item, ALLOWED_KEYS.formSection, itemAt);
        if (!isText(item.section)) error(itemAt, '« section » doit être un texte (titre de la section du formulaire).');
        return;
      }
      checkKeys(item, ALLOWED_KEYS.formItem, itemAt);
      if (!isText(item.label)) error(itemAt, '« label » (intitulé exact du formulaire) est obligatoire.');
      const validNumber =
        (Number.isInteger(item.number) && item.number > 0) ||
        (typeof item.number === 'string' && /^[0-9A-Za-z]{1,3}(\.[0-9A-Za-z]{1,3}){0,2}$/.test(item.number));
      if (item.number !== undefined && !validNumber) {
        error(itemAt, '« number » doit être le numéro imprimé sur le formulaire : 3, « 2.5 » ou « 4.1 ».');
      }
      if (item.answer !== undefined && !isRichText(item.answer)) error(itemAt, '« answer » doit être un texte ou une liste de lignes.');
      if (item.details !== undefined && !isRichText(item.details)) error(itemAt, '« details » doit être un texte ou une liste de lignes.');
      if (item.field !== undefined && typeof item.field !== 'boolean') error(itemAt, '« field » doit valoir true ou false.');
    });
  }

  /** Blocs d'un écran « scene ». */
  function checkBlocks(blocks, where, questionIds) {
    if (!Array.isArray(blocks) || blocks.length === 0) return error(where, '« blocks » doit contenir au moins un bloc.');

    blocks.forEach((block, j) => {
      const at = `${where} › bloc ${j + 1}${isText(block?.type) ? ` (${block.type})` : ''}`;
      if (!isObject(block)) return error(at, 'chaque bloc doit être un objet { "type": …, … }.');
      if (!BLOCK_TYPES.includes(block.type)) {
        return error(at, `« type » doit valoir ${BLOCK_TYPES.map((t) => `"${t}"`).join(', ')}.`);
      }

      switch (block.type) {
        case 'text':
          checkKeys(block, ALLOWED_KEYS.textBlock, at);
          if (block.title !== undefined && !isText(block.title)) error(at, '« title » doit être un texte.');
          if (!isRichText(block.body)) error(at, '« body » (le texte) est obligatoire.');
          if (block.image !== undefined) checkImage(block.image, `${at} › image`);
          break;

        case 'document':
          checkKeys(block, ALLOWED_KEYS.documentBlock, at);
          if (block.kind !== undefined && !DOCUMENT_KINDS.includes(block.kind)) {
            error(at, `« kind » doit valoir ${DOCUMENT_KINDS.map((k) => `"${k}"`).join(', ')}.`);
          }
          if (!isText(block.title)) error(at, '« title » est obligatoire.');
          if (block.subtitle !== undefined && !isText(block.subtitle)) error(at, '« subtitle » doit être un texte.');
          if (block.body !== undefined && !isRichText(block.body)) error(at, '« body » doit être un texte ou une liste de lignes.');
          if (block.body === undefined && block.data === undefined) error(at, 'ajoutez au moins « body » ou « data ».');
          if (block.data !== undefined) checkData(block.data, at);
          if (block.image !== undefined) checkImage(block.image, `${at} › image`);
          checkRecord(block, at);
          // Champs propres au courrier (allure de lettre) : texte ou liste de lignes
          for (const key of ['sender', 'recipient', 'date', 'signature', 'enclosures']) {
            if (block[key] === undefined) continue;
            if (block.kind !== 'courrier') error(at, `« ${key} » n'est utilisé que pour un document "courrier".`);
            else if (!isRichText(block[key])) error(at, `« ${key} » doit être un texte ou une liste de lignes.`);
          }
          break;

        case 'patientFile':
          checkKeys(block, ALLOWED_KEYS.patientFileBlock, at);
          if (!isObject(module.patientFile)) {
            error(at, 'ce bloc affiche la fiche « patientFile » définie à la racine de module.json, mais elle est absente.');
          }
          break;

        case 'form':
          checkKeys(block, ALLOWED_KEYS.formBlock, at);
          checkFormItems(block.items, at);
          break;

        case 'video':
          checkVideo(block, at, ALLOWED_KEYS.videoBlock);
          break;

        case 'writing':
          checkKeys(block, ALLOWED_KEYS.writingBlock, at);
          if (!isText(block.id) || !ID_PATTERN.test(block.id)) error(at, '« id » obligatoire : lettres sans accents, chiffres, « - » ou « _ ».');
          if (!isText(block.prompt)) error(at, '« prompt » (consigne de rédaction) est obligatoire.');
          if (!isRichText(block.model)) error(at, '« model » (exemple de réponse) est obligatoire.');
          if (block.placeholder !== undefined && !isText(block.placeholder)) error(at, '« placeholder » doit être un texte.');
          if (block.checklist !== undefined && !(Array.isArray(block.checklist) && block.checklist.every(isText))) error(at, '« checklist » doit être une liste de textes.');
          break;

        case 'attachment':
          checkKeys(block, ALLOWED_KEYS.attachmentBlock, at);
          if (!isText(block.title)) error(at, '« title » (nom du document) est obligatoire.');
          checkFile(block.src, at, 'src', /\.pdf$/i, 'pdf');
          for (const key of ['meta', 'label']) {
            if (block[key] !== undefined && !isText(block[key])) error(at, `« ${key} » doit être un texte.`);
          }
          if (block.preview !== undefined) {
            const previewAt = `${at} › preview`;
            if (!isObject(block.preview)) {
              error(previewAt, 'doit être un objet { "fields": […], "items": […], "footer": […] }.');
            } else {
              checkKeys(block.preview, ALLOWED_KEYS.preview, previewAt);
              checkFormItems(block.preview.items, previewAt);
              if (block.preview.fields !== undefined && !(Array.isArray(block.preview.fields) && block.preview.fields.every(isText))) {
                error(previewAt, '« fields » doit être une liste de textes (champs d\'en-tête du formulaire).');
              }
              if (block.preview.footer !== undefined && !isRichText(block.preview.footer)) {
                error(previewAt, '« footer » doit être un texte ou une liste de lignes.');
              }
            }
          }
          break;

        case 'callout':
          checkKeys(block, ALLOWED_KEYS.calloutBlock, at);
          if (block.title !== undefined && !isText(block.title)) error(at, '« title » doit être un texte.');
          if (!isRichText(block.body)) error(at, '« body » (le texte de l\'encadré) est obligatoire.');
          break;

        case 'question': {
          const label = isText(block.id) ? ` « ${block.id} »` : '';
          checkQuestion(block, `${where} › question${label}`, questionIds, ALLOWED_KEYS.questionBlock);
          break;
        }

        case 'reveal':
          checkKeys(block, ALLOWED_KEYS.revealBlock, at);
          if (!isText(block.label)) error(at, '« label » (texte du bouton, ex. "Ouvrir le dossier") est obligatoire.');
          if (j === 0) error(at, 'une scène ne peut pas commencer par un bouton « reveal ».');
          if (j === blocks.length - 1) error(at, 'une scène ne peut pas se terminer par un bouton « reveal » : utilisez « continueLabel ».');
          if (blocks[j - 1]?.type === 'reveal') error(at, 'deux boutons « reveal » se suivent sans contenu entre eux.');
          break;
      }
    });
  }

  /* ---------- Racine ---------- */

  if (!isObject(module)) {
    error('module.json', 'le fichier doit contenir un objet { … }.');
    return { errors, warnings };
  }
  checkKeys(module, ALLOWED_KEYS.module, 'module');

  if (module.schemaVersion !== 1) error('module', '« schemaVersion » doit valoir 1.');
  if (!isText(module.id) || !ID_PATTERN.test(module.id)) {
    error('module', '« id » obligatoire : lettres sans accents, chiffres, « - » ou « _ », sans espace (ex. "rapport-medical-ai").');
  }
  if (!isText(module.version) || !VERSION_PATTERN.test(module.version)) error('module', '« version » doit avoir la forme "1.0.0".');
  if (!isText(module.title)) error('module', '« title » est obligatoire.');
  if (module.language !== undefined && module.language !== 'fr') warn('module', `langue « ${module.language} » : l'interface du module est en français.`);
  if (module.durationMinutes !== undefined && !(typeof module.durationMinutes === 'number' && module.durationMinutes > 0)) {
    error('module', '« durationMinutes » doit être un nombre positif.');
  }
  if (module.storyTitle !== undefined && !isText(module.storyTitle)) error('module', '« storyTitle » doit être un texte (ex. "Rapport de Mme R.").');
  if (module.help !== undefined) {
    if (!isObject(module.help)) {
      error('module', '« help » doit être un objet { "title": …, "body": […] }.');
    } else {
      checkKeys(module.help, ['title', 'body', 'phone', 'email'], 'help');
      if (module.help.phone !== undefined && !isText(module.help.phone)) error('help', '« phone » doit être un texte (ex. "021 925 24 24").');
      if (module.help.email !== undefined && !(isText(module.help.email) && module.help.email.includes('@'))) error('help', '« email » doit être une adresse électronique (ex. "info@vd.oai.ch").');
      if (!isText(module.help.title)) error('help', '« title » est obligatoire (ex. "Une question ?").');
      if (!isRichText(module.help.body)) error('help', '« body » est obligatoire.');
    }
  }
  if (module.glossary !== undefined) {
    const glossary = module.glossary;
    if (!isObject(glossary)) {
      error('module', '« glossary » doit être un objet { "title": …, "sections": […] }.');
    } else {
      checkKeys(glossary, ['title', 'source', 'sections'], 'glossary');
      if (glossary.title !== undefined && !isText(glossary.title)) error('glossary', '« title » doit être un texte.');
      if (glossary.source !== undefined && !isText(glossary.source)) error('glossary', '« source » doit être un texte.');
      if (!Array.isArray(glossary.sections) || glossary.sections.length === 0) {
        error('glossary', '« sections » doit contenir au moins une rubrique { "title": …, "terms": […] }.');
      } else {
        glossary.sections.forEach((section, i) => {
          const at = `glossary › rubrique ${i + 1}`;
          if (!isObject(section)) return error(at, 'doit être un objet { "title": …, "terms": […] }.');
          checkKeys(section, ['title', 'terms'], at);
          if (!isText(section.title)) error(at, '« title » est obligatoire.');
          if (!Array.isArray(section.terms) || section.terms.length === 0) return error(at, '« terms » doit contenir au moins un terme.');
          section.terms.forEach((entry, j) => {
            const entryAt = `${at} › terme ${j + 1}`;
            if (!isObject(entry)) return error(entryAt, 'doit être un objet { "term": …, "definition": … }.');
            checkKeys(entry, ['term', 'definition'], entryAt);
            if (!isText(entry.term) || !isText(entry.definition)) error(entryAt, '« term » et « definition » sont obligatoires.');
          });
        });
      }
    }
  }
  if (module.logo !== undefined) {
    if (!isObject(module.logo)) {
      error('module', '« logo » doit être un objet { "src": …, "alt": … }.');
    } else {
      checkKeys(module.logo, ALLOWED_KEYS.logo, 'logo');
      checkImage(module.logo, 'logo');
    }
  }
  if (module.patientFile !== undefined) {
    const file = module.patientFile;
    if (!isObject(file)) {
      error('module', '« patientFile » doit être un objet { "title": …, "data": [ … ] }.');
    } else {
      checkKeys(file, ALLOWED_KEYS.patientFile, 'patientFile');
      if (!isText(file.title)) error('patientFile', '« title » est obligatoire (ex. "Mme R., 47 ans").');
      if (file.subtitle !== undefined && !isText(file.subtitle)) error('patientFile', '« subtitle » doit être un texte.');
      if (file.body !== undefined && !isRichText(file.body)) error('patientFile', '« body » doit être un texte ou une liste de lignes.');
      if (file.body === undefined && file.data === undefined && file.sections === undefined) error('patientFile', 'ajoutez au moins « body », « data » ou « sections ».');
      if (file.data !== undefined) checkData(file.data, 'patientFile');
      if (file.image !== undefined) checkImage(file.image, 'patientFile › image');
      checkRecord(file, 'patientFile');
    }
  }
  if (module.report !== undefined) {
    const report = module.report;
    if (!isObject(report)) {
      error('module', '« report » doit être un objet { "title": …, "availableFrom": …, "header": [ … ] }.');
    } else {
      checkKeys(report, ALLOWED_KEYS.report, 'report');
      if (!isText(report.title)) error('report', '« title » est obligatoire (ex. "Rapport médical de Mme R.").');
      for (const key of ['availableFrom', 'fileName', 'note']) {
        if (report[key] !== undefined && !isText(report[key])) error('report', `« ${key} » doit être un texte.`);
      }
      if (report.header !== undefined) checkData(report.header, 'report');
    }
  }
  if (module.form !== undefined) {
    if (!isObject(module.form)) {
      error('module', '« form » doit être un objet { "title": …, "reference": … }.');
    } else {
      checkKeys(module.form, ALLOWED_KEYS.form, 'form');
      for (const key of ['title', 'reference']) {
        if (module.form[key] !== undefined && !isText(module.form[key])) error('form', `« ${key} » doit être un texte.`);
      }
    }
  }

  if (module.scoring !== undefined) {
    if (!isObject(module.scoring)) {
      error('module', '« scoring » doit être un objet { "passingScore": …, "allowRetry": … }.');
    } else {
      checkKeys(module.scoring, ALLOWED_KEYS.scoring, 'scoring');
      const { passingScore, allowRetry } = module.scoring;
      if (passingScore !== undefined && !(typeof passingScore === 'number' && passingScore >= 0 && passingScore <= 100)) {
        error('scoring', '« passingScore » doit être un nombre entre 0 et 100 (pourcentage).');
      }
      if (allowRetry !== undefined && typeof allowRetry !== 'boolean') error('scoring', '« allowRetry » doit valoir true ou false.');
    }
  }

  /* ---------- Écrans ---------- */

  if (!Array.isArray(module.screens) || module.screens.length === 0) {
    error('module', '« screens » doit contenir au moins un écran.');
    return { errors, warnings };
  }

  const screenIds = new Set();
  const questionIds = new Set();
  const surveyIds = new Set();
  const summaries = [];
  let hasQuestions = false;

  module.screens.forEach((screen, i) => {
    const label = isText(screen?.id) ? ` « ${screen.id} »` : '';
    const where = `écran ${i + 1}${label}`;
    if (!isObject(screen)) return error(where, 'chaque écran doit être un objet { … }.');

    if (!isText(screen.id) || !ID_PATTERN.test(screen.id)) {
      error(where, '« id » obligatoire : lettres sans accents, chiffres, « - » ou « _ », sans espace.');
    } else if (screenIds.has(screen.id)) {
      error(where, `l'identifiant « ${screen.id} » est déjà utilisé par un autre écran.`);
    } else {
      screenIds.add(screen.id);
    }
    if (!isText(screen.title)) error(where, '« title » est obligatoire.');
    if (screen.type === 'case') {
      return error(where, 'le type "case" a été remplacé par "scene" : voir README.md.');
    }
    if (!SCREEN_TYPES.includes(screen.type)) {
      return error(where, `« type » doit valoir ${SCREEN_TYPES.map((t) => `"${t}"`).join(', ')}.`);
    }
    checkKeys(screen, ALLOWED_KEYS[screen.type], where);
    if (screen.hidePatientFile !== undefined && typeof screen.hidePatientFile !== 'boolean') error(where, '« hidePatientFile » doit valoir true ou false.');
    for (const key of ['hideReport', 'showReport', 'hideKicker']) {
      if (screen[key] !== undefined && typeof screen[key] !== 'boolean') error(where, `« ${key} » doit valoir true ou false.`);
    }
    if (screen.optional !== undefined && typeof screen.optional !== 'boolean') error(where, '« optional » doit valoir true ou false.');
    for (const key of ['kicker', 'continueLabel', 'storyTitle', 'section', 'part']) {
      if (screen[key] !== undefined && !isText(screen[key])) error(where, `« ${key} » doit être un texte.`);
    }

    switch (screen.type) {
      case 'text':
        if (!isRichText(screen.body)) error(where, '« body » (le texte de l\'écran) est obligatoire.');
        if (screen.image !== undefined) checkImage(screen.image, `${where} › image`);
        if (screen.video !== undefined) checkVideo(screen.video, `${where} › video`);
        if (screen.objectives !== undefined) {
          const at = `${where} › objectives`;
          if (!isObject(screen.objectives) || !Array.isArray(screen.objectives.items) || screen.objectives.items.length === 0) {
            error(at, '« objectives » doit contenir au moins un objectif : { "title": …, "items": [ "…" ] }.');
          } else {
            checkKeys(screen.objectives, ALLOWED_KEYS.objectives, at);
            if (screen.objectives.title !== undefined && !isText(screen.objectives.title)) error(at, '« title » doit être un texte.');
            screen.objectives.items.forEach((item, k) => {
              if (!isText(item)) error(`${at} › objectif ${k + 1}`, 'doit être un texte.');
            });
          }
        }
        if (screen.layout !== undefined && !['editorial', 'hero'].includes(screen.layout)) error(where, '« layout » doit valoir "hero" ou "editorial".');
        if (screen.facts !== undefined) {
          const at = `${where} › facts`;
          if (!Array.isArray(screen.facts)) {
            error(at, '« facts » doit être une liste de repères { "icon": "clock", "text": "…" }.');
          } else {
            screen.facts.forEach((fact, k) => {
              const factAt = `${at} › repère ${k + 1}`;
              if (!isObject(fact)) return error(factAt, 'doit être un objet { "icon": …, "text": … }.');
              checkKeys(fact, ALLOWED_KEYS.fact, factAt);
              if (!['clock', 'questions', 'resume'].includes(fact.icon)) error(factAt, '« icon » doit valoir "clock", "questions" ou "resume".');
              if (!isText(fact.text)) error(factAt, '« text » est obligatoire (peut citer {minutes} et {questions}).');
            });
          }
        }
        if (screen.journey !== undefined) {
          const at = `${where} › journey`;
          if (!isObject(screen.journey) || !Array.isArray(screen.journey.steps) || screen.journey.steps.length < 2) {
            error(at, '« journey » doit contenir au moins deux étapes : { "steps": [ { "icon": …, "label": … } ] }.');
          } else {
            checkKeys(screen.journey, ALLOWED_KEYS.journey, at);
            screen.journey.steps.forEach((step, k) => {
              const stepAt = `${at} › étape ${k + 1}`;
              if (!isObject(step)) return error(stepAt, 'doit être un objet { "icon": …, "label": … }.');
              checkKeys(step, ALLOWED_KEYS.journeyStep, stepAt);
              if (!isText(step.label)) error(stepAt, '« label » est obligatoire.');
              if (!JOURNEY_ICONS.includes(step.icon)) error(stepAt, `« icon » doit valoir ${JOURNEY_ICONS.map((i) => `"${i}"`).join(', ')}.`);
              if (step.text !== undefined && !isText(step.text)) error(stepAt, '« text » doit être un texte.');
            });
          }
        }
        break;

      case 'scene':
        if (screen.consigne !== undefined && !isRichText(screen.consigne)) error(where, '« consigne » doit être un texte ou une liste de lignes.');
        checkBlocks(screen.blocks, where, questionIds);
        if (screen.blocks?.some?.((block) => block?.type === 'question')) hasQuestions = true;
        break;

      case 'quiz':
        if (screen.body !== undefined && !isRichText(screen.body)) error(where, '« body » doit être un texte ou une liste de lignes.');
        checkQuestions(screen.questions, where, questionIds);
        hasQuestions = true;
        break;

      case 'survey': {
        if (screen.intro !== undefined && !isRichText(screen.intro)) error(where, '« intro » doit être un texte ou une liste de lignes.');
        if (screen.thanks !== undefined && !isRichText(screen.thanks)) error(where, '« thanks » doit être un texte ou une liste de lignes.');
        for (const key of ['submitLabel', 'privacy']) {
          if (screen[key] !== undefined && !isText(screen[key])) error(where, `« ${key} » doit être un texte.`);
        }
        if (screen.scaleLabels !== undefined && !(Array.isArray(screen.scaleLabels) && screen.scaleLabels.length >= 2 && screen.scaleLabels.every(isText))) {
          error(where, '« scaleLabels » doit être une liste d\'au moins deux libellés (du plus faible au plus fort accord).');
        }
        if (!Array.isArray(screen.steps) || screen.steps.length === 0) {
          error(where, '« steps » est obligatoire : au moins une étape { "title": …, "items": [ … ] }.');
          break;
        }
        screen.steps.forEach((step, s) => {
          const at = `${where} › étape ${s + 1}`;
          if (!isObject(step)) return error(at, 'doit être un objet { "title": …, "items": [ … ] }.');
          checkKeys(step, ALLOWED_KEYS.surveyStep, at);
          if (!isText(step.title)) error(at, '« title » est obligatoire.');
          if (!Array.isArray(step.items) || step.items.length === 0) return error(at, '« items » doit contenir au moins une question.');
          step.items.forEach((item, k) => {
            const itemAt = `${at} › question ${k + 1}`;
            if (!isObject(item)) return error(itemAt, 'doit être un objet.');
            checkKeys(item, ALLOWED_KEYS.surveyItem, itemAt);
            if (!isText(item.id) || !/^[a-z0-9-]{1,24}$/.test(item.id)) error(itemAt, '« id » est obligatoire : lettres minuscules, chiffres et tirets, 24 caractères au plus.');
            else if (surveyIds.has(item.id)) error(itemAt, `l'id « ${item.id} » est déjà utilisé dans le questionnaire.`);
            else surveyIds.add(item.id);
            if (!SURVEY_KINDS.includes(item.kind)) error(itemAt, `« kind » doit valoir ${SURVEY_KINDS.map((x) => `"${x}"`).join(', ')}.`);
            if (!isText(item.prompt)) error(itemAt, '« prompt » (l\'énoncé) est obligatoire.');
            if (item.kind === 'choice' || item.kind === 'multiple') {
              if (!Array.isArray(item.options) || item.options.length < 2) return error(itemAt, '« options » : au moins deux réponses { "id": "a", "text": … }.');
              const optionIds = new Set();
              item.options.forEach((option) => {
                if (!isObject(option) || !/^[a-z0-9]$/.test(option.id ?? '') || !isText(option.text)) {
                  error(itemAt, 'chaque option doit avoir un « id » d\'un caractère [a-z0-9] et un « text ».');
                } else if (optionIds.has(option.id)) {
                  error(itemAt, `l'option « ${option.id} » est en double.`);
                } else {
                  optionIds.add(option.id);
                }
              });
            } else if (item.options !== undefined) {
              error(itemAt, '« options » n\'est utilisé que pour "choice" et "multiple".');
            }
          });
        });
        break;
      }

      case 'summary':
        summaries.push(i);
        if (screen.keyPoints !== undefined && !(Array.isArray(screen.keyPoints) && screen.keyPoints.every(isText))) {
          error(where, '« keyPoints » doit être une liste de textes.');
        }
        if (screen.body !== undefined && !isRichText(screen.body)) error(where, '« body » doit être un texte ou une liste de lignes.');
        if (screen.showScore !== undefined && typeof screen.showScore !== 'boolean') error(where, '« showScore » doit valoir true ou false.');
        if (screen.messages !== undefined) {
          if (!isObject(screen.messages)) {
            error(where, '« messages » doit être un objet { "passed": …, "failed": … }.');
          } else {
            checkKeys(screen.messages, ALLOWED_KEYS.messages, `${where} › messages`);
            for (const [key, value] of Object.entries(screen.messages)) {
              if (!isRichText(value)) error(where, `message « ${key} » doit être un texte.`);
            }
          }
        }
        break;
    }
  });

  if (summaries.length === 0) {
    warn('module', 'aucun écran "summary" : l\'apprenant ne verra pas son score à la fin.');
  } else if (summaries.length > 1) {
    error('module', 'il ne peut y avoir qu\'un écran "summary".');
  } else if (module.screens.slice(summaries[0] + 1).some((screen) => screen?.type !== 'text' && screen?.type !== 'survey')) {
    // Après la synthèse : seulement des écrans « text » (ex. remerciements), qui ne conditionnent pas la complétion
    error('module', 'après l\'écran "summary", seuls des écrans "text" et "survey" sont admis (ex. questionnaire, remerciements).');
  }
  if (hasQuestions && module.scoring?.passingScore === undefined) {
    warn('scoring', '« passingScore » absent : seuil de réussite par défaut de 80 %.');
  }

  if (module.report?.availableFrom !== undefined && !screenIds.has(module.report.availableFrom)) {
    error('report', `« availableFrom » doit être l'identifiant d'un écran existant (reçu : « ${module.report.availableFrom} »).`);
  }
  {
    const withAnswer = module.screens.filter((screen) => allQuestions({ screens: [screen] }).some((q) => q.reportAnswer !== undefined));
    if (withAnswer.length && module.report === undefined) {
      error('module', 'des questions ont un « reportAnswer » : ajoutez « report » à la racine ({ "title": … }).');
    }
    for (const screen of withAnswer) {
      if (!screen.blocks?.some((block) => block?.type === 'form')) {
        warn(`écran « ${screen.id} »`, 'une question a un « reportAnswer » mais l\'écran n\'a pas de bloc « form » : l\'intitulé du champ sera tiré de l\'énoncé.');
      }
    }
    if (module.screens.some((screen) => screen?.showReport === true) && module.report === undefined) {
      error('module', '« showReport » est utilisé : ajoutez « report » à la racine.');
    }
  }
  if (module.patientFile?.availableFrom !== undefined && !screenIds.has(module.patientFile.availableFrom)) {
    error('patientFile', `« availableFrom » doit être l'identifiant d'un écran existant (reçu : « ${module.patientFile.availableFrom} »).`);
  }

  // Taille maximale de suspend_data (SCORM 1.2 : 4096 caractères)
  const scenes = module.screens.filter((screen) => screen?.type === 'scene' && Array.isArray(screen.blocks));
  const worstCase = JSON.stringify({
    v: 1,
    c: [...screenIds].reduce((a, b) => (b.length > a.length ? b : a), ''),
    s: [...screenIds],
    r: Object.fromEntries(scenes.map((screen) => [screen.id, screen.blocks.length])),
    a: Object.fromEntries(
      allQuestions(module).map((q) => [q.id, (q.options ?? []).map((o) => o?.id).join('')]),
    ),
    n: 99,
  });
  if (worstCase.length > SCORM12_SUSPEND_LIMIT) {
    warn('module', `la progression sauvegardée pourrait atteindre ${worstCase.length} caractères, au-delà de la limite SCORM 1.2 (${SCORM12_SUSPEND_LIMIT}). Raccourcissez les identifiants ou découpez le module.`);
  }

  return { errors, warnings };
}

/** Toutes les questions du module : écrans « quiz » et blocs « question » des scènes. */
function allQuestions(module) {
  return (module.screens ?? []).flatMap((screen) => {
    if (screen?.type === 'quiz' && Array.isArray(screen.questions)) return screen.questions.filter(isObject);
    if (screen?.type === 'scene' && Array.isArray(screen.blocks)) return screen.blocks.filter((b) => b?.type === 'question');
    return [];
  });
}

/** Lit et valide. Retourne { module, errors, warnings }. */
export function checkModuleFile(file = MODULE_FILE) {
  const { module, error } = readModule(file);
  if (error) return { module: null, errors: [error], warnings: [] };
  return { module, ...validateModule(module) };
}

export function printReport({ module, errors, warnings }) {
  for (const message of warnings) console.warn(`  Avertissement – ${message}`);
  for (const message of errors) console.error(`  Erreur – ${message}`);
  if (errors.length) {
    console.error(`\ncontent/module.json : ${errors.length} erreur(s), ${warnings.length} avertissement(s).`);
  } else {
    const questionCount = allQuestions(module).length;
    console.log(
      `content/module.json est valide : ${module.screens.length} écrans, ${questionCount} questions` +
        (warnings.length ? `, ${warnings.length} avertissement(s).` : '.'),
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = checkModuleFile();
  printReport(report);
  process.exitCode = report.errors.length ? 1 : 0;
}
