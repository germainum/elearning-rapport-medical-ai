/**
 * Exercices interactifs natifs (non notés, formatifs) : texte à trous, remise en ordre, questions dans la vidéo.
 * Tout le contenu vient de module.json ; ce fichier ne contient que des libellés d'interface.
 *
 * - « blanks »   : phrase à compléter avec une banque de mots (toucher / cliquer, ou glisser avec la souris).
 * - « sequence » : éléments à remettre dans l'ordre (boutons Monter / Descendre).
 * - « checkpoints » d'une vidéo : la lecture s'arrête à un instant donné et pose une question à choix unique.
 *
 * Ni l'un ni l'autre n'est transmis au LMS : ils ne comptent ni dans le score ni dans la complétion.
 */

import { escapeHtml, inline, rich } from '../format.js';

/** Mélange stable (la même graine donne le même ordre) : l'ordre ne change pas à chaque affichage de l'écran. */
function shuffled(list, seed) {
  let state = 0;
  for (const char of String(seed)) state = (state * 31 + char.charCodeAt(0)) >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const result = list.map((value, index) => ({ value, index }));
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const normalize = (text) => String(text).trim().toLocaleLowerCase('fr');

/* ------------------------------------------------------------------ */
/* Texte à trous                                                       */
/* ------------------------------------------------------------------ */

/** Découpe « Elle ne peut plus {porter 5 kg} » en morceaux de texte et trous. */
function parseBlanks(text) {
  const parts = [];
  const answers = [];
  let last = 0;
  for (const match of String(text).matchAll(/\{([^}]+)\}/g)) {
    parts.push({ text: text.slice(last, match.index) });
    parts.push({ gap: answers.length });
    answers.push(match[1].trim());
    last = match.index + match[0].length;
  }
  parts.push({ text: text.slice(last) });
  return { parts, answers };
}

export function blanksHtml(block) {
  const id = escapeHtml(`trous-${block.id}`);
  const { parts, answers } = parseBlanks(block.text);
  const words = shuffled([...answers, ...(block.distractors ?? [])], block.id);
  const sentence = parts
    .map((part) =>
      part.gap === undefined
        ? escapeHtml(part.text)
        : `<button type="button" class="blank" data-gap="${part.gap}" aria-label="Trou ${part.gap + 1} sur ${answers.length} : vide"><span class="blank__word"></span></button>`,
    )
    .join('');
  return `
    <section class="exercise exercise--blanks" aria-labelledby="${id}-titre">
      <p class="exercise__kicker">Exercice</p>
      <p class="exercise__prompt" id="${id}-titre">${inline(block.prompt)}</p>
      <p class="exercise__hint">Touchez un mot puis le trou où le placer (ou glissez-le). Touchez un mot placé pour le reprendre.</p>
      <p class="blanks__sentence">${sentence}</p>
      <ul class="blanks__bank" aria-label="Mots à placer">
        ${words
          .map(
            ({ value, index }) =>
              `<li><button type="button" class="chip" draggable="true" data-chip="${index}" aria-pressed="false">${escapeHtml(value)}</button></li>`,
          )
          .join('')}
      </ul>
      <div class="exercise__actions">
        <button type="button" class="btn btn--primary exercise__check" disabled>Vérifier</button>
      </div>
      <p class="exercise__status" role="status"></p>
      <div class="exercise__feedback feedback feedback--correct" hidden tabindex="-1">${block.feedback ? `<div class="prose">${rich(block.feedback)}</div>` : ''}</div>
    </section>`;
}

