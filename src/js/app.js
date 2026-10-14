/**
 * Moteur du module : chargement du contenu, navigation, liaison avec le suivi.
 * Aucun texte pédagogique ici : tout vient de content/module.json.
 */

import { createScorm } from './scorm.js';
import { createTracker, questionsOf, stepsOf } from './tracker.js';
import { escapeHtml, inline, plainText, rich } from './format.js';
import { renderBlock } from './screens/blocks.js';
import { renderText } from './screens/text.js';
import { renderScene } from './screens/scene.js';
import { renderQuiz } from './screens/quiz.js';
import { renderSummary } from './screens/summary.js';

const CONTENT_URL = 'content/module.json';
const DEFAULT_PASSING_SCORE = 80;
const DEFAULT_CONTINUE_LABEL = 'Suivant';

const RENDERERS = {
  text: renderText,
  scene: renderScene,
  quiz: renderQuiz,
  summary: renderSummary,
};

const byId = (id) => document.getElementById(id);
const els = {
  debugBar: byId('debug-bar'),
  debugReset: byId('debug-reset'),
  brandLogo: byId('brand-logo'),
  moduleTitle: byId('module-title'),
  storyTitle: byId('story-title'),
  progressText: byId('progress-text'),
  progressBar: byId('progress-bar'),
  fileToggle: byId('file-toggle'),
  fileDialog: byId('file-dialog'),
  fileDialogBody: byId('file-dialog-body'),
  fileClose: byId('file-close'),
  tocToggle: byId('toc-toggle'),
  toc: byId('toc'),
  tocList: byId('toc-list'),
  tocSideList: byId('toc-side-list'),
  sideLogo: byId('side-logo'),
  sideModule: byId('side-module'),
  sideMeta: byId('side-meta'),
  sideProgress: byId('side-progress'),
  helpCard: byId('help-card'),
  helpCardTitle: byId('help-card-title'),
  helpCardBody: byId('help-card-body'),
  crumbs: byId('crumbs'),
  progressPill: byId('progress-pill'),
  appBody: byId('app-body'),
  fileSide: byId('file-side'),
  fileSideBody: byId('file-side-body'),
  notice: byId('notice'),
  screen: byId('screen'),
  pager: byId('pager'),
  pagerMsg: byId('pager-msg'),
  prev: byId('prev'),
  next: byId('next'),
};

start().catch(showFatalError);

