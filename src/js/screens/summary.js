/** Écran « summary » : résultat, questions à revoir, points clés. */

import { escapeHtml, inline, plainText, rich } from '../format.js';
import { createScreen } from './common.js';

const DEFAULT_MESSAGES = {
  passed: 'Vous avez atteint le seuil de réussite.',
  failed: "Vous n'avez pas encore atteint le seuil de réussite.",
  completed: 'Vous avez terminé le module.',
};

const points = (n) => `${n} point${n > 1 ? 's' : ''}`;
const questions = (n) => `${n} question${n > 1 ? 's' : ''}`;

/**
 * Questions répondues de façon incorrecte : chacune peut être reprise seule, ou toutes d'affilée.
 * Seules les réponses fausses sont effacées ; les bonnes réponses sont conservées.
 */
function wrongQuestionsSection(prefix, wrong, ctx) {
  if (!ctx.allowRetry) return '';
  if (!wrong.length) {
    return `
      <section class="review review--clear" aria-labelledby="${prefix}-review">
        <h3 class="section-title" id="${prefix}-review">Questions à revoir</h3>
        <p>Toutes vos réponses sont justes : aucune question à reprendre.</p>
      </section>`;
  }
  const optionTexts = (question, ids) =>
    question.options
      .filter((option) => ids.includes(option.id))
      .map((option) => inline(option.text))
      .join('<br>');
  const items = wrong
    .map(({ question, screen }) => {
      const chosen = ctx.getAnswer(question.id) ?? [];
      const expected = question.options.filter((option) => option.correct).map((option) => option.id);
      // Explication de la bonne réponse : « feedback.correct » (texte, ou { title, body })
      const raw = question.feedback?.correct;
      const explanation = raw && typeof raw === 'object' && !Array.isArray(raw) ? [raw.title, raw.body] : [null, raw];
      const [why, whyBody] = explanation;
      const hasWhy = Boolean(why || whyBody);
      return `
        <li class="review__item">
          <div class="review__text">
            <span class="review__screen">${inline(screen.kicker ?? screen.title)}</span>
            <span class="review__prompt">${inline(question.prompt)}</span>
            <dl class="review__answers">
              <div class="review__answer review__answer--wrong"><dt>Votre réponse</dt><dd>${optionTexts(question, chosen)}</dd></div>
              <div class="review__answer review__answer--right"><dt>Bonne réponse</dt><dd>${optionTexts(question, expected)}</dd></div>
            </dl>
            ${
              hasWhy
                ? `<details class="review__why">
                     <summary>Voir l'explication</summary>
                     ${why ? `<p class="review__why-title">${inline(why)}</p>` : ''}
                     ${whyBody ? `<div class="prose">${rich(whyBody)}</div>` : ''}
                   </details>`
                : ''
            }
          </div>
          <button type="button" class="btn btn--secondary btn--small" data-retry="${escapeHtml(question.id)}"
            aria-label="Reprendre la question : ${escapeHtml(plainText(question.prompt))}">Reprendre</button>
        </li>`;
    })
    .join('');
  return `
    <section class="review" aria-labelledby="${prefix}-review">
      <h3 class="section-title" id="${prefix}-review">Questions à revoir</h3>
      <p class="review__intro">Vous avez répondu de façon incorrecte à ${questions(wrong.length)}. Relisez la bonne réponse et son explication, puis refaites la question : les réponses sont proposées dans un nouvel ordre, vos bonnes réponses sont conservées et votre score sera recalculé.</p>
      <ol class="review__list" role="list">${items}</ol>
      <button type="button" class="btn btn--primary" data-retry-all>
        Reprendre ${wrong.length > 1 ? `les ${wrong.length} questions fausses` : 'la question fausse'}
      </button>
    </section>`;
}

export function renderSummary(screen, ctx) {
  const prefix = escapeHtml(`screen-${screen.id}`);
  const result = ctx.result();
  const wrong = ctx.wrongQuestions();
  const messages = { ...DEFAULT_MESSAGES, ...screen.messages };
  let resultHtml = '';

  if (result && screen.showScore !== false) {
    const status = result.passed ? 'passed' : 'failed';
    resultHtml = `
      <section class="result result--${status}" aria-labelledby="${prefix}-result">
        <h3 class="section-title" id="${prefix}-result">Votre résultat</h3>
        <p class="result__score">
          <span class="result__value">${result.score} %</span>
          <span class="result__detail">${points(result.earned)} sur ${result.max} · seuil de réussite : ${ctx.passingScore} %</span>
        </p>
        <p class="result__status">${result.passed ? 'Module réussi' : 'Seuil de réussite non atteint'}</p>
        <div class="prose">${rich(messages[status])}</div>
      </section>`;
  } else if (!result) {
    resultHtml = `
      <section class="result result--completed">
        <div class="prose">${rich(messages.completed)}</div>
      </section>`;
  }

  const review = result ? wrongQuestionsSection(prefix, wrong, ctx) : '';

  const keyPoints = screen.keyPoints?.length
    ? `<section aria-labelledby="${prefix}-key-points">
         <h3 class="section-title" id="${prefix}-key-points">Points clés</h3>
         <ol class="key-points" role="list">${screen.keyPoints.map((point) => `<li>${inline(point)}</li>`).join('')}</ol>
       </section>`
    : '';

  const body = screen.body ? `<div class="prose">${rich(screen.body)}</div>` : '';

  const element = createScreen(screen, 'summary', resultHtml + review + keyPoints + body);
  element.querySelectorAll('[data-retry]').forEach((button) => {
    button.addEventListener('click', () => ctx.retryQuestions([button.dataset.retry]));
  });
  element.querySelector('[data-retry-all]')?.addEventListener('click', () => {
    ctx.retryQuestions(wrong.map(({ question }) => question.id));
  });
  return element;
}
