/**
 * Écran « survey » : questionnaire de satisfaction (modèle de Kirkpatrick), facultatif et non noté.
 * Il se déroule par étapes courtes ; les réponses sont gardées au fil de la saisie (reprise possible)
 * et transmises au LMS à l'envoi, comme interactions (voir scorm.recordSurvey).
 */

import { escapeHtml, inline, rich } from '../format.js';
import { createScreen } from './common.js';

const DEFAULT_SCALE = ['Pas du tout d’accord', 'Plutôt pas d’accord', 'Ni l’un ni l’autre', 'Plutôt d’accord', 'Tout à fait d’accord'];
export const TEXT_MAX = 250;

function scaleItem(scale, value, name) {
  const options = scale
    .map((label, i) => {
      const n = String(i + 1);
      return `
        <label class="likert__option">
          <input type="radio" name="${name}" value="${n}" aria-label="${n} sur ${scale.length} : ${escapeHtml(label)}"${value === n ? ' checked' : ''}>
          <span class="likert__box" aria-hidden="true">${n}</span>
        </label>`;
    })
    .join('');
  return `
    <div class="likert">${options}</div>
    <div class="likert__ends" aria-hidden="true"><span>${escapeHtml(scale[0])}</span><span>${escapeHtml(scale[scale.length - 1])}</span></div>`;
}

function choiceItem(item, value, name) {
  const type = item.kind === 'multiple' ? 'checkbox' : 'radio';
  const chosen = new Set([...(value ?? '')]);
  const options = item.options
    .map(
      (option) => `
      <label class="option">
        <input class="option__input" type="${type}" name="${name}" value="${escapeHtml(option.id)}"${chosen.has(option.id) ? ' checked' : ''}>
        <span class="option__text">${inline(option.text)}</span>
      </label>`,
    )
    .join('');
  return `<div class="question__options">${options}</div>`;
}

function itemHtml(item, screen, ctx) {
  const name = `survey-${item.id}`;
  const value = ctx.survey.get(item.id) ?? '';
  const scale = screen.scaleLabels ?? DEFAULT_SCALE;
  if (item.kind === 'text') {
    return `
      <div class="survey__item">
        <label class="survey__prompt" for="${name}">${inline(item.prompt)} <span class="survey__optional">(facultatif)</span></label>
        <textarea class="survey__text" id="${name}" name="${name}" rows="3" maxlength="${TEXT_MAX}">${escapeHtml(value)}</textarea>
      </div>`;
  }
  const hint = item.kind === 'multiple' ? 'Plusieurs réponses possibles.' : '';
  return `
    <fieldset class="survey__item">
      <legend class="survey__prompt">${inline(item.prompt)}${hint ? ` <span class="survey__optional">${hint}</span>` : ''}</legend>
      ${item.kind === 'scale' ? scaleItem(scale, value, name) : choiceItem(item, value, name)}
    </fieldset>`;
}

export function renderSurvey(screen, ctx) {
  const prefix = escapeHtml(`screen-${screen.id}`);
  const steps = screen.steps;
  const items = steps.flatMap((step) => step.items);
  let current = 0;

  const stepsHtml = steps
    .map(
      (step, i) => `
      <section class="survey__step" data-step="${i}" aria-labelledby="${prefix}-step-${i}"${i ? ' hidden' : ''}>
        <h3 class="section-title" id="${prefix}-step-${i}" tabindex="-1">${inline(step.title)}</h3>
        ${step.items.map((item) => itemHtml(item, screen, ctx)).join('')}
      </section>`,
    )
    .join('');

  const element = createScreen(
    screen,
    'survey',
    `
    ${screen.intro ? `<div class="prose">${rich(screen.intro)}</div>` : ''}
    <form class="survey" novalidate>
      <p class="survey__progress" role="status"></p>
      ${stepsHtml}
      <div class="survey__actions">
        <button type="button" class="btn btn--secondary" data-survey-back>Retour</button>
        <button type="button" class="btn btn--primary" data-survey-next>Continuer</button>
        <button type="submit" class="btn btn--primary" data-survey-send>${escapeHtml(screen.submitLabel ?? 'Envoyer mon avis')}</button>
      </div>
      ${screen.privacy ? `<p class="survey__privacy">${inline(screen.privacy)}</p>` : ''}
    </form>
    <div class="survey__thanks" role="status" tabindex="-1" hidden>
      <p class="survey__thanks-title">Merci pour votre avis</p>
      <div class="prose">${rich(screen.thanks ?? 'Vos réponses ont bien été enregistrées.')}</div>
    </div>`,
  );

  const form = element.querySelector('.survey');
  const thanks = element.querySelector('.survey__thanks');
  const progress = element.querySelector('.survey__progress');
  const back = form.querySelector('[data-survey-back]');
  const next = form.querySelector('[data-survey-next]');
  const send = form.querySelector('[data-survey-send]');

  function showStep(index, moveFocus) {
    current = index;
    form.querySelectorAll('.survey__step').forEach((section, i) => {
      section.hidden = i !== current;
    });
    progress.textContent = `Étape ${current + 1} sur ${steps.length}`;
    back.hidden = current === 0;
    next.hidden = current === steps.length - 1;
    send.hidden = current !== steps.length - 1;
    if (moveFocus) form.querySelector(`#${CSS.escape(`${prefix}-step-${current}`)}`)?.focus();
  }

  function showThanks(moveFocus) {
    form.hidden = true;
    thanks.hidden = false;
    if (moveFocus) thanks.focus();
  }

  const itemOf = (input) => items.find((candidate) => `survey-${candidate.id}` === input.name);

  // Les réponses sont gardées dès la saisie : un rechargement ne fait rien perdre
  form.addEventListener('change', (event) => {
    const input = event.target;
    const item = itemOf(input);
    if (!item || item.kind === 'text') return;
    if (item.kind === 'multiple') {
      const ids = [...form.querySelectorAll(`input[name="${CSS.escape(input.name)}"]:checked`)].map((box) => box.value);
      ctx.survey.set(item.id, ids.join(''));
    } else {
      ctx.survey.set(item.id, input.value);
    }
  });
  form.addEventListener('input', (event) => {
    const input = event.target;
    if (itemOf(input)?.kind === 'text') ctx.survey.set(itemOf(input).id, input.value.slice(0, TEXT_MAX));
  });

  back.addEventListener('click', () => showStep(current - 1, true));
  next.addEventListener('click', () => showStep(current + 1, true));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    ctx.survey.submit(items);
    showThanks(true);
  });

  showStep(0, false);
  if (ctx.survey.sent()) showThanks(false);
  return element;
}
