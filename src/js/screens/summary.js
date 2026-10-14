/** Écran « summary » : résultat, points clés, reprise des questions en cas d'échec. */

import { escapeHtml, inline, rich } from '../format.js';
import { createScreen } from './common.js';

const DEFAULT_MESSAGES = {
  passed: 'Vous avez atteint le seuil de réussite.',
  failed: "Vous n'avez pas encore atteint le seuil de réussite.",
  completed: 'Vous avez terminé le module.',
};

const points = (n) => `${n} point${n > 1 ? 's' : ''}`;

export function renderSummary(screen, ctx) {
  const prefix = escapeHtml(`screen-${screen.id}`);
  const result = ctx.result();
  const messages = { ...DEFAULT_MESSAGES, ...screen.messages };
  let resultHtml = '';

  if (result && screen.showScore !== false) {
    const status = result.passed ? 'passed' : 'failed';
    const retry =
      !result.passed && ctx.allowRetry
        ? `<div class="result__retry">
             <button type="button" class="btn btn--primary" data-action="retry">Reprendre les questions</button>
             <p class="result__retry-hint">Vos réponses précédentes seront effacées.</p>
           </div>`
        : '';
    resultHtml = `
      <section class="result result--${status}" aria-labelledby="${prefix}-result">
        <h3 class="section-title" id="${prefix}-result">Votre résultat</h3>
        <p class="result__score">
          <span class="result__value">${result.score} %</span>
          <span class="result__detail">${points(result.earned)} sur ${result.max} · seuil de réussite : ${ctx.passingScore} %</span>
        </p>
        <p class="result__status">${result.passed ? 'Module réussi' : 'Seuil de réussite non atteint'}</p>
        <div class="prose">${rich(messages[status])}</div>
        ${retry}
      </section>`;
  } else if (!result) {
    resultHtml = `
      <section class="result result--completed">
        <div class="prose">${rich(messages.completed)}</div>
      </section>`;
  }

  const keyPoints = screen.keyPoints?.length
    ? `<section aria-labelledby="${prefix}-key-points">
         <h3 class="section-title" id="${prefix}-key-points">Points clés</h3>
         <ol class="key-points" role="list">${screen.keyPoints.map((point) => `<li>${inline(point)}</li>`).join('')}</ol>
       </section>`
    : '';

  const body = screen.body ? `<div class="prose">${rich(screen.body)}</div>` : '';

  const element = createScreen(screen, 'summary', resultHtml + keyPoints + body);
  element.querySelector('[data-action="retry"]')?.addEventListener('click', ctx.retry);
  return element;
}
