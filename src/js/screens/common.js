/** Éléments partagés par les écrans. */

import { escapeHtml, inline, rich } from '../format.js';
import { renderQuestion } from './question.js';

/**
 * Conteneur d'écran avec son en-tête : surtitre facultatif (kicker) et titre h2.
 * Le h2 reçoit le focus à chaque changement d'écran.
 */
export function createScreen(screen, modifier, innerHtml) {
  const titleId = `screen-${screen.id}-title`;
  const kicker = screen.kicker ? `<p class="screen__kicker">${inline(screen.kicker)}</p>` : '';
  const element = document.createElement('article');
  element.className = `screen screen--${modifier}`;
  element.setAttribute('aria-labelledby', titleId);
  element.innerHTML = `
    <header class="screen__header">
      ${kicker}
      <h2 class="screen__title" id="${escapeHtml(titleId)}" tabindex="-1">${inline(screen.title)}</h2>
    </header>
    ${innerHtml}`;
  return element;
}

export function figure(image, asset, modifier = '') {
  const alt = image.decorative ? '' : image.alt;
  const caption = image.caption ? `<figcaption>${inline(image.caption)}</figcaption>` : '';
  return `
    <figure class="figure${modifier ? ` figure--${modifier}` : ''}">
      <img src="${escapeHtml(asset(image.src))}" alt="${escapeHtml(alt)}">
      ${caption}
    </figure>`;
}

/**
 * Vidéo embarquée dans le paquet : lecteur natif, sous-titres affichés par défaut
 * (beaucoup de médecins regardent sans le son) et transcription dépliable.
 */
export function videoFigure(video, asset) {
  const meta = [video.title, video.duration].filter(Boolean).map(inline).join(' · ');
  const captions = video.captions
    ? `<track kind="captions" src="${escapeHtml(asset(video.captions))}" srclang="fr" label="Français" default>`
    : '';
  const transcript = video.transcript
    ? `<details class="video__transcript">
         <summary>Lire la transcription</summary>
         <div class="prose">${rich(video.transcript)}</div>
       </details>`
    : '';
  return `
    <figure class="video">
      <video class="video__player" controls preload="metadata" playsinline
        aria-label="${escapeHtml(video.title)}"${video.poster ? ` poster="${escapeHtml(asset(video.poster))}"` : ''}>
        <source src="${escapeHtml(asset(video.src))}" type="video/mp4">
        ${captions}
        <p>Votre navigateur ne peut pas lire cette vidéo : sa transcription est disponible ci-dessous.</p>
      </video>
      <figcaption class="video__caption">${meta}</figcaption>
      ${transcript}
    </figure>`;
}

/**
 * Fenêtre modale (dialog natif : focus piégé, Échap pour fermer).
 * Créée à l'ouverture, retirée du DOM à la fermeture ; le focus revient sur l'élément d'origine.
 */
export function openModal({ title, bodyHtml, actionsHtml = '' }) {
  const opener = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'file-dialog file-dialog--wide';
  dialog.setAttribute('aria-labelledby', 'modal-title');
  dialog.innerHTML = `
    <div class="file-dialog__header">
      <h2 class="file-dialog__title" id="modal-title">${inline(title)}</h2>
      <div class="file-dialog__actions">
        ${actionsHtml}
        <button type="button" class="btn btn--ghost btn--small" data-close>Fermer</button>
      </div>
    </div>
    <div class="file-dialog__body">${bodyHtml}</div>`;
  document.body.append(dialog);
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); // clic sur le fond assombri
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    opener?.focus?.();
  });
  dialog.showModal();
  return dialog;
}

/* Icônes de la frise « parcours » (traits, couleur héritée) */
const JOURNEY_ICONS = {
  courrier: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  dossier: '<path d="M9 4h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2V5a1 1 0 0 1 1-1Z"/><path d="M8.5 12h7M8.5 16h5"/>',
  examen: '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
  redaction: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/>',
  envoi: '<path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z"/><path d="M10 13l5-5"/>',
  decision: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
};

/** Frise des étapes d'un parcours : en colonne sur mobile, en ligne sur grand écran. */
export function journeyHtml(journey, idPrefix) {
  const titleId = escapeHtml(`${idPrefix}-parcours`);
  const steps = journey.steps
    .map(
      (step, i) => `
        <li class="journey__step">
          <span class="journey__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">${JOURNEY_ICONS[step.icon] ?? JOURNEY_ICONS.decision}</svg>
          </span>
          <span class="journey__body">
            <span class="journey__number">Étape ${i + 1}</span>
            <span class="journey__label">${inline(step.label)}</span>
            ${step.text ? `<span class="journey__text">${inline(step.text)}</span>` : ''}
          </span>
        </li>`,
    )
    .join('');
  return `
    <section class="journey" aria-labelledby="${titleId}">
      <h3 class="section-title" id="${titleId}">${inline(journey.title ?? 'Votre parcours')}</h3>
      <ol class="journey__steps" role="list">${steps}</ol>
    </section>`;
}

export function appendQuestions(container, questions, ctx) {
  questions.forEach((question, i) => {
    container.append(renderQuestion(question, { number: i + 1, total: questions.length, ...ctx }));
  });
}
