/**
 * Question à choix unique (radio) ou multiple (cases à cocher).
 * L'apprenant valide, voit le feedback, et la question est verrouillée :
 * seule la première réponse compte.
 *
 * L'ordre des réponses est mélangé dès la première fois (la bonne réponse n'a pas de place fixe) et change à chaque reprise,
 * pour qu'on ne retienne pas simplement « c'était la B » ; une seconde erreur affiche l'explication de la bonne réponse.
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

/** Une permutation des options, propre à la question et au rang de la tentative (0 = première réponse, 1 = première reprise…). */
function permutation(question, rank) {
  let seed = (rank + 1) * 7919;
  for (const char of question.id) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const random = seeded(seed);
  const order = [...question.options];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Options dans un ordre mélangé, stable pour une question donnée : la bonne réponse n'est pas toujours à la même place
 * (ordre du JSON non conservé). À la reprise, l'ordre est toujours différent de celui de la tentative précédente.
 */
export function shuffledOptions(question, retake = 0) {
  if (question.options.length < 2) return question.options;
  const order = permutation(question, retake);
  // l'ordre précédent est celui réellement affiché (déjà décalé si besoin), pas la permutation brute
  const previous = retake > 0 ? shuffledOptions(question, retake - 1) : null;
  const same = previous && order.every((option, i) => option === previous[i]);
  return same ? [...order.slice(1), order[0]] : order;
}

/**
 * retry : la question a un champ de formulaire à remplir (écran avec extrait). Une réponse juste « part » dans le formulaire
 * (onCorrect) et les options se replient ; une réponse fausse n'est pas inscrite : les options restent, le feedback explique
 * et l'apprenant peut réessayer. Seule la première réponse est enregistrée (score, SCORM) ; les essais suivants n'y changent rien.
 */
export function renderQuestion(question, { number, total, getAnswer, submit, retakeCount, retry = false, onCorrect }) {
  const retake = retakeCount?.(question.id) ?? 0;
  const id = escapeHtml(`q-${question.id}`);
  const inputType = question.kind === 'multiple' ? 'checkbox' : 'radio';

  const form = document.createElement('form');
  form.className = 'question';
  form.noValidate = true;
  form.dataset.question = question.id;
  form.innerHTML = `
    <div class="question__collapse" id="${id}-options"><div class="question__collapse-inner">
    <fieldset class="question__fieldset">
      ${question.hidePrompt ? '<p class="question__cue" aria-hidden="true">Choisissez la réponse à reporter</p>' : ''}
      <legend class="question__legend${question.hidePrompt ? ' visually-hidden' : ''}">
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
    </div></div>
    <p class="question__error" role="alert"></p>
    <div class="question__actions">
      <button type="submit" class="btn btn--primary">Valider ma réponse</button>
    </div>
    <div class="feedback" tabindex="-1" hidden></div>`;

  let settled = false; // vrai une fois la question verrouillée (réponse juste d'une question « retry », ou toute réponse sinon)
  let misses = 0;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (settled) return;

    const ids = [...form.querySelectorAll('.option__input:checked')].map((input) => input.value);
    const error = form.querySelector('.question__error');
    if (!ids.length) {
      error.textContent = EMPTY_SELECTION[question.kind];
      form.querySelector('.option__input').focus();
      return;
    }
    error.textContent = '';

    // Première réponse : elle compte (score, SCORM). Les essais suivants, après une erreur, ne changent rien au suivi.
    const first = !getAnswer(question.id);
    const result = first ? submit(question, ids) : evaluate(question, ids);

    if (retry && !result.correct) {
      misses += 1;
      showRetry(form, question, ids, result, { retake, misses });
      return;
    }

    settled = true;
    lock(form, question, ids, result, retake, { compact: retry && result.correct });
    if (retry && result.correct) onCorrect?.(question, { animate: true });
    else form.classList.add('question--reveal'); // la réponse « se révèle » : animation de la réponse choisie, de la bonne réponse et du feedback
    form.querySelector('.feedback').focus();
  });

  // Après une erreur : changer de réponse efface le marquage de l'essai précédent
  form.querySelector('.question__options').addEventListener('change', () => {
    if (settled || !form.classList.contains('question--retry')) return;
    for (const option of form.querySelectorAll('.option--incorrect')) {
      option.classList.remove('option--incorrect');
      option.querySelector('.option__status')?.remove();
    }
    form.querySelector('.feedback').hidden = true;
  });

  const previous = getAnswer(question.id);
  if (previous) {
    const result = evaluate(question, previous);
    settled = true;
    lock(form, question, previous, result, retake, { compact: retry && result.correct });
  }

  return form;
}

