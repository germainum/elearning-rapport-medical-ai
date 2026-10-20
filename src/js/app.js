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
  menuGlossary: byId('menu-glossary'),
  menuFile: byId('menu-file'),
  toc: byId('toc'),
  tocList: byId('toc-list'),
  tocSideList: byId('toc-side-list'),
  sideLogo: byId('side-logo'),
  sideModule: byId('side-module'),
  sideMeta: byId('side-meta'),
  helpCard: byId('help-card'),
  helpCardTitle: byId('help-card-title'),
  helpCardBody: byId('help-card-body'),
  helpCardIcon: byId('help-card-icon'),
  helpCardActions: byId('help-card-actions'),
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

  const debugMode = new URLSearchParams(window.location.search).has('debug');
  const scorm = createScorm({
    storageKey: `scorm-simule:${module.id}`,
    debug: debugMode,
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

  // Message d'information : petite bulle qui disparaît seule (une erreur de connexion reste affichée)
  let noticeTimer;
  function setNotice(text, { sticky = false } = {}) {
    clearTimeout(noticeTimer);
    els.notice.textContent = text;
    els.notice.classList.toggle('notice--sticky', sticky);
    if (text && !sticky) noticeTimer = setTimeout(() => { els.notice.textContent = ''; }, 5000);
  }

  function show(target, { focus = true, notice = '', stickyNotice = false, focusQuestion = null } = {}) {
    index = target;
    const screen = screens[index];
    // Synthèse atteinte une fois toutes les questions de la file refaites : la révision est terminée
    if (screen.type === 'summary' && tracker.reviewQueue.length && tracker.isReviewDone()) tracker.clearReview();
    tracker.visit(index);
    sync(); // avant le rendu : la synthèse affiche le score qui vient d'être calculé

    const render = RENDERERS[screen.type];
    if (!render) throw new Error(`Type d'écran inconnu : « ${screen.type} » (écran « ${screen.id} »).`);

    setNotice(notice, { sticky: stickyNotice });
    openSection = screen.section ?? null; // le sommaire ouvre la section de l'écran affiché
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
    // Pastilles de durée / étapes / questions : utiles à l'accueil seulement
    els.sideMeta.hidden = screens[index].section !== screens[0].section;

    // En-tête : le fil rouge seul (ex. « Rapport de Mme R. »)
    const screen = screens[index];
    els.crumbs.innerHTML = [screen.storyTitle ?? module.storyTitle]
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
    els.menuFile.hidden = !fileUnlocked; // même dossier, depuis le menu burger (mobile)
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
    els.fileDialog.addEventListener('close', () => focusVisible(els.fileToggle, els.tocToggle));
  }

  /* ---------- Sommaire ---------- */

  // Même sommaire à deux endroits : menu déroulant (mobile, tablette) et colonne de gauche (ordinateur)
  function renderToc() {
    els.tocList.replaceChildren(...tocItems('toc-list'));
    els.tocSideList.replaceChildren(...tocItems('toc-side-list'));
  }

  // Section ouverte dans le sommaire : celle de l'écran affiché (une seule à la fois, ouverte à la main ou automatiquement)
  let openSection = screens[0].section ?? null;

  /** Une ligne du sommaire (frise de progression) pour l'écran i. */
  function stepItem(screen, i) {
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
  }

  /**
   * Sommaire : une rubrique repliable par section (« Section 2 · 3 sur 8 »), seule celle de l'écran affiché est ouverte.
   * Sans champ « section » dans le contenu, la liste reste à plat.
   */
  function tocItems(listId) {
    if (!screens.some((screen) => screen.section)) return screens.map(stepItem);

    const groups = [];
    screens.forEach((screen, i) => {
      const last = groups.at(-1);
      if (last && last.section === (screen.section ?? null)) last.indexes.push(i);
      else groups.push({ section: screen.section ?? null, indexes: [i] });
    });

    return groups.map((group, g) => {
      const open = group.section === openSection;
      const done = group.indexes.filter((i) => tracker.isScreenDone(i)).length;
      const subId = `${listId}-groupe-${g}`;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'toc__section';
      toggle.dataset.group = String(g);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-controls', subId);
      // « Section 2 · Situation médicale » : surtitre « SECTION 2 » puis nom ; les autres titres s'affichent seuls
      const [overline, ...rest] = plainText(group.section ?? 'Autres écrans').split(' · ');
      const label = rest.length ? rest.join(' · ') : overline;
      const total = group.indexes.length;
      const complete = done === total;
      toggle.innerHTML = `
        <span class="toc__ring${complete ? ' toc__ring--done' : ''}" style="--pct:${Math.round((done / total) * 100)}" aria-hidden="true">${complete ? icon('check', 14) : ''}</span>
        <span class="toc__section-text">
          ${rest.length ? `<span class="toc__section-over">${escapeHtml(overline)}</span>` : ''}
          <span class="toc__section-title">${escapeHtml(label)}</span>
        </span>
        <span class="toc__count${complete ? ' toc__count--done' : ''}"><span aria-hidden="true">${done}/${total}</span><span class="visually-hidden">${done} écrans terminés sur ${total}</span></span>
        <svg class="toc__chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
      toggle.addEventListener('click', () => {
        openSection = open ? null : group.section;
        renderToc();
        document.getElementById(listId)?.querySelector(`[data-group="${g}"]`)?.focus();
      });

      const sub = document.createElement('ol');
      sub.className = 'toc__sublist';
      sub.id = subId;
      sub.hidden = !open;
      for (const i of group.indexes) sub.append(stepItem(screens[i], i));

      const li = document.createElement('li');
      li.className = 'toc__group';
      li.append(toggle, sub);
      return li;
    });
  }

  function setTocOpen(open) {
    els.toc.hidden = !open;
    els.tocToggle.setAttribute('aria-expanded', String(open));
  }

  els.tocToggle.hidden = false;
  els.tocToggle.addEventListener('click', () => setTocOpen(els.toc.hidden));
  // Menu burger (mobile) : glossaire et dossier patient ouvrent leur fenêtre habituelle
  els.menuGlossary.addEventListener('click', () => {
    setTocOpen(false);
    els.glossaryToggle.click();
  });
  els.menuFile.addEventListener('click', () => {
    setTocOpen(false);
    els.fileToggle.click();
  });
  // Un clic en dehors du menu le referme
  document.addEventListener('click', (event) => {
    if (!els.toc.hidden && !els.toc.contains(event.target) && !els.tocToggle.contains(event.target)) setTocOpen(false);
  });
  // Échap referme le menu et rend le focus au bouton
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.toc.hidden && !document.querySelector('dialog[open]')) {
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

  // Barre « Mode test » (API simulée, effacement de la progression) : seulement avec ?debug dans l'adresse
  if (scorm.mode === 'mock' && debugMode) {
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
  let stickyNotice = false;
  if (resumed) {
    startIndex = tracker.currentIndex;
    if (!tracker.canAccess(startIndex)) startIndex = tracker.firstOpenIndex();
    if (startIndex > 0) notice = 'Vous reprenez le module là où vous vous étiez arrêté.';
  }
  if (!connected) {
    notice = "La connexion avec la plateforme n'a pas pu être établie : votre progression ne sera pas enregistrée.";
    stickyNotice = true;
  }

  els.pager.hidden = false;
  show(startIndex, { focus: false, notice, stickyNotice });
}

/** Donne le focus au premier élément réellement affiché (un bouton masqué par la mise en page ne peut pas le recevoir). */
function focusVisible(...elements) {
  elements.find((element) => element.offsetParent !== null)?.focus();
}

const ICONS = {
  clock: '<path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="9" />',
  steps: '<path d="M4 6h16M4 12h16M4 18h10" />',
  question: '<circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01" />',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" />',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />',
  mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M22 6l-10 7L2 6" />',
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
    els.helpCardIcon.innerHTML = icon('question', 20);
    // Téléphone et courriel : boutons d'action (« phone » / « email » facultatifs dans module.json)
    const { phone, email } = module.help;
    els.helpCardActions.innerHTML = [
      phone
        ? `<a class="help-card__action help-card__action--primary" href="tel:${escapeHtml(phone.replace(/[^\d+]/g, ''))}">${icon('phone', 18)}<span><span class="visually-hidden">Appeler : </span>${escapeHtml(phone)}</span></a>`
        : '',
      email
        ? `<a class="help-card__action" href="mailto:${escapeHtml(email)}">${icon('mail', 18)}<span><span class="visually-hidden">Écrire à : </span>${escapeHtml(email)}</span></a>`
        : '',
    ].join('');
    els.helpCard.hidden = false;
  }
}

/* ---------- Glossaire : fenêtre consultable à tout moment, avec recherche ---------- */

// Recherche insensible à la casse et aux accents
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function setupGlossary(glossary) {
  if (!glossary) return;
  els.glossaryToggle.hidden = false;
  els.menuGlossary.hidden = false;
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
  els.glossaryDialog.addEventListener('close', () => focusVisible(els.glossaryToggle, els.tocToggle));
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
