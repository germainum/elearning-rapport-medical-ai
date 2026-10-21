/** Écran « text » : texte avec vidéo, image, objectifs pédagogiques et frise de parcours facultatifs. */

import { escapeHtml, inline, rich } from '../format.js';
import { createScreen, figure, journeyHtml, objectivesHtml, videoFigure } from './common.js';

/** Pictogrammes des repères de l'écran éditorial (décoratifs). */
const FACT_ICONS = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  questions: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>',
  resume: '<path d="M6 4h12v17l-6-4-6 4z"/>',
};

/**
 * Mise en page « éditoriale » (écran d'accueil) : à gauche le titre, la phrase clé, les repères et le bouton ; à droite la vidéo.
 * Sur tablette et mobile, tout s'empile dans l'ordre de lecture. Les repères peuvent citer {minutes} et {questions}.
 */
function renderEditorial(screen, ctx) {
  const stats = ctx.stats ?? {};
  const fill = (text) => String(text).replace('{minutes}', stats.minutes ?? '').replace('{questions}', stats.questions ?? '');
  const facts = (screen.facts ?? [])
    .map(
      (fact) => `
        <li class="editorial__fact">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${FACT_ICONS[fact.icon] ?? ''}</svg>
          <span>${inline(fill(fact.text))}</span>
        </li>`,
    )
    .join('');
  const video = screen.video ? videoFigure(screen.video, ctx.asset) : '';
  const element = createScreen(
    screen,
    'text',
    `<div class="editorial">
       <div class="editorial__text">
         <div data-slot="header"></div>
         <div class="prose editorial__lead">${rich(screen.body)}</div>
         ${facts ? `<ul class="editorial__facts" role="list">${facts}</ul>` : ''}
         <button type="button" class="btn btn--primary editorial__cta" data-advance>${escapeHtml(screen.continueLabel ?? 'Continuer')}</button>
       </div>
       <div class="editorial__media">${video}</div>
     </div>`,
  );
  element.classList.add('screen--editorial');
  // L'en-tête (surtitre + titre) est créé par createScreen : on le place en tête de la colonne de texte
  element.querySelector('[data-slot="header"]').replaceWith(element.querySelector(':scope > .screen__header'));
  element.querySelector('[data-advance]').addEventListener('click', () => ctx.advance?.());
  return element;
}

export function renderText(screen, ctx) {
  if (screen.layout === 'editorial') return renderEditorial(screen, ctx);
  const video = screen.video ? videoFigure(screen.video, ctx.asset) : '';
  const image = screen.image ? figure(screen.image, ctx.asset) : '';
  const position = screen.image?.position ?? 'top';
  const body = `<div class="prose">${rich(screen.body)}</div>`;
  const content = position === 'bottom' ? body + image : image + body;
  const objectives = screen.objectives ? objectivesHtml(screen.objectives, `screen-${screen.id}`) : '';
  const journey = screen.journey ? journeyHtml(screen.journey, `screen-${screen.id}`) : '';
  return createScreen(screen, 'text', `${video}<div class="layout layout--${position}">${content}</div>${objectives}${journey}`);
}
