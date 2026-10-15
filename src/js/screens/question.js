/**
 * Question à choix unique (radio) ou multiple (cases à cocher).
 * L'apprenant valide, voit le feedback, et la question est verrouillée :
 * seule la première réponse compte.
 *
 * Reprise (révision depuis la synthèse) : l'ordre des réponses est mélangé, pour qu'on ne retienne pas
 * simplement « c'était la B », et une seconde erreur affiche l'explication de la bonne réponse.
 */

import { escapeHtml, inline, rich } from '../format.js';
import { evaluate } from '../tracker.js';

const HINTS = {
  single: 'Une seule réponse possible.',
  multiple: 'Plusieurs réponses possibles.',
};

const EMPTY_SELECTION = {
  single: 'Sélectionnez une réponse avant de valider.',
  multiple: 'Sélectionnez au moins une réponse avant de valider.',
};

/** Générateur pseudo-aléatoire déterministe : le même ordre est reproduit si l'écran est réaffiché. */
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Options dans un ordre mélangé (toujours différent de l'ordre d'origine) selon la question et le rang de la reprise. */
export function shuffledOptions(question, retake) {
  if (!retake || question.options.length < 2) return question.options;
  let seed = retake * 7919;
  for (const char of question.id) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const random = seeded(seed);
  const order = [...question.options];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const same = order.every((option, i) => option === question.options[i]);
  return same ? [...order.slice(1), order[0]] : order;
}

export function renderQuestion(question, { number, total, getAnswer, submit, retakeCount }) {
  const retake = retakeCount?.(question.id) ?? 0;
  const id = escapeHtml(`q-${question.id}`);
  const inputType = question.kind === 'multiple' ? 'checkbox' : 'radio';

  const form = document.createElement('form');
  form.className = 'question';
  form.noValidate = true;
  form.dataset.question = question.id;
  form.innerHTML = `
    <fieldset class="question__fieldset">
      <legend class="question__legend">
        ${total > 1 ? `<span class="question__number">Question ${number} sur ${total}</span>` : ''}
        <span class="question__prompt">${inline(question.prompt)}</span>
        <span class="question__hint">${HINTS[question.kind]}</span>
      </legend>
      <div class="question__options">
        ${shuffledOptions(question, retake)
          .map(
            (option) => `
          <label class="option" data-option="${escapeHtml(option.id)}" for="${id}-${escapeHtml(option.id)}">
            <input class="option__input" type="${inputType}" id="${id}-${escapeHtml(option.id)}" name="${id}" value="${escapeHtml(option.id)}">
            <span class="option__text">${inline(option.text)}</span>
          </label>`,
          )
          .join('')}
      </div>
    </fieldset>
    <p class="question__error" role="alert"></p>
    <div class="question__actions">
      <button type="submit" class="btn btn--primary">Valider ma réponse</button>
    </div>
    <div class="feedback" tabindex="-1" hidden></div>`;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (getAnswer(question.id)) return;

    const ids = [...form.querySelectorAll('.option__input:checked')].map((input) => input.value);
    const error = form.querySelector('.question__error');
    if (!ids.length) {
      error.textContent = EMPTY_SELECTION[question.kind];
      form.querySelector('.option__input').focus();
      return;
    }
    error.textContent = '';

    const result = submit(question, ids);
    lock(form, question, ids, result, retake);
    form.querySelector('.feedback').focus();
  });

  const previous = getAnswer(question.id);
  if (previous) lock(form, question, previous, evaluate(question, previous), retake);

  return form;
}

function lock(form, question, ids, result, retake = 0) {
  form.classList.add('question--answered');
  form.querySelector('.question__actions')?.remove();

  for (const input of form.querySelectorAll('.option__input')) {
    input.checked = ids.includes(input.value);
    input.disabled = true;
  }

  // Le statut de chaque option est écrit en toutes lettres (pas seulement en couleur).
  for (const option of question.options) {
    const chosen = ids.includes(option.id);
    const expected = result.correctIds.includes(option.id);
    let state = null;
    let label = '';
    if (chosen && expected) [state, label] = ['correct', 'Votre choix : correct'];
    else if (chosen) [state, label] = ['incorrect', 'Votre choix : incorrect'];
    else if (expected) [state, label] = ['missed', 'Bonne réponse'];
    if (!state) continue;

    const element = form.querySelector(`.option[data-option="${CSS.escape(option.id)}"]`);
    element.classList.add(`option--${state}`);
    element.insertAdjacentHTML('beforeend', `<span class="option__status">${label}</span>`);
  }

  const status = result.correct ? 'Bonne réponse' : result.partial ? 'Réponse partiellement correcte' : 'Réponse incorrecte';
  const { title, body } = normalizeFeedback(result.correct ? question.feedback?.correct : question.feedback?.incorrect);
  const notes = question.options.filter((option) => ids.includes(option.id) && option.feedback);

  // Seconde erreur (reprise) : on explique pourquoi la bonne réponse est la bonne, sans laisser l'apprenant bloqué
  let why = '';
  if (!result.correct && retake >= 1) {
    const explanation = normalizeFeedback(question.feedback?.correct);
    if (explanation.title || explanation.body) {
      why = `<div class="feedback__why">
        <p class="feedback__why-title">Pourquoi c'est la bonne réponse</p>
        ${explanation.title ? `<p class="feedback__title">${inline(explanation.title)}</p>` : ''}
        ${explanation.body ? `<div class="prose">${rich(explanation.body)}</div>` : ''}
      </div>`;
    }
  }

  // Feedback par conséquence : le titre raconte ce qui se passe ensuite (« Quelques semaines plus tard… »).
  const feedback = form.querySelector('.feedback');
  feedback.classList.add(result.correct ? 'feedback--correct' : 'feedback--incorrect');
  feedback.innerHTML = `
    <p class="feedback__status"><span aria-hidden="true">${result.correct ? '✓' : '✗'}</span> ${status}</p>
    ${title ? `<p class="feedback__title">${inline(title)}</p>` : ''}
    ${body ? `<div class="prose">${rich(body)}</div>` : ''}
    ${
      notes.length
        ? `<ul class="feedback__notes">${notes
            .map((option) => `<li><span class="feedback__option">${inline(option.text)}</span> ${inline(option.feedback)}</li>`)
            .join('')}</ul>`
        : ''
    }
    ${why}`;
  feedback.hidden = false;
}

/** Un feedback est un texte, une liste de lignes, ou un objet { title, body }. */
function normalizeFeedback(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return { title: value.title, body: value.body };
  return { title: null, body: value };
}
