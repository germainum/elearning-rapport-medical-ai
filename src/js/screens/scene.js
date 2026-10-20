/**
 * Écran « scene » : suite de blocs révélés étape par étape.
 * Les blocs « reveal » séparent les étapes et deviennent des boutons d'action
 * (« Appeler Mme R. », « Ouvrir le formulaire »…). On ne peut révéler l'étape suivante
 * qu'après avoir validé les questions déjà affichées.
 */

import { stepsOf, questionsOf } from '../tracker.js';
import { inline } from '../format.js';
import { createScreen } from './common.js';
import { renderBlock } from './blocks.js';
import { renderQuestion } from './question.js';

export function renderScene(screen, ctx) {
  const steps = stepsOf(screen);
  const questions = questionsOf(screen);
  const element = createScreen(screen, 'scene', '<div class="scene__steps"></div>');
  const container = element.querySelector('.scene__steps');

  function renderStep(index) {
    const step = document.createElement('div');
    step.className = 'scene__step';
    step.tabIndex = -1;
    for (const block of steps[index].blocks) {
      if (block.type === 'question') {
        step.append(
          renderQuestion(block, { number: questions.indexOf(block) + 1, total: questions.length, ...ctx }),
        );
      } else {
        step.append(renderBlock(block, ctx));
      }
    }
    return step;
  }

  function renderRevealButton(index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'scene__reveal';
    wrapper.innerHTML = `
      <button type="button" class="btn btn--primary btn--action">${inline(steps[index].reveal.label)}</button>
      <p class="scene__reveal-msg" role="status"></p>`;
    const button = wrapper.querySelector('button');
    const message = wrapper.querySelector('.scene__reveal-msg');

    button.addEventListener('click', () => {
      const pending = [...container.querySelectorAll('.question')].find(
        (form) => !ctx.getAnswer(form.dataset.question),
      );
      if (pending) {
        message.textContent = 'Répondez à la question pour continuer.';
        pending.querySelector('.option__input')?.focus();
        return;
      }
      wrapper.remove();
      ctx.reveal(screen);
      const next = appendStep(index + 1);
      // Nouvelle étape : ses blocs montent en cascade (l'animation se coupe d'elle-même si l'utilisateur veut moins de mouvement)
      [...next.children].forEach((child, i) => child.style.setProperty('--n', String(Math.min(i, 4))));
      next.classList.add('step--reveal');
      next.focus();
    });
    return wrapper;
  }

  function appendStep(index) {
    const step = renderStep(index);
    container.append(step);
    if (steps[index].reveal) container.append(renderRevealButton(index));
    return step;
  }

  // Étapes déjà révélées (reprise ou retour en arrière), puis bouton de l'étape suivante.
  const visible = ctx.getRevealed(screen);
  for (let i = 0; i <= visible; i += 1) {
    container.append(renderStep(i));
  }
  if (steps[visible].reveal) container.append(renderRevealButton(visible));

  return element;
}
