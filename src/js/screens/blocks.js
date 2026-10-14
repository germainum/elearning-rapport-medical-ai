/**
 * Blocs d'une scène : text, attachment, video, patientFile, document, form, callout.
 * (Les blocs « question » sont rendus par question.js, les « reveal » par scene.js.)
 */

import { escapeHtml, inline, rich } from '../format.js';
import { figure, openModal, videoFigure } from './common.js';

const DOCUMENT_LABELS = {
  dossier: 'Dossier patient',
  courrier: 'Courrier',
  note: 'Note',
};

const ICON_DOCUMENT = `
  <svg class="attachment__icon" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" focusable="false">
    <path d="M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
    <path d="M14 2v5h5M8.5 12h7M8.5 15.5h7M8.5 19h4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

// Même icône que le bouton « Dossier patient » du bandeau (src/index.html)
const ICON_CLIPBOARD = `
  <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
    <path d="M9 4h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2V5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M9 4h6v3H9zM8.5 12h7M8.5 16h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

export function renderBlock(block, ctx) {
  const element = document.createElement('div');
  element.className = `block block--${block.type}`;
  element.innerHTML = BLOCKS[block.type]?.(block, ctx) ?? '';
  if (block.type === 'attachment') wireAttachment(element, block, ctx);
  return element;
}

/** Nom proposé au téléchargement : celui du fichier dans le paquet. */
const fileName = (src) => src.split('/').pop();

/** Le bouton de la pièce jointe ouvre une fenêtre : aperçu HTML du document + téléchargement du PDF. */
function wireAttachment(element, block, ctx) {
  const button = element.querySelector('.attachment__open');
  if (!block.preview) return; // sans aperçu, le bouton est un simple lien vers le PDF
  button.addEventListener('click', () => {
    const href = escapeHtml(ctx.asset(block.src));
    openModal({
      title: block.title,
      bodyHtml: formSheet(block.preview, ctx),
      actionsHtml: `
        <a class="btn btn--primary btn--small" href="${href}" download="${escapeHtml(fileName(block.src))}">
          Télécharger le PDF${block.meta ? `<span class="visually-hidden"> (${escapeHtml(block.meta)})</span>` : ''}
        </a>`,
    });
  });
}

/** Questions numérotées d'un formulaire : vides, remplies (« exemple de réponse ») ou explicatives. */
function formItems(items) {
  return items
    .map((item) => {
      let field = '';
      if (item.answer) {
        field = `
          <div class="form-sheet__answer">
            <span class="form-sheet__answer-label">Exemple de réponse</span>
            ${rich(item.answer)}
          </div>`;
      } else if (item.field !== false) {
        field = `
          <div class="form-sheet__blank" aria-hidden="true"></div>
          <p class="visually-hidden">Champ à remplir.</p>`;
      }
      const labelClass = item.field === false ? 'form-sheet__label form-sheet__label--info' : 'form-sheet__label';
      const details = item.details ? `<div class="form-sheet__details">${rich(item.details)}</div>` : '';
      return `
        <li class="form-sheet__item"${item.number ? ` value="${Number(item.number)}"` : ''}>
          <p class="${labelClass}">${inline(item.label)}</p>
          ${details}
          ${field}
        </li>`;
    })
    .join('');
}

/** Feuille de formulaire : en-tête, champs d'identification, questions, pied de page. */
function formSheet(sheet, ctx) {
  // Titre et référence par défaut : « form » à la racine de module.json
  const title = sheet.title ?? ctx.form?.title;
  const reference = sheet.reference ?? ctx.form?.reference;
  const fields = sheet.fields?.length
    ? `<dl class="form-sheet__fields">${sheet.fields
        .map((label) => `<div class="form-sheet__field"><dt>${inline(label)}</dt><dd aria-hidden="true"></dd></div>`)
        .join('')}</dl>`
    : '';
  const footer = sheet.footer ? `<div class="form-sheet__footer prose">${rich(sheet.footer)}</div>` : '';
  return `
    <section class="form-sheet" aria-label="${escapeHtml(title ?? 'Formulaire')}">
      <header class="form-sheet__header">
        ${title ? `<span class="form-sheet__title">${inline(title)}</span>` : ''}
        ${reference ? `<span class="form-sheet__ref">${inline(reference)}</span>` : ''}
      </header>
      ${fields}
      <ol class="form-sheet__items">${formItems(sheet.items)}</ol>
      ${footer}
    </section>`;
}

