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
            <span class="review__screen">${inline([screen.kicker, screen.title].filter(Boolean).join(' · '))}</span>
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
            aria-label="Reprendre la question : ${escapeHtml(plainText(screen.title))}">Reprendre</button>
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

/** Niveau de maîtrise d'une section : le texte porte l'information, la couleur ne fait que l'appuyer. */
function levelOf(correct, total) {
  const ratio = correct / total;
  if (ratio >= 0.8) return { key: 'good', label: 'Solide' };
  if (ratio >= 0.5) return { key: 'mid', label: 'À consolider' };
  return { key: 'low', label: 'À revoir' };
}

/** Résultats par section du formulaire : où l'apprenant est solide, où il doit revoir. */
function sectionResultsSection(prefix, ctx) {
  const groups = ctx.sectionResults().filter((group) => group.total > 0);
  if (groups.length < 2) return '';
  const items = groups
    .map((group) => {
      const level = levelOf(group.correct, group.total);
      const retry =
        ctx.allowRetry && group.wrongIds.length
          ? `<button type="button" class="btn btn--secondary btn--small" data-retry-section="${escapeHtml(group.wrongIds.join(','))}"
               aria-label="Revoir ${group.wrongIds.length > 1 ? 'les ' + group.wrongIds.length + ' questions fausses' : 'la question fausse'} : ${escapeHtml(plainText(group.section))}">Revoir</button>`
          : '';
      return `
        <li class="by-section__item by-section__item--${level.key}">
          <div class="by-section__head">
            <span class="by-section__name">${inline(group.section)}</span>
            <span class="by-section__level">${level.label}</span>
          </div>
          <div class="by-section__bar" aria-hidden="true"><span style="width: ${Math.round((group.correct / group.total) * 100)}%"></span></div>
          <div class="by-section__foot">
            <span class="by-section__score">${group.correct} bonne${group.correct > 1 ? 's' : ''} réponse${group.correct > 1 ? 's' : ''} sur ${group.total}</span>
            ${retry}
          </div>
        </li>`;
    })
    .join('');
  return `
    <section class="by-section" aria-labelledby="${prefix}-by-section">
      <h3 class="section-title" id="${prefix}-by-section">Vos résultats par section</h3>
      <ol class="by-section__list" role="list">${items}</ol>
    </section>`;
}

/** Bloc « Et maintenant ? » : revoir la section la plus faible, ouvrir, imprimer ou télécharger le rapport rempli. */
function nextStepsCard(prefix, ctx) {
  const { filled, total } = ctx.report.summary();
  const status =
    filled === total
      ? 'Tous les champs de votre rapport sont remplis par vos bonnes réponses.'
      : `${filled} champs sur ${total} de votre rapport sont remplis par vos bonnes réponses ; les autres figurent avec leur corrigé.`;
  const weakest = ctx.allowRetry
    ? ctx
        .sectionResults()
        .filter((group) => group.total > 0 && group.wrongIds.length)
        .sort((x, y) => x.correct / x.total - y.correct / y.total)[0]
    : null;
  const action = (attrs, label) =>
    `<button type="button" class="next-steps__action" ${attrs}><span>${label}</span><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  return `
    <section class="report-card next-steps" aria-labelledby="${prefix}-report">
      <h3 class="section-title" id="${prefix}-report">Et maintenant ?</h3>
      <p>${escapeHtml(status)} Gardez-le comme modèle.</p>
      <div class="next-steps__actions">
        ${weakest ? action(`data-retry-section="${escapeHtml(weakest.wrongIds.join(','))}"`, `Revoir ${inline(weakest.section)}`) : ''}
        ${action('data-report-open', 'Voir mon rapport complet')}
        ${action('data-report-print', 'Imprimer ou enregistrer en PDF')}
        ${action('data-report-download', 'Télécharger mon rapport')}
      </div>
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
        <div class="result__cards">
          <p class="result__card result__card--score">
            <span class="result__label">Votre score</span>
            <span class="result__value">${result.score}<small>&nbsp;%</small></span>
          </p>
          <p class="result__card">
            <span class="result__label">${result.earned > 1 ? 'Points obtenus' : 'Point obtenu'}</span>
            <span class="result__value">${result.earned}<small> / ${result.max}</small></span>
          </p>
        </div>
        <p class="result__detail">${points(result.earned)} sur ${result.max} · seuil de réussite : ${ctx.passingScore} %</p>
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

  const reportSection = screen.showReport && ctx.report ? nextStepsCard(prefix, ctx) : '';
  const element = createScreen(screen, 'summary', resultHtml + (result ? sectionResultsSection(prefix, ctx) : '') + reportSection + review + keyPoints + body);
  element.querySelector('[data-report-open]')?.addEventListener('click', () => ctx.report.open());
  element.querySelector('[data-report-print]')?.addEventListener('click', () => ctx.report.print());
  element.querySelector('[data-report-download]')?.addEventListener('click', () => ctx.report.download());
  element.querySelectorAll('[data-retry]').forEach((button) => {
    button.addEventListener('click', () => ctx.retryQuestions([button.dataset.retry]));
  });
  element.querySelectorAll('[data-retry-section]').forEach((button) => {
    button.addEventListener('click', () => ctx.retryQuestions(button.dataset.retrySection.split(',')));
  });
  element.querySelector('[data-retry-all]')?.addEventListener('click', () => {
    ctx.retryQuestions(wrong.map(({ question }) => question.id));
  });
  return element;
}
