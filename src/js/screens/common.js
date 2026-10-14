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

export function appendQuestions(container, questions, ctx) {
  questions.forEach((question, i) => {
    container.append(renderQuestion(question, { number: i + 1, total: questions.length, ...ctx }));
  });
}
