/** Écran « summary » : résultat, questions à revoir, points clés. */

import { escapeHtml, inline, plainText, rich } from '../format.js';
import { createScreen } from './common.js';

const DEFAULT_MESSAGES = {
  passed: 'Vous avez atteint le seuil de réussite.',
  failed: "Vous n'avez pas encore atteint le seuil de réussite.",
  completed: 'Vous avez terminé le module.',
};

const points = (n) => `${n} point${n > 1 ? 's' : ''}`;

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
function nextStepsCard(prefix, ctx, screen) {
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
        ${weakest ? action(`data-retry-section="${escapeHtml(weakest.wrongIds.join(','))}"`, /^Section \d/.test(weakest.section) ? `Revoir la ${inline(weakest.section.split(' · ')[0].toLowerCase())}` : `Revoir ${inline(weakest.section.split(' · ').pop())}`) : ''}
        ${action('data-report-open', 'Voir mon rapport')}
        ${action('data-report-print', 'Imprimer en PDF')}
        ${action('data-report-download', 'Télécharger')}
      </div>
      ${screen.continueLabel ? `<button type="button" class="btn btn--primary next-steps__continue" data-next-screen>${inline(screen.continueLabel)} <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
    </section>`;
}

export function renderSummary(screen, ctx) {
  const prefix = escapeHtml(`screen-${screen.id}`);
  const result = ctx.result();
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

  const keyPoints = screen.keyPoints?.length
    ? `<section aria-labelledby="${prefix}-key-points">
         <h3 class="section-title" id="${prefix}-key-points">Points clés</h3>
         <ol class="key-points" role="list">${screen.keyPoints.map((point) => `<li>${inline(point)}</li>`).join('')}</ol>
       </section>`
    : '';

  const body = screen.body ? `<div class="prose">${rich(screen.body)}</div>` : '';

  const reportSection = screen.showReport && ctx.report ? nextStepsCard(prefix, ctx, screen) : '';
  const element = createScreen(screen, 'summary', resultHtml + reportSection + (result ? sectionResultsSection(prefix, ctx) : '') + keyPoints + body);
  element.querySelector('[data-report-open]')?.addEventListener('click', () => ctx.report.open());
  element.querySelector('[data-report-print]')?.addEventListener('click', () => ctx.report.print());
  element.querySelector('[data-report-download]')?.addEventListener('click', () => ctx.report.download());
  element.querySelectorAll('[data-retry-section]').forEach((button) => {
    button.addEventListener('click', () => ctx.retryQuestions(button.dataset.retrySection.split(',')));
  });
  return element;
}
