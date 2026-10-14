/** Écran « quiz » : une ou plusieurs questions à choix unique ou multiple. */

import { rich } from '../format.js';
import { appendQuestions, createScreen } from './common.js';

export function renderQuiz(screen, ctx) {
  const intro = screen.body ? `<div class="prose">${rich(screen.body)}</div>` : '';
  const element = createScreen(screen, 'quiz', `${intro}<div class="questions"></div>`);
  appendQuestions(element.querySelector('.questions'), screen.questions, ctx);
  return element;
}
