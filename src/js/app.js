/**
 * Moteur du module : chargement du contenu, navigation, liaison avec le suivi.
 * Aucun texte pédagogique ici : tout vient de content/module.json.
 */

import { createScorm } from './scorm.js';
import { createTracker, questionsOf, stepsOf } from './tracker.js';
import { escapeHtml, inline, plainText, rich } from './format.js';
import { renderBlock } from './screens/blocks.js';
import { wireVideos } from './screens/common.js';
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
  glossaryToggle: byId('glossary-toggle'),
  glossaryDialog: byId('glossary-dialog'),
  glossaryTitle: byId('glossary-dialog-title'),
  glossaryClose: byId('glossary-close'),
  glossaryBody: byId('glossary-body'),
  glossarySearch: byId('glossary-search'),
  glossaryCount: byId('glossary-count'),
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
  fileSideClose: byId('file-side-close'),
  folderTab: byId('folder-tab'),
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
  // Adresse d'un fichier du contenu, suffixée du numéro de version : une image ou une vidéo remplacée sous le même nom
  // est rechargée dès la livraison suivante (sinon le navigateur ou le LMS peut servir l'ancienne version en cache)
  const asset = (src) => `content/${src}?v=${encodeURIComponent(module.version ?? '0')}`;
  if (module.logo) {
    els.brandLogo.src = asset(module.logo.src);
    els.brandLogo.alt = module.logo.alt;
    els.brandLogo.hidden = false;
    els.sideLogo.src = asset(module.logo.src);
    els.sideLogo.alt = module.logo.alt;
    els.sideLogo.hidden = false;
  } else {
    els.brandLogo.remove(); // sans logo, le titre garde toute la place
    els.sideLogo.remove();
  }
  renderSidebarIntro(module);
  setupGlossary(module.glossary);

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
    moduleId: module.id,
    form: module.form,
    patientFile: module.patientFile,
    logo: module.logo,
    asset,
    getAnswer: (questionId) => tracker.getAnswer(questionId),
    retakeCount: (questionId) => tracker.retakeCount(questionId),
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

    wrongQuestions: () => tracker.wrongQuestions(),

    /**
     * Révision guidée depuis la synthèse : efface seulement les réponses fausses indiquées, mémorise la file des
     * questions à refaire et amène l'apprenant sur la première. « Suivant » enchaîne ensuite de question en question
     * jusqu'au retour à la synthèse (voir goNext).
     */
    retryQuestions(questionIds) {
      const wrong = tracker.wrongQuestions().filter(({ question }) => questionIds.includes(question.id));
      if (!wrong.length) return;
      const queue = tracker.startReview(wrong.map(({ question }) => question.id));
      const first = tracker.nextReview(-1);
      show(first.screenIndex, {
        focusQuestion: first.id,
        notice:
          queue.length > 1
            ? `Révision : ${queue.length} questions à refaire.`
            : 'Révision : 1 question à refaire.',
      });
    },
  };

  /* ---------- Affichage d'un écran ---------- */

  function show(target, { focus = true, notice = '', focusQuestion = null } = {}) {
    index = target;
    const screen = screens[index];
    // Synthèse atteinte une fois toutes les questions de la file refaites : la révision est terminée
    if (screen.type === 'summary' && tracker.reviewQueue.length && tracker.isReviewDone()) tracker.clearReview();
    tracker.visit(index);
    sync(); // avant le rendu : la synthèse affiche le score qui vient d'être calculé

    const render = RENDERERS[screen.type];
    if (!render) throw new Error(`Type d'écran inconnu : « ${screen.type} » (écran « ${screen.id} »).`);

    els.notice.textContent = notice;
    els.pagerMsg.textContent = '';
    els.screen.replaceChildren(render(screen, ctx));
    const banner = reviewBanner();
    if (banner) els.screen.prepend(banner);
    wireVideos(els.screen); // une fois dans la page : début à la seconde voulue, sous-titres, lecture automatique
    document.title = `${plainText(screen.title)} – ${plainText(module.title)}`;
    updateChrome();

    // Reprise d'une question : on l'amène à l'écran et on place le focus sur sa première réponse
    const questionForm = focusQuestion
      ? els.screen.querySelector(`.question[data-question="${CSS.escape(focusQuestion)}"]`)
      : null;
    if (questionForm) {
      questionForm.scrollIntoView({ block: 'start' });
      questionForm.querySelector('.option__input')?.focus({ preventScroll: true });
    } else if (focus) {
      window.scrollTo(0, 0);
      els.screen.querySelector('.screen__title')?.focus();
    }
  }

  /* ---------- Révision guidée des questions fausses ---------- */

  // L'écran affiché contient-il une question de la file de révision ?
  const inReview = () => tracker.reviewIdsOnScreen(index).length > 0;

  function reviewBanner() {
    if (!inReview()) return null;
    const queue = tracker.reviewQueue;
    const rank = queue.indexOf(tracker.reviewIdsOnScreen(index)[0]) + 1;
    const banner = document.createElement('p');
    banner.className = 'review-banner';
    banner.innerHTML = `<strong>Révision · question ${rank} sur ${queue.length}</strong><span>Les réponses sont dans un nouvel ordre.</span>`;
    return banner;
  }

  /** Libellé du bouton « Suivant » pendant la révision : question suivante à refaire, ou retour au résultat. */
  function reviewNextLabel() {
    if (!inReview()) return null;
    const next = tracker.nextReview(index);
    return next ? `Question suivante à revoir (${next.rank} sur ${tracker.reviewQueue.length})` : 'Revenir à mon résultat';
  }

  /** Écran suivant : question suivante de la révision, retour à la synthèse en fin de révision, sinon écran d'après. */
  function goNext() {
    if (!inReview()) return show(index + 1);
    const next = tracker.nextReview(index);
    if (next) return show(next.screenIndex, { focusQuestion: next.id });
    const summary = screens.findIndex((screen) => screen.type === 'summary');
    tracker.clearReview();
    return show(summary, { notice: 'Révision terminée : votre score est recalculé.' });
  }

  function updateChrome() {
    const total = screens.length;
    const done = screens.filter((_, i) => tracker.isScreenDone(i)).length;
    // Forme courte « 10/35 » sur les très petits écrans ; la forme longue reste lue par les lecteurs d'écran
    els.progressText.innerHTML = `<span class="progress-text__long">Écran ${index + 1} sur ${total}</span><span class="progress-text__short" aria-hidden="true">${index + 1}/${total}</span>`;
    els.progressBar.style.width = `${Math.round((done / total) * 100)}%`;
    els.progressPill.textContent = `${index + 1} / ${total}`;
    els.sideProgress.textContent = `${done} / ${total}`;
    els.sideProgress.setAttribute('aria-label', `${done} écrans terminés sur ${total}`);

    // Fil d'Ariane : fil rouge › surtitre › titre de l'écran
    const screen = screens[index];
    els.crumbs.innerHTML = [screen.storyTitle ?? module.storyTitle, screen.kicker, screen.title]
      .filter(Boolean)
      .map((text, i, all) => `<li${i === all.length - 1 ? ' aria-current="page"' : ''}>${inline(text)}</li>`)
      .join('');

    els.prev.disabled = index === 0;
    els.next.hidden = index === total - 1;
    els.next.textContent = reviewNextLabel() ?? plainText(screens[index].continueLabel ?? DEFAULT_CONTINUE_LABEL);
    els.next.setAttribute('aria-disabled', String(!tracker.isScreenDone(index)));

    renderToc();
    // « hidePatientFile » : écrans d'un autre cas, où le dossier de la patiente principale n'a pas sa place
    const fileUnlocked = isPatientFileUnlocked() && !screens[index].hidePatientFile;
    els.fileToggle.hidden = !fileUnlocked;
    // Ordinateur : onglet « Dossier patient » à droite ; le dossier garde son état d'un écran à l'autre
    els.folderTab.hidden = !fileUnlocked;
    applyFolderState(fileUnlocked && folderOpen);
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

  // Réglage « patientFile.availableFrom » (id d'écran) : le dossier n'est consultable qu'à partir de cet écran
  const availableFromIndex = module.patientFile?.availableFrom
    ? screens.findIndex((screen) => screen.id === module.patientFile.availableFrom)
    : -1;

  function isPatientFileUnlocked() {
    if (!module.patientFile) return false;
    if (availableFromIndex >= 0) return index >= availableFromIndex;
    if (!patientFileStep) return true;
    const { screenIndex, step } = patientFileStep;
    if (screens.some((_, i) => i > screenIndex && tracker.isViewed(i))) return true;
    return tracker.isViewed(screenIndex) && tracker.revealedCount(screens[screenIndex]) >= step;
  }

  // État ouvert / fermé du dossier : préférence d'affichage propre à ce navigateur (fermé par défaut)
  const FOLDER_KEY = `dossier-ouvert:${module.id}`;
  let folderOpen = false;
  try {
    folderOpen = localStorage.getItem(FOLDER_KEY) === '1';
  } catch {
    // Stockage indisponible : le dossier démarre fermé
  }

  function applyFolderState(open) {
    els.fileSide.hidden = !open;
    els.appBody.classList.toggle('app-body--with-file', open);
    els.folderTab.setAttribute('aria-expanded', String(open));
    els.folderTab.classList.toggle('folder-tab--open', open);
  }

  function setFolderOpen(open) {
    folderOpen = open;
    try {
      localStorage.setItem(FOLDER_KEY, open ? '1' : '0');
    } catch {
      // Préférence non mémorisée : sans conséquence
    }
    applyFolderState(open && isPatientFileUnlocked() && !screens[index].hidePatientFile);
  }

  if (module.patientFile) {
    els.fileDialogBody.replaceChildren(renderBlock({ type: 'patientFile', inDialog: true }, ctx));
    els.fileSideBody.replaceChildren(renderBlock({ type: 'patientFile', inDialog: true }, ctx));
    const photo = byId('folder-tab-photo');
    if (module.patientFile.image) {
      photo.src = asset(module.patientFile.image.src); // décorative : alt=""
      photo.hidden = false;
    }
    els.folderTab.addEventListener('click', () => {
      setFolderOpen(true);
      els.fileSideClose.focus();
    });
    els.fileSideClose.addEventListener('click', () => {
      setFolderOpen(false);
      els.folderTab.focus();
    });
    els.fileSide.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setFolderOpen(false);
        els.folderTab.focus();
      }
    });
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
    return screens.flatMap((screen, i) => {
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
        // Titre de groupe (« Section 2 · Situation médicale ») quand le champ « section » change
        const section = screen.section ?? null;
        if (!section || section === (screens[i - 1]?.section ?? null)) return [item];
        const heading = document.createElement('li');
        heading.className = 'toc__section';
        heading.textContent = plainText(section);
        return [heading, item];
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
      goNext();
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

/* ---------- Glossaire : fenêtre consultable à tout moment, avec recherche ---------- */

// Recherche insensible à la casse et aux accents
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function setupGlossary(glossary) {
  if (!glossary) return;
  els.glossaryToggle.hidden = false;
  els.glossaryTitle.textContent = plainText(glossary.title ?? 'Glossaire');
  const total = glossary.sections.reduce((n, section) => n + section.terms.length, 0);

  const entryHtml = (entry) => `
    <div class="glossary__entry" data-search="${escapeHtml(normalize(`${plainText(entry.term)} ${plainText(entry.definition)}`))}">
      <dt class="glossary__term">${inline(entry.term)}</dt>
      <dd class="glossary__definition">${inline(entry.definition)}</dd>
    </div>`;
  const sectionHtml = (section) => `
    <section class="glossary__section">
      <h3 class="glossary__section-title">${inline(section.title)}</h3>
      <dl class="glossary__list">${section.terms.map(entryHtml).join('')}</dl>
    </section>`;
  els.glossaryBody.innerHTML = `
    ${glossary.sections.map(sectionHtml).join('')}
    <p class="glossary__empty" hidden>Aucun terme ne correspond à votre recherche.</p>
    ${glossary.source ? `<p class="glossary__source">Source : ${inline(glossary.source)}</p>` : ''}`;

  const entries = [...els.glossaryBody.querySelectorAll('.glossary__entry')];
  const sections = [...els.glossaryBody.querySelectorAll('.glossary__section')];
  const empty = els.glossaryBody.querySelector('.glossary__empty');

  function filter() {
    const query = normalize(els.glossarySearch.value.trim());
    let shown = 0;
    for (const entry of entries) {
      const match = !query || entry.dataset.search.includes(query);
      entry.hidden = !match;
      if (match) shown++;
    }
    for (const section of sections) section.hidden = !section.querySelector('.glossary__entry:not([hidden])');
    empty.hidden = shown > 0;
    els.glossaryCount.textContent = query ? `${shown} terme${shown > 1 ? 's' : ''} sur ${total}` : `${total} termes`;
  }

  els.glossarySearch.addEventListener('input', filter);
  filter();
  els.glossaryToggle.addEventListener('click', () => {
    els.glossaryDialog.showModal();
    els.glossarySearch.focus();
  });
  els.glossaryClose.addEventListener('click', () => els.glossaryDialog.close());
  // Clic sur le fond assombri : ferme la fenêtre
  els.glossaryDialog.addEventListener('click', (event) => {
    if (event.target === els.glossaryDialog) els.glossaryDialog.close();
  });
  els.glossaryDialog.addEventListener('close', () => els.glossaryToggle.focus());
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