/** Réponse fausse d'une question « retry » : le texte n'est pas reporté, les options restent, le feedback explique. */
function showRetry(form, question, ids, result, { retake, misses }) {
  form.classList.add('question--retry');
  for (const option of form.querySelectorAll('.option--incorrect')) {
    option.classList.remove('option--incorrect');
    option.querySelector('.option__status')?.remove();
  }
  for (const option of question.options) {
    if (!ids.includes(option.id) || result.correctIds.includes(option.id)) continue;
    const element = form.querySelector(`.option[data-option="${CSS.escape(option.id)}"]`);
    element.classList.add('option--incorrect');
    element.insertAdjacentHTML('beforeend', '<span class="option__status">Votre choix : incorrect</span>');
  }

  const wrongFb = normalizeFeedback(question.feedback?.incorrect);
  const correctFb = normalizeFeedback(question.feedback?.correct);
  const notes = question.options.filter((option) => ids.includes(option.id) && option.feedback);
  const titleHtml = (value) => (value ? `<p class="feedback__title">${inline(value)}</p>` : '');
  const proseHtml = (value) => (value ? `<div class="prose">${rich(value)}</div>` : '');
  const noteHtml =
    notes.length === 1
      ? `<p class="feedback__note">${inline(notes[0].feedback)}</p>`
      : notes.length
        ? `<ul class="feedback__notes">${notes.map((option) => `<li><span class="feedback__option">${inline(option.text)}</span> ${inline(option.feedback)}</li>`).join('')}</ul>`
        : '';
  const main = noteHtml || titleHtml(wrongFb.title);
  // La conséquence est affichée tout de suite (plus de clic au moment où l'on apprend) ; l'explication de la bonne réponse n'est donnée qu'après deux erreurs (ou à la reprise), pour laisser chercher
  const detail = [noteHtml ? titleHtml(wrongFb.title) : '', proseHtml(wrongFb.body)].join('').trim();
  const more = detail ? `<div class="feedback__more">${detail}</div>` : '';
  const why =
    (misses >= 2 || retake >= 1) && (correctFb.title || correctFb.body)
      ? `<div class="feedback__why"><p class="feedback__why-title">Pourquoi c'est la bonne réponse</p>${titleHtml(correctFb.title)}${proseHtml(correctFb.body)}</div>`
      : '';

  const feedback = form.querySelector('.feedback');
  feedback.classList.remove('feedback--correct');
  feedback.classList.add('feedback--incorrect');
  feedback.innerHTML = `
    <p class="feedback__status"><span aria-hidden="true">✗</span> Réponse incorrecte</p>
    ${main}
    ${why}
    ${more}
    <p class="feedback__retry">Vous pouvez choisir une autre réponse.</p>`;
  feedback.hidden = false;
  feedback.focus();
}

function lock(form, question, ids, result, retake = 0, { compact = false } = {}) {
  form.classList.remove('question--retry');
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
  const correctFb = normalizeFeedback(question.feedback?.correct);
  const wrongFb = normalizeFeedback(question.feedback?.incorrect);
  const notes = question.options.filter((option) => ids.includes(option.id) && option.feedback);

  const titleHtml = (value) => (value ? `<p class="feedback__title">${inline(value)}</p>` : '');
  const proseHtml = (value) => (value ? `<div class="prose">${rich(value)}</div>` : '');
  const explainHtml = (fb) => `${titleHtml(fb.title)}${proseHtml(fb.body)}`;
  const hasExplanation = Boolean(correctFb.title || correctFb.body);

  // Niveau 1, toujours visible : le verdict et une phrase.
  //  - bonne réponse : l'explication ;
  //  - mauvaise réponse : pourquoi ce choix ne convient pas (remarque sur l'option choisie), à défaut l'accroche de la conséquence.
  // Suite, affichée directement : la conséquence concrète (« Quelques semaines plus tard… »)
  // et pourquoi la bonne réponse est la bonne.
  let main;
  let more = '';
  let why = '';
  if (result.correct) {
    main = explainHtml(correctFb);
  } else {
    const noteHtml =
      notes.length === 1
        ? `<p class="feedback__note">${inline(notes[0].feedback)}</p>`
        : notes.length
          ? `<ul class="feedback__notes">${notes
              .map((option) => `<li><span class="feedback__option">${inline(option.text)}</span> ${inline(option.feedback)}</li>`)
              .join('')}</ul>`
          : '';
    main = noteHtml || titleHtml(wrongFb.title);

    // Seconde erreur (reprise) : l'explication de la bonne réponse reste visible, pour ne pas laisser l'apprenant bloqué
    const explanation = hasExplanation
      ? `<div class="feedback__why"><p class="feedback__why-title">Pourquoi c'est la bonne réponse</p>${explainHtml(correctFb)}</div>`
      : '';
    if (retake >= 1) why = explanation;

    const detail = [noteHtml ? titleHtml(wrongFb.title) : '', proseHtml(wrongFb.body), retake >= 1 ? '' : explanation].join('').trim();
    if (detail) more = `<div class="feedback__more">${detail}</div>`;
  }

  const feedback = form.querySelector('.feedback');
  feedback.classList.remove('feedback--incorrect');
  feedback.classList.add(result.correct ? 'feedback--correct' : 'feedback--incorrect');

  if (compact) {
    // Bonne réponse reportée dans le formulaire : les options se replient, il ne reste qu'un feedback compact
    const collapse = form.querySelector('.question__collapse');
    feedback.classList.add('feedback--compact');
    feedback.innerHTML = `
      <p class="feedback__status"><span aria-hidden="true">✓</span> Correct</p>
      ${main}
      <button type="button" class="feedback__review" aria-expanded="false" aria-controls="${collapse.id}">Revoir les options</button>`;
    form.classList.add('question--collapsed');
    collapse.inert = true;
    const review = feedback.querySelector('.feedback__review');
    review.addEventListener('click', () => {
      const open = form.classList.toggle('question--collapsed') === false;
      collapse.inert = !open;
      review.setAttribute('aria-expanded', String(open));
      review.textContent = open ? 'Masquer les options' : 'Revoir les options';
    });
    feedback.hidden = false;
    return;
  }

  feedback.innerHTML = `
    <p class="feedback__status"><span aria-hidden="true">${result.correct ? '✓' : '✗'}</span> ${status}</p>
    ${main}
    ${why}
    ${more}`;
  feedback.hidden = false;
}

/** Un feedback est un texte, une liste de lignes, ou un objet { title, body }. */
function normalizeFeedback(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return { title: value.title, body: value.body };
  return { title: null, body: value };
}