async function start() {
  const module = await loadModule();
  const screens = module.screens;
  const passingScore = module.scoring?.passingScore ?? DEFAULT_PASSING_SCORE;
  const allowRetry = module.scoring?.allowRetry !== false;

  document.documentElement.lang = module.language || 'fr';
  els.moduleTitle.textContent = plainText(module.title);
  els.storyTitle.textContent = plainText(module.storyTitle ?? '');
  if (module.logo) {
    els.brandLogo.src = `content/${module.logo.src}`;
    els.brandLogo.alt = module.logo.alt;
    els.brandLogo.hidden = false;
    els.sideLogo.src = `content/${module.logo.src}`;
    els.sideLogo.alt = module.logo.alt;
    els.sideLogo.hidden = false;
  } else {
    els.brandLogo.remove(); // sans logo, le titre garde toute la place
    els.sideLogo.remove();
  }
  renderSidebarIntro(module);

  const scorm = createScorm({
    storageKey: `scorm-simule:${module.id}`,
    debug: new URLSearchParams(window.location.search).has('debug'),
  });
  const connected = scorm.init();
  const tracker = createTracker(module);
  const resumed = tracker.restore(scorm.getSuspendData());

  let index = 0;
  let finished = false;
  let lastStatus = '';

  /* ---------- Synchronisation avec le LMS ---------- */

  function sync() {
    scorm.setLocation(screens[index].id);
    scorm.setSuspendData(tracker.serialize());

    if (tracker.isComplete()) {
      const result = tracker.result(passingScore);
      const status = {
        completion: 'completed',
        success: result ? (result.passed ? 'passed' : 'failed') : 'unknown',
      };
      const key = `${status.success}:${result?.score ?? ''}`;
      if (key !== lastStatus) {
        if (result) scorm.setScore(result.score);
        scorm.setStatus(status);
        lastStatus = key;
      }
    }
    scorm.commit();
  }

  function finish() {
    if (finished) return;
    finished = true;
    sync();
    scorm.finish();
  }

  /* ---------- Contexte transmis aux écrans ---------- */

  const ctx = {
    passingScore,
    allowRetry,
    form: module.form,
    patientFile: module.patientFile,
    asset: (src) => `content/${src}`,
    getAnswer: (questionId) => tracker.getAnswer(questionId),
    result: () => tracker.result(passingScore),
    getRevealed: (screen) => tracker.revealedCount(screen),

    reveal(screen) {
      tracker.reveal(screen);
      els.pagerMsg.textContent = '';
      sync();
      updateChrome();
    },

    submit(question, ids) {
      const result = tracker.answer(question.id, ids);
      scorm.recordInteraction({
        id: question.id,
        response: ids,
        correct: result.correctIds,
        result: result.correct ? 'correct' : 'incorrect',
        weighting: question.points ?? 1,
        description: plainText(question.prompt),
      });
      els.pagerMsg.textContent = '';
      sync();
      updateChrome();
      return result;
    },

    retry() {
      tracker.resetAnswers();
      const first = screens.findIndex((screen) => questionsOf(screen).length > 0);
      show(first, { notice: 'Vos réponses ont été effacées. Répondez de nouveau aux questions.' });
    },
  };

  /* ---------- Affichage d'un écran ---------- */

  function show(target, { focus = true, notice = '' } = {}) {
    index = target;
    const screen = screens[index];
    tracker.visit(index);
    sync(); // avant le rendu : la synthèse affiche le score qui vient d'être calculé

    const render = RENDERERS[screen.type];
    if (!render) throw new Error(`Type d'écran inconnu : « ${screen.type} » (écran « ${screen.id} »).`);

    els.notice.textContent = notice;
    els.pagerMsg.textContent = '';
    els.screen.replaceChildren(render(screen, ctx));
    document.title = `${plainText(screen.title)} – ${plainText(module.title)}`;
    updateChrome();

    if (focus) {
      window.scrollTo(0, 0);
      els.screen.querySelector('.screen__title')?.focus();
    }
  }

  function updateChrome() {
    const total = screens.length;
    const done = screens.filter((_, i) => tracker.isScreenDone(i)).length;
    els.progressText.textContent = `Écran ${index + 1} sur ${total}`;
    els.progressBar.style.width = `${Math.round((done / total) * 100)}%`;
    els.progressPill.textContent = `${index + 1} / ${total}`;
    els.sideProgress.textContent = `${done} / ${total}`;
    els.sideProgress.setAttribute('aria-label', `${done} écrans terminés sur ${total}`);

    // Fil d'Ariane : fil rouge › surtitre › titre de l'écran
    const screen = screens[index];
    els.crumbs.innerHTML = [module.storyTitle, screen.kicker, screen.title]
      .filter(Boolean)
      .map((text, i, all) => `<li${i === all.length - 1 ? ' aria-current="page"' : ''}>${inline(text)}</li>`)
      .join('');

    els.prev.disabled = index === 0;
    els.next.hidden = index === total - 1;
    els.next.textContent = plainText(screens[index].continueLabel ?? DEFAULT_CONTINUE_LABEL);
    els.next.setAttribute('aria-disabled', String(!tracker.isScreenDone(index)));

    renderToc();
    const fileUnlocked = isPatientFileUnlocked();
    els.fileToggle.hidden = !fileUnlocked;
    // Colonne de droite (grands écrans) : affichée dès que le dossier est découvert
    els.fileSide.hidden = !fileUnlocked;
    els.appBody.classList.toggle('app-body--with-file', fileUnlocked);
  }

  /* ---------- Dossier du patient (bouton du bandeau) ---------- */

  // Étape où l'apprenant découvre la fiche (bloc « patientFile ») : le bouton apparaît à partir de là.
  const patientFileStep = (() => {
    for (const [screenIndex, screen] of screens.entries()) {
      const step = stepsOf(screen).findIndex((s) => s.blocks.some((block) => block.type === 'patientFile'));
      if (step >= 0) return { screenIndex, step };
    }
    return null;
  })();

  function isPatientFileUnlocked() {
    if (!module.patientFile) return false;
    if (!patientFileStep) return true;
    const { screenIndex, step } = patientFileStep;
    if (screens.some((_, i) => i > screenIndex && tracker.isViewed(i))) return true;
    return tracker.isViewed(screenIndex) && tracker.revealedCount(screens[screenIndex]) >= step;
  }

  if (module.patientFile) {
    els.fileDialogBody.replaceChildren(renderBlock({ type: 'patientFile', inDialog: true }, ctx));
    els.fileSideBody.replaceChildren(renderBlock({ type: 'patientFile', inDialog: true }, ctx));
    els.fileToggle.addEventListener('click', () => els.fileDialog.showModal());
    els.fileClose.addEventListener('click', () => els.fileDialog.close());
    // Clic sur le fond assombri : ferme la fenêtre
    els.fileDialog.addEventListener('click', (event) => {
      if (event.target === els.fileDialog) els.fileDialog.close();
    });
    els.fileDialog.addEventListener('close', () => els.fileToggle.focus());
  }

  /* ---------- Sommaire ---------- */

  // Même sommaire à deux endroits : menu déroulant (mobile, tablette) et colonne de gauche (ordinateur)
  function renderToc() {
    els.tocList.replaceChildren(...tocItems());
    els.tocSideList.replaceChildren(...tocItems());
  }

  function tocItems() {
    return screens.map((screen, i) => {
        const item = document.createElement('li');
        const title = escapeHtml(plainText(screen.title));
        let status = 'disponible';
        if (i === index) status = 'écran actuel';
        else if (!tracker.canAccess(i)) status = 'verrouillé';
        else if (tracker.isScreenDone(i)) status = 'terminé';
        else if (tracker.isViewed(i)) status = 'commencé';

        const accessible = tracker.canAccess(i) && i !== index;
        const element = document.createElement(accessible ? 'button' : 'span');
        element.className = `toc__item${tracker.canAccess(i) ? '' : ' toc__item--locked'}`;
        if (accessible) {
          element.type = 'button';
          element.addEventListener('click', () => {
            setTocOpen(false);
            show(i);
          });
        }
        if (i === index) element.setAttribute('aria-current', 'step');
        // Repère de la frise : coche (terminé), point plein (écran actuel), cercle vide (à venir)
        const state = i === index ? 'current' : tracker.isScreenDone(i) ? 'done' : tracker.canAccess(i) ? 'open' : 'locked';
        item.className = `toc__step toc__step--${state}`;
        element.innerHTML = `
          <span class="toc__marker" aria-hidden="true">${state === 'done' ? icon('check', 14) : ''}</span>
          <span class="toc__label">${title}</span>
          <span class="toc__status">${status}</span>`;
        item.append(element);
        return item;
      });
  }

  function setTocOpen(open) {
    els.toc.hidden = !open;
    els.tocToggle.setAttribute('aria-expanded', String(open));
  }

  els.tocToggle.hidden = false;
  els.tocToggle.addEventListener('click', () => setTocOpen(els.toc.hidden));
  els.toc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setTocOpen(false);
      els.tocToggle.focus();
    }
  });

  /* ---------- Navigation ---------- */

  els.prev.addEventListener('click', () => {
    if (index > 0) show(index - 1);
  });

  els.next.addEventListener('click', () => {
    if (tracker.isScreenDone(index)) {
      show(index + 1);
      return;
    }
    const pending = [...els.screen.querySelectorAll('.question')].find(
      (form) => !tracker.isAnswered(form.dataset.question),
    );
    if (pending) {
      els.pagerMsg.textContent = 'Répondez aux questions de cet écran pour continuer.';
      pending.querySelector('.option__input')?.focus();
    } else {
      els.pagerMsg.textContent = 'Poursuivez la lecture de cet écran pour continuer.';
      els.screen.querySelector('.scene__reveal .btn')?.focus();
    }
  });

  /* ---------- Cycle de vie de la session ---------- */

  window.addEventListener('pagehide', finish);
  window.addEventListener('beforeunload', finish);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && !finished) sync();
  });

  if (scorm.mode === 'mock') {
    els.debugBar.hidden = false;
    els.debugReset.addEventListener('click', () => {
      finished = true; // ne pas réécrire la progression en quittant
      scorm.resetMock();
      window.location.reload();
    });
  }

  /* ---------- Démarrage ---------- */

  let startIndex = 0;
  let notice = '';
  if (resumed) {
    startIndex = tracker.currentIndex;
    if (!tracker.canAccess(startIndex)) startIndex = tracker.firstOpenIndex();
    if (startIndex > 0) notice = 'Vous reprenez le module là où vous vous étiez arrêté.';
  }
  if (!connected) {
    notice = "La connexion avec la plateforme n'a pas pu être établie : votre progression ne sera pas enregistrée.";
  }

  els.pager.hidden = false;
  show(startIndex, { focus: false, notice });
}

