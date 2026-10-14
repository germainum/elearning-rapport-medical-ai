/** Écran « text » : texte avec vidéo, image et frise de parcours facultatives. */

import { rich } from '../format.js';
import { createScreen, figure, journeyHtml, videoFigure } from './common.js';

export function renderText(screen, ctx) {
  const video = screen.video ? videoFigure(screen.video, ctx.asset) : '';
  const image = screen.image ? figure(screen.image, ctx.asset) : '';
  const position = screen.image?.position ?? 'top';
  const body = `<div class="prose">${rich(screen.body)}</div>`;
  const content = position === 'bottom' ? body + image : image + body;
  const journey = screen.journey ? journeyHtml(screen.journey, `screen-${screen.id}`) : '';
  return createScreen(screen, 'text', `${video}<div class="layout layout--${position}">${content}</div>${journey}`);
}
