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
const ICON_FOLDER = `
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  </svg>`;

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
  if (block.type === 'writing') wireWriting(element, block, ctx);
  return element;
}

/**
 * Exercice de rédaction : le texte reste dans ce navigateur (non noté, non transmis au LMS).
 * « Comparer » dévoile un exemple de réponse et une grille d'auto-vérification.
 */
function wireWriting(element, block, ctx) {
  const textarea = element.querySelector('textarea');
  const compare = element.querySelector('.writing__compare');
  const key = `redaction:${ctx.moduleId}:${block.id}`;
  try {
    textarea.value = localStorage.getItem(key) ?? '';
  } catch {
    // Stockage indisponible : le texte n'est simplement pas conservé
  }
  textarea.addEventListener('input', () => {
    try {
      localStorage.setItem(key, textarea.value);
    } catch {
      // idem
    }
  });
  element.querySelector('.writing__button').addEventListener('click', (event) => {
    compare.hidden = false;
    event.currentTarget.remove();
    compare.focus();
  });
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

/**
 * Dossier médical papier : feuille perforée (marge rouge), en-tête « Dossier médical » et n° de dossier,
 * photo agrafée, notes, rubriques en lignes de formulaire, journal des consultations daté, tampon décoratif.
 * folder : la fiche est glissée dans une chemise cartonnée à onglet (dans une scène).
 * Dans la chemise latérale (ordinateur), la feuille de la chemise sert de papier : voir « .folder .record ».
 */
function medicalRecord(file, ctx, { folder = false } = {}) {
  const rows = (data) =>
    `<dl class="record__rows">${data
      .map((item) => `<div class="record__row"><dt>${inline(item.label)}</dt><dd>${inline(item.value)}</dd></div>`)
      .join('')}</dl>`;
  const section = (title, content) => `
    <section class="record__section">
      <h4 class="record__section-title">${inline(title)}</h4>
      ${content}
    </section>`;

  const photo = file.image ? `<div class="record__photo">${figure(file.image, ctx.asset, 'portrait')}</div>` : '';
  const notes = file.body ? section('Notes', `<div class="record__notes">${rich(file.body)}</div>`) : '';
  const data = file.data?.length ? section('Renseignements', rows(file.data)) : '';
  const sections = (file.sections ?? []).map((s) => section(s.title, rows(s.data))).join('');
  const journal = file.journal?.length
    ? section(
        'Journal des consultations',
        `<ol class="record__journal">${file.journal
          .map((entry) => `<li><span class="record__date">${inline(entry.date)}</span><span>${inline(entry.text)}</span></li>`)
          .join('')}</ol>`
      )
    : '';

  const sheet = `
    <article class="record" aria-label="Dossier médical">
      <header class="record__top">
        <span class="record__kind">Dossier médical</span>
        ${file.reference ? `<span class="record__ref">${inline(file.reference)}</span>` : ''}
      </header>
      <div class="record__identity">
        ${photo}
        <div>
          <h3 class="record__name">${inline(file.title)}</h3>
          ${file.subtitle ? `<p class="record__subtitle">${inline(file.subtitle)}</p>` : ''}
        </div>
      </div>
      ${notes}${data}${sections}${journal}
      <span class="record__stamp" aria-hidden="true">Confidentiel</span>
    </article>`;
  if (!folder) return sheet;
  return `
    <div class="record-folder">
      <p class="record-folder__tab">${ICON_FOLDER}<span>Dossier patient</span></p>
      ${sheet}
    </div>`;
}

/**
 * Courrier reçu : carte avec en-tête, logo, expéditeur, destinataire,
 * lieu et date, « Concerne », corps, signature et annexes.
 */
function letter(block, ctx) {
  const lines = (value) => [].concat(value ?? []).map(inline).join('<br>');
  const logo = ctx.logo ? `<img class="letter__logo" src="${escapeHtml(ctx.asset(ctx.logo.src))}" alt="${escapeHtml(ctx.logo.alt ?? '')}">` : '';
  const enclosures = [].concat(block.enclosures ?? []);
  return `
    <section class="letter" aria-label="Courrier reçu">
      <div class="letter__paper">
        <header class="letter__head">
          ${logo}
          <div class="letter__sender">
            <h3 class="letter__from">${inline(block.title)}</h3>
            ${block.sender ? `<address>${lines(block.sender)}</address>` : ''}
          </div>
        </header>
        ${block.recipient ? `<address class="letter__recipient">${lines(block.recipient)}</address>` : ''}
        ${block.date ? `<p class="letter__date">${inline(block.date)}</p>` : ''}
        ${block.subtitle ? `<p class="letter__reference">${inline(block.subtitle)}</p>` : ''}
        ${block.body ? `<div class="letter__body">${rich(block.body)}</div>` : ''}
        ${block.signature ? `<p class="letter__signature">${lines(block.signature)}</p>` : ''}
        ${enclosures.length ? `<p class="letter__enclosures">${enclosures.map(inline).join('<br>')}</p>` : ''}
      </div>
    </section>`;
}

/** Questions numérotées d'un formulaire (« 2.5 », « 3 »…) : vides, remplies (« exemple de réponse ») ou explicatives. */
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
      const number = item.number !== undefined ? `<span class="form-sheet__num">${escapeHtml(String(item.number))}</span> ` : '';
      return `
        <li class="form-sheet__item">
          <p class="${labelClass}">${number}${inline(item.label)}</p>
          ${details}
          ${field}
        </li>`;
    })
    .join('');
}