const ICONS = {
  clock: '<path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="9" />',
  steps: '<path d="M4 6h16M4 12h16M4 18h10" />',
  question: '<circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01" />',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" />',
};

const icon = (name, size = 16) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/** Colonne de gauche : titre, pastilles d'information (dérivées du contenu), carte d'aide. */
function renderSidebarIntro(module) {
  els.sideModule.textContent = plainText(module.title);
  const questionCount = module.screens.reduce((n, screen) => n + questionsOf(screen).length, 0);
  const chips = [
    module.durationMinutes ? [icon('clock'), `${module.durationMinutes} min`] : null,
    [icon('steps'), `${module.screens.length} étapes`],
    questionCount ? [icon('question'), `${questionCount} questions`] : null,
  ].filter(Boolean);
  els.sideMeta.innerHTML = chips.map(([svg, text]) => `<li class="chip">${svg}<span>${escapeHtml(text)}</span></li>`).join('');

  if (module.help) {
    els.helpCardTitle.textContent = plainText(module.help.title);
    els.helpCardBody.innerHTML = rich(module.help.body);
    els.helpCard.hidden = false;
  }
}

async function loadModule() {
  const response = await fetch(CONTENT_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Impossible de charger ${CONTENT_URL} (HTTP ${response.status}).`);
  try {
    return await response.json();
  } catch {
    throw new Error(`${CONTENT_URL} n'est pas un fichier JSON valide. Lancez « npm run validate » pour localiser l'erreur.`);
  }
}

function showFatalError(error) {
  console.error(error);
  els.pager.hidden = true;
  els.screen.innerHTML = `
    <div class="alert" role="alert">
      <h2>Le module n'a pas pu démarrer</h2>
      <p>Veuillez réessayer plus tard. Si le problème persiste, contactez le support d'Acamedia.</p>
      <details>
        <summary>Détails techniques</summary>
        <pre>${escapeHtml(error?.message ?? error)}</pre>
      </details>
    </div>`;
}