export function wireBlanks(element, block) {
  const { answers } = parseBlanks(block.text);
  const words = shuffled([...answers, ...(block.distractors ?? [])], block.id).map(({ value }) => value);
  const gapButtons = [...element.querySelectorAll('.blank')];
  const chips = [...element.querySelectorAll('.chip')];
  const check = element.querySelector('.exercise__check');
  const status = element.querySelector('.exercise__status');
  const feedback = element.querySelector('.exercise__feedback');
  const placed = answers.map(() => null); // index de pastille dans chaque trou
  let selected = null; // pastille choisie, en attente d'un trou
  let activeGap = null; // trou choisi, en attente d'un mot
  let marked = false; // la vérification a marqué les trous
  let done = false;

  const say = (text) => {
    status.textContent = text;
  };

  function render() {
    chips.forEach((chip, i) => {
      const inGap = placed.includes(i);
      chip.hidden = inGap;
      chip.closest('li').hidden = inGap;
      chip.setAttribute('aria-pressed', String(selected === i));
      chip.classList.toggle('chip--selected', selected === i);
      chip.disabled = done;
    });
    gapButtons.forEach((button, g) => {
      const chip = placed[g];
      const word = chip === null ? '' : words[chip];
      button.querySelector('.blank__word').textContent = word;
      button.classList.toggle('blank--filled', chip !== null);
      button.classList.toggle('blank--active', activeGap === g);
      const label = chip === null ? 'vide' : `« ${word} »`;
      const verdict = marked && chip !== null ? (normalize(word) === normalize(answers[g]) ? ', correct' : ', incorrect') : '';
      button.setAttribute('aria-label', `Trou ${g + 1} sur ${answers.length} : ${label}${verdict}`);
      button.disabled = done;
    });
    check.disabled = done || placed.some((chip) => chip === null);
  }

  function clearMarks() {
    marked = false;
    for (const button of gapButtons) button.classList.remove('blank--correct', 'blank--incorrect');
    check.textContent = 'Vérifier';
  }

  function place(chip, gap) {
    if (marked) clearMarks();
    placed[gap] = chip;
    selected = null;
    activeGap = null;
    say('');
    render();
  }

  chips.forEach((chip, i) => {
    chip.addEventListener('click', () => {
      if (activeGap !== null) {
        place(i, activeGap);
        gapButtons[placed.indexOf(i)]?.focus();
        return;
      }
      selected = selected === i ? null : i;
      render();
    });
    chip.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', String(i));
      event.dataTransfer.effectAllowed = 'move';
    });
  });

  gapButtons.forEach((button, g) => {
    button.addEventListener('click', () => {
      if (selected !== null) {
        place(selected, g);
        return;
      }
      if (placed[g] !== null) {
        // Reprendre le mot : il retourne dans la banque
        const back = placed[g];
        placed[g] = null;
        if (marked) clearMarks();
        render();
        chips[back].focus();
        return;
      }
      activeGap = activeGap === g ? null : g;
      say(activeGap === null ? '' : 'Choisissez maintenant un mot.');
      render();
    });
    button.addEventListener('dragover', (event) => {
      event.preventDefault();
      button.classList.add('blank--over');
    });
    button.addEventListener('dragleave', () => button.classList.remove('blank--over'));
    button.addEventListener('drop', (event) => {
      event.preventDefault();
      button.classList.remove('blank--over');
      const chip = Number(event.dataTransfer.getData('text/plain'));
      if (Number.isInteger(chip) && chips[chip]) place(chip, g);
    });
  });

  check.addEventListener('click', () => {
    if (marked) {
      // « Reprendre les mots erronés » : ils retournent dans la banque
      gapButtons.forEach((button, g) => {
        if (button.classList.contains('blank--incorrect')) placed[g] = null;
      });
      clearMarks();
      say('');
      render();
      return;
    }
    marked = true;
    let right = 0;
    gapButtons.forEach((button, g) => {
      const ok = normalize(words[placed[g]]) === normalize(answers[g]);
      if (ok) right += 1;
      button.classList.add(ok ? 'blank--correct' : 'blank--incorrect');
    });
    if (right === answers.length) {
      done = true;
      say(`Bravo : ${right} réponses justes sur ${answers.length}.`);
      feedback.hidden = false;
      feedback.focus();
    } else {
      say(`${right} réponse${right > 1 ? 's' : ''} juste${right > 1 ? 's' : ''} sur ${answers.length}. Reprenez les mots erronés et réessayez.`);
      check.textContent = 'Reprendre les mots erronés';
    }
    render();
  });

  render();
}

