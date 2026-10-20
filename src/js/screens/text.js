/** Écran « text » : texte avec vidéo, image, objectifs pédagogiques et frise de parcours facultatifs. */

import { rich } from '../format.js';
import { createScreen, figure, journeyHtml, objectivesHtml, videoFigure } from './common.js';

export function renderText(screen, ctx) {
  const video = screen.video ? videoFigure(screen.video, ctx.asset) : '';
  const image = screen.image ? figure(screen.image, ctx.asset) : '';
  const position = screen.image?.position ?? 'top';
  const body = `<div class="prose">${rich(screen.body)}</div>`;
  const content = position === 'bottom' ? body + image : image + body;
  const objectives = screen.objectives ? objectivesHtml(screen.objectives, `screen-${screen.id}`) : '';
  const journey = screen.journey ? journeyHtml(screen.journey, `screen-${screen.id}`) : '';
  return createScreen(screen, 'text', `${video}<div class="layout layout--${position}">${content}</div>${objectives}${journey}`);
}
