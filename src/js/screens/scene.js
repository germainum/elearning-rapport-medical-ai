/**
 * Écran « scene » : suite de blocs révélés étape par étape.
 * Les blocs « reveal » séparent les étapes et deviennent des boutons d'action
 * (« Appeler Mme R. », « Ouvrir le formulaire »…). On ne peut révéler l'étape suivante
 * qu'après avoir validé les questions déjà affichées.
 */

import { stepsOf, questionsOf, evaluate } from '../tracker.js';
import { inline, rich } from '../format.js';
import { createScreen } from './common.js';
import { renderBlock } from './blocks.js';
import { renderQuestion } from './question.js';

/**
 * Remplit le champ de l'extrait du formulaire avec la réponse modèle de la question (« reportAnswer »), à l'encre bleue ;
 * si la réponse choisie était fausse, le corrigé est écrit en gris et signalé, comme dans « Mon rapport ».
 */
function fillSheet(step, question, correct, { animate }) {
  const blank = step.querySelector('.form-sheet__blank');
  if (!blank || question.reportAnswer === undefined) return;
  const filled = document.createElement('div');
  filled.className = `form-sheet__filled form-sheet__filled--${correct ? 'correct' : 'corrected'}${animate ? ' form-sheet__filled--flash' : ''}`;
  filled.innerHTML = `${rich(question.reportAnswer)}${correct ? '' : '<span class="form-sheet__tag">Corrigé</span>'}`;
  // l'étiquette « Champ à remplir » lue par les lecteurs d'écran n'a plus lieu d'être
  blank.nextElementSibling?.classList.contains('visually-hidden') && blank.nextElementSibling.remove();
  blank.replaceWith(filled);
  if (animate) {
    // surlignage doux, un coup de surligneur qui s'estompe ; la classe est retirée ensuite (une copie de la feuille ne le rejoue pas)
    filled.addEventListener('animationend', () => filled.classList.remove('form-sheet__filled--flash'), { once: true });
  }
}

const CUE = 'Choisissez la réponse à reporter.';

/**
 * Consigne d'une étape avec extrait du formulaire : un seul paragraphe court au-dessus de l'extrait.
 * Si l'écran définit « consigne », c'est ce texte ; sinon, l'accroche (premier bloc « text ») suivie de la consigne d'interface.
 * Retourne null quand l'étape n'a pas la forme « accroche, extrait, question » (le bloc est alors rendu tel quel).
 */
function consigneBlock(screen, stepBlocks, block) {
  const hasForm = stepBlocks.some((b) => b.type === 'form');
  const question = stepBlocks.find((b) => b.type === 'question');
  if (!hasForm || !question || block.type !== 'text' || block.title) return null;
  const lines = [].concat(screen.consigne ?? block.body);
  if (lines.some((line) => /^(-|\d+[.)])\s+/.test(String(line).trim()))) return null; // listes : pas de fusion
  // Avec « consigne », l'auteur écrit tout (y compris la consigne de réponse) ; sinon la consigne d'interface suit l'accroche
  const cue = screen.consigne === undefined && question.hidePrompt ? ` <span class="consigne__cue">${CUE}</span>` : '';
  const element = document.createElement('div');
  element.className = 'block block--consigne';
  element.innerHTML = `<p class="consigne">${lines.map((line) => inline(line)).join(' ')}${cue}</p>`;
  return element;
}

export function renderScene(screen, ctx) {
  const steps = stepsOf(screen);
  const questions = questionsOf(screen);
  const element = createScreen(screen, 'scene', '<div class="scene__steps"></div>');
  const container = element.querySelector('.scene__steps');

  function renderStep(index) {
    const step = document.createElement('div');
    step.className = 'scene__step';
    step.tabIndex = -1;
    let consigneDone = false;
    for (const block of steps[index].blocks) {
      const consigne = !consigneDone ? consigneBlock(screen, steps[index].blocks, block) : null;
      if (consigne) {
        consigneDone = true;
        step.append(consigne);
      } else if (block.type === 'question') {
        // Écran avec extrait du formulaire et réponse modèle : la bonne réponse est reportée dans le formulaire (voir question.js)
        const hasSheet = steps[index].blocks.some((b) => b.type === 'form') && block.reportAnswer !== undefined;
        const form = renderQuestion(block, {
          number: questions.indexOf(block) + 1,
          total: questions.length,
          ...ctx,
          retry: hasSheet,
          onCorrect(question, { animate }) {
            fillSheet(step, question, true, { animate });
          },
        });
        step.append(form);
        // réponse déjà donnée (reprise, retour en arrière) : le champ est rempli sans animation
        const previous = ctx.getAnswer(block.id);
        if (previous) fillSheet(step, block, evaluate(block, previous).correct, { animate: false });
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