const BLOCKS = {
  /** Texte avec titre et image facultatifs. */
  text(block, ctx) {
    const title = block.title ? `<h3 class="block__title">${inline(block.title)}</h3>` : '';
    const body = `<div class="prose">${title}${rich(block.body)}</div>`;
    if (!block.image) return body;
    const position = block.image.position ?? 'top';
    const image = figure(block.image, ctx.asset);
    return `<div class="layout layout--${position}">${position === 'bottom' ? body + image : image + body}</div>`;
  },

  /**
   * Pièce jointe PDF. Avec « preview » : le bouton ouvre une fenêtre (aperçu + téléchargement).
   * Sans « preview » : le bouton ouvre le PDF dans un nouvel onglet.
   */
  attachment(block, ctx) {
    const label = inline(block.label ?? (block.preview ? 'Voir le document' : 'Ouvrir le document'));
    const button = block.preview
      ? `<button type="button" class="btn btn--secondary attachment__open" aria-haspopup="dialog">${label}</button>`
      : `<a class="btn btn--secondary attachment__open" href="${escapeHtml(ctx.asset(block.src))}" target="_blank" rel="noopener">
           ${label}<span class="visually-hidden"> (PDF, nouvel onglet)</span>
         </a>`;
    return `
      <div class="attachment">
        ${ICON_DOCUMENT}
        <div class="attachment__text">
          <p class="attachment__label">Pièce jointe</p>
          <p class="attachment__title">${inline(block.title)}</p>
          ${block.meta ? `<p class="attachment__meta">${inline(block.meta)}</p>` : ''}
        </div>
        ${button}
      </div>`;
  },

  /** Vidéo embarquée avec sous-titres et transcription. */
  video(block, ctx) {
    return videoFigure(block, ctx.asset);
  },

  /** Fiche du patient définie une seule fois à la racine (« patientFile ») ; aussi consultable via le bouton « Dossier ». */
  patientFile(block, ctx) {
    if (!ctx.patientFile) return '';
    const file = BLOCKS.document({ kind: 'dossier', ...ctx.patientFile }, ctx);
    if (block.inDialog) return file;
    // Dans la scène : signaler le bouton « Dossier patient » du bandeau, avec la même icône
    return `${file}
      <p class="doc__hint">
        <span class="doc__hint-icon" aria-hidden="true">${ICON_CLIPBOARD}</span>
        <span class="only-narrow">Ce dossier reste consultable à tout moment avec le bouton <strong>Dossier patient</strong>, en haut de l'écran.</span>
        <span class="only-wide">Ce dossier reste affiché dans la colonne <strong>Dossier patient</strong>, à droite de l'écran, pendant tout le module.</span>
      </p>`;
  },

  /** Pièce du dossier : fiche patient, courrier reçu, note. */
  document(block, ctx) {
    const kind = block.kind ?? 'dossier';
    const data = block.data?.length
      ? `<dl class="doc__data">${block.data
          .map((item) => `<div class="doc__datum"><dt>${inline(item.label)}</dt><dd>${inline(item.value)}</dd></div>`)
          .join('')}</dl>`
      : '';
    const portrait = block.image ? figure(block.image, ctx.asset, 'portrait') : '';
    return `
      <section class="doc doc--${escapeHtml(kind)}" aria-label="${escapeHtml(DOCUMENT_LABELS[kind] ?? 'Document')}">
        <p class="doc__label">${escapeHtml(DOCUMENT_LABELS[kind] ?? 'Document')}</p>
        <div class="doc__head">
          ${portrait}
          <div>
            <h3 class="doc__title">${inline(block.title)}</h3>
            ${block.subtitle ? `<p class="doc__subtitle">${inline(block.subtitle)}</p>` : ''}
          </div>
        </div>
        ${block.body ? `<div class="prose">${rich(block.body)}</div>` : ''}
        ${data}
      </section>`;
  },

  /** Extrait du formulaire : questions telles qu'elles figurent sur le document. */
  form(block, ctx) {
    return formSheet(block, ctx);
  },

  /** Encadré « À retenir ». */
  callout(block) {
    return `
      <aside class="callout" aria-label="${escapeHtml(block.title ?? 'À retenir')}">
        <p class="callout__title">${inline(block.title ?? 'À retenir')}</p>
        <div class="prose">${rich(block.body)}</div>
      </aside>`;
  },
};
