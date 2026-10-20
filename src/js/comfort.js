/** Confort de lecture : taille du texte, temps restant estimé, raccourcis clavier (ordinateur). */

import { questionsOf } from './tracker.js';

const SIZES = [
  { scale: 1, label: 'normal' },
  { scale: 1.125, label: 'grand' },
  { scale: 1.25, label: 'très grand' },
];

/* ---------- Taille du texte ---------- */

export function setupTextSize(moduleId) {
  const key = `taille-texte:${moduleId}`;
  let level = 0;
  try {
    level = Math.min(SIZES.length - 1, Math.max(0, Number(localStorage.getItem(key)) || 0));
  } catch {
    // préférence non conservée : on part de la taille normale
  }
  const hosts = [...document.querySelectorAll('[data-text-size]')];

  const apply = (announce) => {
    document.documentElement.style.setProperty('--text-scale', String(SIZES[level].scale));
    for (const host of hosts) {
      host.querySelector('[data-size="down"]').disabled = level === 0;
      host.querySelector('[data-size="up"]').disabled = level === SIZES.length - 1;
      host.querySelector('[data-size-status]').textContent = `Texte ${SIZES[level].label}`;
    }
    if (!announce) return;
    try {
      localStorage.setItem(key, String(level));
    } catch {
      // idem
    }
  };

  for (const host of hosts) {
    host.innerHTML = `
      <span class="text-size__label" id="${host.id || 'text-size'}-label">Taille du texte</span>
      <div class="text-size__buttons" role="group" aria-label="Taille du texte">
        <button type="button" class="btn btn--secondary btn--small" data-size="down" aria-label="Réduire le texte">A<span aria-hidden="true">−</span></button>
        <button type="button" class="btn btn--secondary btn--small" data-size="up" aria-label="Agrandir le texte">A<span aria-hidden="true">+</span></button>
      </div>
      <span class="text-size__status" data-size-status role="status"></span>`;
    host.addEventListener('click', (event) => {
      const button = event.target.closest('[data-size]');
      if (!button || button.disabled) return;
      level += button.dataset.size === 'up' ? 1 : -1;
      apply(true);
      // Le bouton peut se désactiver au bout de la course : le focus passe à l'autre
      if (button.disabled) host.querySelector(`[data-size="${button.dataset.size === 'up' ? 'down' : 'up'}"]`)?.focus();
    });
  }
  apply(false);
}

/* ---------- Temps restant ---------- */

/**
 * Estimation proportionnelle à ce qu'il reste à faire : un écran compte 1, chaque question 1 de plus.
 * La durée totale est celle annoncée dans module.json (`durationMinutes`).
 */
export function timeLeftText(module, tracker, index) {
  const { screens, durationMinutes } = module;
  if (!durationMinutes) return '';
  const weight = (screen) => 1 + questionsOf(screen).length;
  const total = screens.reduce((sum, screen) => sum + weight(screen), 0);
  const left = screens.reduce((sum, screen, i) => sum + (i >= index && !tracker.isScreenDone(i) ? weight(screen) : 0), 0);
  const minutes = Math.round((durationMinutes * left) / total);
  if (!left || index >= screens.length - 1) return '';
  if (minutes < 1) return 'Temps restant : moins d’une minute';
  return `Temps restant : environ ${minutes} min`;
}

/* ---------- Raccourcis clavier ---------- */

const TYPING = 'input[type="text"], input[type="search"], input[type="email"], textarea, select, [contenteditable="true"]';

/**
 * ← → : écran précédent / suivant ; 1, 2, 3… : choisir une réponse ; Entrée : valider.
 * Rien ne se déclenche dans un champ de saisie, une fenêtre ouverte, un panneau latéral ou avec un modificateur.
 */
export function setupShortcuts({ screenEl, prev, next }) {
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
    if (document.querySelector('dialog[open]')) return;
    const target = event.target;
    if (target.closest?.(TYPING) || target.closest?.('.folder, .toc, #toc, video, audio, summary')) return;
    const onChoice = target.matches?.('input[type="radio"], input[type="checkbox"]');

    if (event.key === 'Enter' && (onChoice || target === document.body)) {
      // Depuis une réponse, ou depuis la page : valide la question en cours si une réponse est cochée
      const form = onChoice
        ? target.closest('form.question')
        : [...screenEl.querySelectorAll('form.question:not(.question--answered)')].find((f) => f.offsetParent);
      if (form && !form.classList.contains('question--answered') && form.querySelector('.option__input:checked')) {
        event.preventDefault();
        form.requestSubmit();
      }
      return;
    }

    // Chiffres : par leur touche physique, car sur un clavier AZERTY ils demandent Maj
    const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code ?? '')?.[1] ?? (/^[1-9]$/.test(event.key) ? event.key : null);
    if (digit) {
      const form = [...screenEl.querySelectorAll('form.question:not(.question--answered)')].find((f) => f.offsetParent);
      const input = form?.querySelectorAll('.option__input')[Number(digit) - 1];
      if (!input) return;
      event.preventDefault();
      input.focus();
      input.click();
      return;
    }

    // Dans un groupe de réponses, les flèches changent déjà de choix
    if (onChoice) return;
    if (event.key === 'ArrowRight' && !next.hidden) {
      event.preventDefault();
      next.click();
    } else if (event.key === 'ArrowLeft' && !prev.disabled) {
      event.preventDefault();
      prev.click();
    }
  });
}