/** Découpe les questions en groupes, chacun précédé de son titre de section (« 2 Situation médicale »). */
function formGroups(items, { skipFirstSection = false } = {}) {
  const groups = [];
  for (const item of items) {
    if (item.section) groups.push({ section: item.section, items: [] });
    else {
      if (!groups.length) groups.push({ section: null, items: [] });
      groups.at(-1).items.push(item);
    }
  }
  return groups
    .map(
      (group, g) => `
        ${group.section && !(skipFirstSection && g === 0) ? `<p class="form-sheet__section">${inline(group.section)}</p>` : ''}
        ${group.items.length ? `<ol class="form-sheet__items">${formItems(group.items)}</ol>` : ''}`
    )
    .join('');
}

/**
 * Feuille de formulaire : en-tête, champs d'identification, questions, pied de page.
 * compact : extrait d'une scène, en-tête sur une seule ligne (section ou annexe à gauche, référence à droite) au lieu du
 * titre du formulaire + bandeau de section : la question suivante remonte dans l'écran.
 */
function formSheet(sheet, ctx, { compact = false } = {}) {
  const firstSection = compact && !sheet.title ? sheet.items.find((item) => item.section)?.section : null;
  // Titre et référence par défaut : « form » à la racine de module.json
  const title = sheet.title ?? firstSection ?? ctx.form?.title;
  const reference = sheet.reference ?? ctx.form?.reference;
  const fields = sheet.fields?.length
    ? `<dl class="form-sheet__fields">${sheet.fields
        .map((label) => `<div class="form-sheet__field"><dt>${inline(label)}</dt><dd aria-hidden="true"></dd></div>`)
        .join('')}</dl>`
    : '';
  const footer = sheet.footer ? `<div class="form-sheet__footer prose">${rich(sheet.footer)}</div>` : '';
  return `
    <section class="form-sheet" aria-label="${escapeHtml(title ?? 'Formulaire')}">
      <header class="form-sheet__header${compact ? ' form-sheet__header--compact' : ''}">
        ${title ? `<span class="form-sheet__title">${inline(title)}</span>` : ''}
        ${reference ? `<span class="form-sheet__ref">${inline(reference)}</span>` : ''}
      </header>
      ${fields}
      ${formGroups(sheet.items, { skipFirstSection: Boolean(firstSection) })}
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
    const file = medicalRecord(ctx.patientFile, ctx, { folder: !block.inDialog });
    if (block.inDialog) return file;
    // Dans la scène : signaler le bouton « Dossier patient » du bandeau, avec la même icône.
    // Si le bouton n'apparaît que plus loin (availableFrom), on le dit : « Dès que vous commencerez… »
    const later = Boolean(ctx.patientFile.availableFrom);
    const narrow = later
      ? "Dès que vous commencerez à remplir le formulaire, vous pourrez rouvrir ce dossier à tout moment avec le bouton <strong>Dossier patient</strong>, en haut de l'écran."
      : "Ce dossier reste consultable à tout moment avec le bouton <strong>Dossier patient</strong>, en haut de l'écran.";
    const wide = later
      ? "Dès que vous commencerez à remplir le formulaire, vous pourrez rouvrir ce dossier à tout moment avec l'onglet <strong>Dossier patient</strong>, sur le bord droit de l'écran."
      : "Vous pouvez rouvrir ce dossier à tout moment avec l'onglet <strong>Dossier patient</strong>, sur le bord droit de l'écran.";
    return `${file}
      <p class="doc__hint">
        <span class="doc__hint-icon" aria-hidden="true">${ICON_CLIPBOARD}</span>
        <span class="only-narrow">${narrow}</span>
        <span class="only-wide">${wide}</span>
      </p>`;
  },

  /** Pièce du dossier : fiche patient, courrier reçu, note. */
  document(block, ctx) {
    const kind = block.kind ?? 'dossier';
    if (kind === 'courrier') return letter(block, ctx);
    if (kind === 'dossier') return medicalRecord(block, ctx, { folder: true });
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
    return formSheet(block, ctx, { compact: true });
  },

  /** Exercice de rédaction auto-évalué (voir wireWriting). */
  writing(block) {
    const id = escapeHtml(`redaction-${block.id}`);
    const checklist = block.checklist?.length
      ? `<fieldset class="writing__checklist">
           <legend>Vérifiez votre texte</legend>
           ${block.checklist
             .map(
               (item, i) => `
             <label class="writing__check" for="${id}-c${i}">
               <input type="checkbox" id="${id}-c${i}">
               <span>${inline(item)}</span>
             </label>`,
             )
             .join('')}
         </fieldset>`
      : '';
    return `
      <section class="writing" aria-labelledby="${id}-titre">
        <p class="writing__kicker">À vous de rédiger</p>
        <label class="writing__prompt" id="${id}-titre" for="${id}">${inline(block.prompt)}</label>
        <p class="writing__hint" id="${id}-aide">Exercice non noté : votre texte reste dans ce navigateur et n'est transmis à personne.</p>
        <textarea class="writing__input" id="${id}" rows="6" aria-describedby="${id}-aide"
          ${block.placeholder ? `placeholder="${escapeHtml(block.placeholder)}"` : ''}></textarea>
        <button type="button" class="btn btn--secondary writing__button">Comparer avec un exemple</button>
        <div class="writing__compare" tabindex="-1" hidden>
          <p class="writing__model-title">Exemple de réponse</p>
          <div class="writing__model prose">${rich(block.model)}</div>
          ${checklist}
        </div>
      </section>`;
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