/* ------------------------------------------------------------------ */
/* Remise en ordre                                                     */
/* ------------------------------------------------------------------ */

export function sequenceHtml(block) {
  const id = escapeHtml(`ordre-${block.id}`);
  let order = shuffled(block.items, block.id);
  // L'ordre mélangé ne doit pas être déjà le bon
  if (order.every((entry, i) => entry.index === i)) order = [...order.slice(1), order[0]];
  return `
    <section class="exercise exercise--sequence" aria-labelledby="${id}-titre">
      <p class="exercise__kicker">Exercice</p>
      <p class="exercise__prompt" id="${id}-titre">${inline(block.prompt)}</p>
      <p class="exercise__hint">Utilisez les flèches pour remettre les étapes dans le bon ordre.</p>
      <ol class="sequence__list">
        ${order
          .map(
            ({ value, index }) => `
          <li class="sequence__item" data-index="${index}">
            <span class="sequence__rank" aria-hidden="true"></span>
            <span class="sequence__text">${inline(value)}</span>
            <span class="sequence__moves">
              <button type="button" class="sequence__move" data-dir="-1" aria-label="Monter « ${escapeHtml(value)} »"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
              <button type="button" class="sequence__move" data-dir="1" aria-label="Descendre « ${escapeHtml(value)} »"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            </span>
          </li>`,
          )
          .join('')}
      </ol>
      <div class="exercise__actions">
        <button type="button" class="btn btn--primary exercise__check">Vérifier l'ordre</button>
      </div>
      <p class="exercise__status" role="status"></p>
      <div class="exercise__feedback feedback feedback--correct" hidden tabindex="-1">${block.feedback ? `<div class="prose">${rich(block.feedback)}</div>` : ''}</div>
    </section>`;
}

export function wireSequence(element) {
  const list = element.querySelector('.sequence__list');
  const check = element.querySelector('.exercise__check');
  const status = element.querySelector('.exercise__status');
  const feedback = element.querySelector('.exercise__feedback');
  let done = false;

  const items = () => [...list.children];

  function refresh() {
    const all = items();
    all.forEach((item, i) => {
      item.querySelector('.sequence__rank').textContent = String(i + 1);
      item.querySelector('[data-dir="-1"]').disabled = done || i === 0;
      item.querySelector('[data-dir="1"]').disabled = done || i === all.length - 1;
    });
  }

  list.addEventListener('click', (event) => {
    const button = event.target.closest('.sequence__move');
    if (!button || done) return;
    const item = button.closest('.sequence__item');
    const dir = Number(button.dataset.dir);
    const all = items();
    const position = all.indexOf(item);
    const target = all[position + dir];
    if (!target) return;
    if (dir < 0) target.before(item);
    else target.after(item);
    for (const li of all) li.classList.remove('sequence__item--correct', 'sequence__item--incorrect');
    status.textContent = `« ${item.querySelector('.sequence__text').textContent} » : position ${position + dir + 1} sur ${all.length}.`;
    refresh();
    // Le bouton déplacé avec l'élément garde le focus ; s'il est désormais désactivé (bord de liste), on prend l'autre
    const same = item.querySelector(`[data-dir="${dir}"]`);
    (same.disabled ? item.querySelector(`[data-dir="${-dir}"]`) : same).focus();
  });

  check.addEventListener('click', () => {
    let right = 0;
    items().forEach((item, i) => {
      const ok = Number(item.dataset.index) === i;
      if (ok) right += 1;
      item.classList.toggle('sequence__item--correct', ok);
      item.classList.toggle('sequence__item--incorrect', !ok);
    });
    const total = items().length;
    if (right === total) {
      done = true;
      check.hidden = true;
      status.textContent = 'Bravo : l\'ordre est correct.';
      feedback.hidden = false;
      feedback.focus();
      refresh();
    } else {
      status.textContent = `${right} étape${right > 1 ? 's' : ''} à la bonne place sur ${total}. Les étapes en rouge sont à déplacer.`;
    }
  });

  refresh();
}

/* ------------------------------------------------------------------ */
/* Questions dans la vidéo                                             */
/* ------------------------------------------------------------------ */

/**
 * « checkpoints » : [{ at: secondes, question: { prompt, options: [{ id, text, correct }], feedback } }].
 * La lecture se met en pause à l'instant « at » ; la question s'affiche sous la vidéo (jamais par-dessus : les
 * sous-titres restent lisibles et rien ne dépend du plein écran). Un passage en avant par la barre de lecture
 * ne déclenche pas les questions sautées.
 */
export function wireCheckpoints(player, figure, checkpoints) {
  const pending = checkpoints.map((checkpoint, i) => ({ ...checkpoint, i }));
  let panel = null;

  function close() {
    panel?.remove();
    panel = null;
    player.play().catch(() => {});
  }

  function ask(checkpoint) {
    const { question } = checkpoint;
    player.pause();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    const id = `pv-${checkpoint.i}`;
    panel = document.createElement('section');
    panel.className = 'checkpoint';
    panel.setAttribute('aria-labelledby', `${id}-titre`);
    panel.tabIndex = -1;
    panel.innerHTML = `
      <p class="exercise__kicker">Question pendant la vidéo</p>
      <fieldset class="checkpoint__fieldset">
        <legend class="exercise__prompt" id="${id}-titre">${inline(question.prompt)}</legend>
        <div class="checkpoint__options">
          ${question.options
            .map(
              (option) => `
            <label class="option" for="${id}-${escapeHtml(option.id)}">
              <input class="option__input" type="radio" name="${id}" id="${id}-${escapeHtml(option.id)}" value="${escapeHtml(option.id)}">
              <span class="option__text">${inline(option.text)}</span>
            </label>`,
            )
            .join('')}
        </div>
      </fieldset>
      <div class="checkpoint__result" role="status"></div>
      <div class="exercise__actions"><button type="button" class="btn btn--primary checkpoint__resume" hidden>Reprendre la vidéo</button></div>`;
    figure.querySelector('.video__player').after(panel);
    const result = panel.querySelector('.checkpoint__result');
    const resume = panel.querySelector('.checkpoint__resume');
    resume.addEventListener('click', close);

    panel.addEventListener('change', (event) => {
      const chosen = question.options.find((option) => option.id === event.target.value);
      if (!chosen) return;
      const labels = panel.querySelectorAll('.option');
      for (const label of labels) label.classList.remove('option--correct', 'option--incorrect');
      if (chosen.correct) {
        panel.querySelector(`.option[for$="-${CSS.escape(chosen.id)}"]`).classList.add('option--correct');
        for (const input of panel.querySelectorAll('input')) input.disabled = true;
        result.innerHTML = `<div class="feedback feedback--correct"><p class="feedback__status"><span aria-hidden="true">✓</span> Correct</p>${question.feedback ? `<div class="prose">${rich(question.feedback)}</div>` : ''}</div>`;
        resume.hidden = false;
        resume.focus();
      } else {
        panel.querySelector(`.option[for$="-${CSS.escape(chosen.id)}"]`).classList.add('option--incorrect');
        result.innerHTML = `<div class="feedback feedback--incorrect"><p class="feedback__status"><span aria-hidden="true">✗</span> Pas tout à fait</p><p>${inline(chosen.hint ?? 'Réécoutez le passage, puis essayez une autre réponse.')}</p></div>`;
      }
    });
    panel.focus({ preventScroll: false });
  }

  player.addEventListener('timeupdate', () => {
    if (panel || player.seeking) return;
    const now = player.currentTime;
    for (const checkpoint of pending) {
      if (checkpoint.done) continue;
      if (now >= checkpoint.at && now < checkpoint.at + 1.5) {
        checkpoint.done = true;
        ask(checkpoint);
        return;
      }
      // Lecture passée au-delà (barre de lecture) : la question est sautée
      if (now >= checkpoint.at + 1.5) checkpoint.done = true;
    }
  });
}
