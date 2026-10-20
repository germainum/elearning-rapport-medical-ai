/**
 * Moteur du module : chargement du contenu, navigation, liaison avec le suivi.
 * Aucun texte pédagogique ici : tout vient de content/module.json.
 */

import { createScorm } from './scorm.js';
import { buildReport, reportDocument, reportFileName, reportHtml } from './report.js';
import { createTracker, questionsOf, stepsOf } from './tracker.js';
import { escapeHtml, inline, plainText, rich } from './format.js';
import { renderBlock } from './screens/blocks.js';
import { wireVideos } from './screens/common.js';
import { renderText } from './screens/text.js';
import { renderScene } from './screens/scene.js';
import { renderQuiz } from './screens/quiz.js';
import { renderSummary } from './screens/summary.js';
import { renderSurvey } from './screens/survey.js';
import { setupShortcuts, setupShortcutsSetting, setupTextSize, setupTheme, timeLeftText } from './comfort.js';

const CONTENT_URL = 'content/module.json';
const DEFAULT_PASSING_SCORE = 80;
const DEFAULT_CONTINUE_LABEL = 'Suivant';

const RENDERERS = {
  text: renderText,
  scene: renderScene,
  quiz: renderQuiz,
  summary: renderSummary,
  survey: renderSurvey,
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
  settingsToggle: byId('settings-toggle'),
  menuSettings: byId('menu-settings'),
  settingsDialog: byId('settings-dialog'),
  settingsClose: byId('settings-close'),
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
  fileToReport: byId('file-to-report'),
  reportTab: byId('report-tab'),
  reportSide: byId('report-side'),
  reportSideBody: byId('report-side-body'),
  reportSideClose: byId('report-side-close'),
  reportToFile: byId('report-to-file'),
  reportToggle: byId('report-toggle'),
  menuReport: byId('menu-report'),
  reportDialog: byId('report-dialog'),
  reportDialogBody: byId('report-dialog-body'),
  reportClose: byId('report-close'),
  reportPrint: byId('report-print'),
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
    report: module.report
      ? {
          summary: () => {
            const data = buildReport(module, tracker);
            return { filled: data.filled, total: data.total };
          },
          open: () => openReportView(),
          print: () => printReport(),
          download: () => downloadReport(),
        }
      : null,
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
        description: [screens.find((s) => questionsOf(s).includes(question))?.kicker, plainText(question.prompt)].filter(Boolean).join(' · '),
      });
      els.pagerMsg.textContent = '';
      sync();
      updateChrome();
      return result;
    },

    survey: {
      get: (id) => tracker.getSurvey(id),
      set(id, value) {
        tracker.setSurvey(id, value);
        sync();
      },
      sent: () => tracker.surveySent,
      /** Envoie les réponses au LMS : une interaction par question répondue, une seule fois. */
      submit(items) {
        if (tracker.surveySent) return;
        for (const item of items) {
          const value = tracker.getSurvey(item.id);
          if (!value) continue;
          const type = item.kind === 'scale' ? 'likert' : item.kind === 'text' ? 'text' : 'choice';
          const response = item.kind === 'multiple' ? [...value] : value;
          scorm.recordSurvey({ id: `eval-${item.id}`, type, response, description: plainText(item.prompt) });
        }
        tracker.markSurveySent();
        sync();
      },
    },
    wrongQuestions: () => tracker.wrongQuestions(),
    sectionResults: () => tracker.sectionResults(),

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
    const previous = index;
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
    // Question précédente de la feuille (avec la réponse écrite), gardée pour la faire « défiler » vers le haut
    const sheetBefore = els.screen.querySelector('.form-sheet');
    const previousItem = target === previous + 1 ? sheetBefore?.querySelector('.form-sheet__item')?.cloneNode(true) : null;
    const previousTitle = sheetBefore?.querySelector('.form-sheet__title')?.textContent;
    const article = render(screen, ctx);
    els.screen.replaceChildren(article);
    const banner = reviewBanner();
    if (banner) els.screen.prepend(banner);
    animateScreenIn(article, target >= previous ? 'forward' : 'backward');
    if (previousItem) animateSheetDescent(article, previousItem, previousTitle);
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

  const nextState = { index: -1, locked: true }; // état du bouton « Suivant » au dernier affichage

  function updateChrome() {
    const total = screens.length;
    const done = screens.filter((_, i) => tracker.isScreenDone(i)).length;
    // Forme courte « 10/35 » sur les très petits écrans ; la forme longue reste lue par les lecteurs d'écran
    els.progressText.innerHTML = `<span class="progress-text__long">Écran ${index + 1} sur ${total}</span><span class="progress-text__short" aria-hidden="true">${index + 1}/${total}</span>`;
    const percent = Math.round((done / total) * 100);
    els.progressBar.style.width = `${percent}%`;
    // Avancement d'ensemble, en tête du sommaire (colonne de gauche) et du menu
    for (const element of document.querySelectorAll('[data-overall]')) updateOverall(element, percent);
    els.progressPill.textContent = `${index + 1} / ${total}`;
    // Pastilles de durée / questions : utiles à l'accueil seulement
    els.sideMeta.hidden = screens[index].section !== screens[0].section;
    const timeLeft = timeLeftText(module, tracker, index);
    for (const element of document.querySelectorAll('[data-time-left]')) {
      element.textContent = timeLeft;
      element.hidden = !timeLeft;
    }

    // En-tête : le fil rouge seul (ex. « Rapport de Mme R. »)
    const screen = screens[index];
    els.crumbs.innerHTML = [screen.storyTitle ?? module.storyTitle]
      .filter(Boolean)
      .map((text, i, all) => `<li${i === all.length - 1 ? ' aria-current="page"' : ''}>${inline(text)}</li>`)
      .join('');

    els.prev.disabled = index === 0;
    els.next.hidden = index === total - 1;
    els.next.textContent = reviewNextLabel() ?? plainText(screens[index].continueLabel ?? DEFAULT_CONTINUE_LABEL);
    const nextLocked = !tracker.isScreenDone(index);
    // Rappel discret (non annoncé) sous le bouton grisé : ce qu'il reste à faire pour continuer
    const hint = byId('pager-hint');
    hint.textContent = !nextLocked
      ? ''
      : questionsOf(screens[index]).some((q) => !tracker.isAnswered(q.id))
        ? 'Répondez à la question pour continuer'
        : 'Poursuivez la lecture pour continuer';
    els.next.setAttribute('aria-disabled', String(nextLocked));
    // Le bouton se « débloque » sous les yeux de l'apprenant (dernière réponse validée, dernière étape révélée) : il s'éclaire
    // et sa flèche invite à avancer. Rien quand on arrive sur un écran déjà terminé.
    if (nextState.index === index && nextState.locked && !nextLocked) {
      els.next.classList.remove('btn--ready', 'btn--denied');
      void els.next.offsetWidth; // relance l'animation si elle a déjà eu lieu
      els.next.classList.add('btn--ready');
    } else if (nextLocked || nextState.index !== index) {
      els.next.classList.remove('btn--ready');
    }
    nextState.index = index;
    nextState.locked = nextLocked;

    renderToc();
    // « hidePatientFile » : écrans d'un autre cas, où le dossier de la patiente principale n'a pas sa place
    const fileUnlocked = isFileAvailable();
    els.fileToggle.hidden = !fileUnlocked;
    els.menuFile.hidden = !fileUnlocked; // même dossier, depuis le menu burger (mobile)
    // Ordinateur : onglets « Dossier patient » et « Mon rapport » à droite ; le panneau garde son état d'un écran à l'autre
    els.folderTab.hidden = !fileUnlocked;
    const reportAvailable = isReportAvailable();
    els.reportToggle.hidden = !reportAvailable;
    els.menuReport.hidden = !reportAvailable;
    els.reportTab.hidden = !reportAvailable;
    els.fileToReport.hidden = !reportAvailable;
    els.reportToFile.hidden = !fileUnlocked;
    refreshReport();
    applyPanels();
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

  // Panneau latéral (ordinateur) : dossier patient ou rapport, un seul ouvert à la fois. Préférence propre à ce navigateur.
  const PANEL_KEY = `panneau-ouvert:${module.id}`;
  let openPanel = null;
  try {
    const saved = localStorage.getItem(PANEL_KEY);
    openPanel =
      saved === 'dossier' || saved === 'rapport' ? saved : localStorage.getItem(`dossier-ouvert:${module.id}`) === '1' ? 'dossier' : null;
  } catch {
    // Stockage indisponible : les panneaux démarrent fermés
  }

  // « report.availableFrom » (id d'écran) : le rapport n'apparaît qu'à partir de cet écran ; « hideReport » le masque (autre cas)
  const reportFromIndex = module.report?.availableFrom ? screens.findIndex((screen) => screen.id === module.report.availableFrom) : -1;
  const isReportAvailable = () =>
    Boolean(module.report) && !screens[index].hideReport && (reportFromIndex < 0 || index >= reportFromIndex);
  const isFileAvailable = () => isPatientFileUnlocked() && !screens[index].hidePatientFile;

  function applyPanels() {
    const showFile = openPanel === 'dossier' && isFileAvailable();
    const showReport = openPanel === 'rapport' && isReportAvailable();
    els.fileSide.hidden = !showFile;
    els.reportSide.hidden = !showReport;
    els.appBody.classList.toggle('app-body--with-file', showFile || showReport);
    for (const [tab, shown] of [
      [els.folderTab, showFile],
      [els.reportTab, showReport],
    ]) {
      tab.setAttribute('aria-expanded', String(shown));
      tab.classList.toggle('folder-tab--open', showFile || showReport);
    }
  }

  function setPanel(name) {
    openPanel = name;
    try {
      localStorage.setItem(PANEL_KEY, name ?? '');
    } catch {
      // Préférence non mémorisée : sans conséquence
    }
    applyPanels();
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
      setPanel('dossier');
      els.fileSideClose.focus();
    });
    els.fileSideClose.addEventListener('click', () => {
      setPanel(null);
      els.folderTab.focus();
    });
    els.fileSide.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setPanel(null);
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

  /* ---------- Mon rapport : le formulaire qui se remplit au fil des réponses ---------- */

  let reportSignature = '';
  let reportStatuses = new Map();

  /** Met à jour le compteur, le panneau et l'onglet après chaque réponse. */
  function refreshReport() {
    if (!module.report) return;
    const data = buildReport(module, tracker);
    document.querySelectorAll('[data-report-count]').forEach((element) => {
      element.textContent = `${data.filled}/${data.total}`;
    });
    const fields = data.sections.flatMap((section) => section.fields);
    const signature = fields.map((field) => field.status[0]).join('');
    if (signature === reportSignature) return;
    reportSignature = signature;

    const scroll = els.reportSideBody.scrollTop;
    els.reportSideBody.innerHTML = reportHtml(data, module);
    els.reportSideBody.scrollTop = scroll;

    // Champs qui viennent de se remplir : mise en évidence, et petit rebond de l'onglet
    const fresh = fields.filter((field) => reportStatuses.has(field.id) && reportStatuses.get(field.id) !== field.status && field.status !== 'empty');
    for (const field of fresh) {
      els.reportSideBody.querySelector(`[data-field="${CSS.escape(field.id)}"]`)?.classList.add('report__field--new');
    }
    if (fresh.length) {
      els.reportTab.classList.remove('folder-tab--pulse');
      void els.reportTab.offsetWidth; // relance l'animation
      els.reportTab.classList.add('folder-tab--pulse');
    }
    reportStatuses = new Map(fields.map((field) => [field.id, field.status]));
  }

  const renderReportDialog = () => {
    els.reportDialogBody.innerHTML = reportHtml(buildReport(module, tracker), module);
  };

  /** Ordinateur : panneau latéral ; tablette et mobile : fenêtre. */
  function openReportView() {
    if (window.matchMedia('(min-width: 64rem)').matches) {
      setPanel('rapport');
      els.reportSideClose.focus();
    } else {
      renderReportDialog();
      els.reportDialog.showModal();
    }
  }

  /** Impression (ou « Enregistrer en PDF » du navigateur) : seul le rapport est imprimé. */
  function printReport() {
    els.reportPrint.innerHTML = reportHtml(buildReport(module, tracker), module);
    document.body.classList.add('printing-report');
    const done = () => {
      document.body.classList.remove('printing-report');
      els.reportPrint.replaceChildren();
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    try {
      window.print();
    } catch {
      done();
      downloadReport(); // impression refusée (iframe du LMS) : on propose le fichier
    }
  }

  /** Fichier HTML autonome : s'ouvre dans le navigateur, s'imprime ou s'enregistre en PDF. */
  function downloadReport() {
    const blob = new Blob([reportDocument(buildReport(module, tracker), module)], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${reportFileName(module)}.html`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  if (module.report) {
    els.reportTab.addEventListener('click', () => {
      setPanel('rapport');
      els.reportSideClose.focus();
    });
    els.reportSideClose.addEventListener('click', () => {
      setPanel(null);
      els.reportTab.focus();
    });
    els.reportSide.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setPanel(null);
        els.reportTab.focus();
      }
    });
    // Passer d'un panneau à l'autre
    els.fileToReport.addEventListener('click', () => {
      setPanel('rapport');
      els.reportSideClose.focus();
    });
    els.reportToFile.addEventListener('click', () => {
      setPanel('dossier');
      els.fileSideClose.focus();
    });
    // Tablette et mobile : fenêtre
    els.reportToggle.addEventListener('click', () => {
      renderReportDialog();
      els.reportDialog.showModal();
    });
    els.menuReport.addEventListener('click', () => {
      setTocOpen(false);
      els.reportToggle.click();
    });
    els.reportClose.addEventListener('click', () => els.reportDialog.close());
    els.reportDialog.addEventListener('click', (event) => {
      if (event.target === els.reportDialog) els.reportDialog.close();
    });
    els.reportDialog.addEventListener('close', () => focusVisible(els.reportToggle, els.tocToggle));
    document.querySelectorAll('[data-report-print]').forEach((button) => button.addEventListener('click', printReport));
    document.querySelectorAll('[data-report-download]').forEach((button) => button.addEventListener('click', downloadReport));
  }

  /* ---------- Sommaire ---------- */

  // Même sommaire à deux endroits : menu déroulant (mobile, tablette) et colonne de gauche (ordinateur)
  function renderToc() {
    els.tocList.replaceChildren(...tocItems('toc-list'));
    els.tocSideList.replaceChildren(...tocItems('toc-side-list'));
    stepsPrimed.add('toc-list').add('toc-side-list');
  }

  // Anneaux et repères du sommaire : état au dernier affichage, pour n'animer que ce qui vient de changer
  const ringState = new Map(); // « liste:rubrique » → { pct, complete }
  const stepsDone = new Set(); // « liste:écran » déjà terminés
  const stepsPrimed = new Set(); // listes déjà affichées une première fois (rien ne rebondit à ce moment-là)

  // Section ouverte dans le sommaire : celle de l'écran affiché (une seule à la fois, ouverte à la main ou automatiquement)
  let openSection = screens[0].section ?? null;

  /** Une ligne du sommaire (frise de progression) pour l'écran i. */
  function stepItem(screen, i, listId = '') {
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
    // Repère qui vient de passer à « terminé » : petit rebond
    const stepKey = `${listId}:${i}`;
    const justDone = state === 'done' && stepsPrimed.has(listId) && !stepsDone.has(stepKey) && !REDUCED_MOTION.matches;
    if (state === 'done') stepsDone.add(stepKey);
    element.innerHTML = `
      <span class="toc__marker${justDone ? ' toc__marker--pop' : ''}" aria-hidden="true">${state === 'done' ? icon('check', 14) : ''}</span>
      <span class="toc__label">${title}</span>
      <span class="toc__status">${status}</span>`;
    item.append(element);
    return item;
  }

  // Rubriques terminées du début du parcours : repliées derrière une seule ligne, dépliables à la demande
  let doneExpanded = false;

  /**
   * Sommaire : une rubrique repliable par section (« Section 2 · 3 sur 8 »), seule celle de l'écran affiché est ouverte.
   * Les rubriques déjà terminées (au moins deux) se replient en une ligne « n parties terminées » ; un intertitre
   * (champ « part » des écrans) regroupe les rubriques voisines ; les rubriques « optional » sont en retrait.
   * Sans champ « section » dans le contenu, la liste reste à plat.
   */
  function tocItems(listId) {
    if (!screens.some((screen) => screen.section)) return screens.map((screen, i) => stepItem(screen, i));

    const groups = [];
    screens.forEach((screen, i) => {
      const last = groups.at(-1);
      if (last && last.section === (screen.section ?? null)) last.indexes.push(i);
      else groups.push({ section: screen.section ?? null, indexes: [i] });
    });
    groups.forEach((group, g) => {
      group.g = g;
      group.open = group.section === openSection;
      group.done = group.indexes.filter((i) => tracker.isScreenDone(i)).length;
      group.complete = group.done === group.indexes.length;
      group.optional = group.indexes.every((i) => screens[i].optional === true);
      group.locked = !group.open && !tracker.canAccess(group.indexes[0]);
      group.part = screens[group.indexes[0]].part ?? null;
      // « Section 2 · Situation médicale » : surtitre « SECTION 2 » puis nom ; les autres titres s'affichent seuls
      const [overline, ...rest] = plainText(group.section ?? 'Autres écrans').split(' · ');
      group.overline = rest.length ? overline : null;
      group.label = rest.length ? rest.join(' · ') : overline;
    });
    // Un même surtitre sur des rubriques voisines (« Démarrage ») s'affiche une fois, en intertitre
    groups.forEach((group, g) => {
      group.sharedOverline = Boolean(group.overline) && (groups[g - 1]?.overline === group.overline || groups[g + 1]?.overline === group.overline);
    });

    let doneRun = 0;
    while (doneRun < groups.length && groups[doneRun].complete && !groups[doneRun].open && !groups[doneRun].optional) doneRun += 1;
    const foldable = doneRun >= 2;
    const folded = foldable && !doneExpanded;

    const items = [];
    if (foldable) {
      const screensDone = groups.slice(0, doneRun).reduce((sum, group) => sum + group.indexes.length, 0);
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'toc__done-toggle';
      toggle.setAttribute('aria-expanded', String(!folded));
      toggle.innerHTML = `
        <span class="toc__ring toc__ring--done" aria-hidden="true">${icon('check', 14)}</span>
        <span class="toc__section-title">${folded ? `${doneRun} parties terminées` : 'Masquer les parties terminées'}</span>
        <span class="toc__count toc__count--done"><span class="visually-hidden">${screensDone} écrans terminés</span></span>
        <svg class="toc__chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
      toggle.addEventListener('click', () => {
        doneExpanded = folded;
        renderToc();
        document.getElementById(listId)?.querySelector('.toc__done-toggle')?.focus();
      });
      const li = document.createElement('li');
      li.className = 'toc__done';
      li.append(toggle);
      items.push(li);
    }

    let previousPart = null;
    let previousOverline = null;
    for (const group of folded ? groups.slice(doneRun) : groups) {
      // Intertitre quand on entre dans un ensemble de rubriques ; simple filet quand on en sort
      if (group.part !== previousPart) {
        const separator = document.createElement('li');
        if (group.part) {
          separator.className = 'toc__heading';
          separator.textContent = group.part;
        } else {
          separator.className = 'toc__break';
          separator.setAttribute('role', 'presentation');
        }
        if (group.part || previousPart) items.push(separator);
      }
      previousPart = group.part;
      if (group.sharedOverline && group.overline !== previousOverline) {
        const heading = document.createElement('li');
        heading.className = 'toc__heading';
        heading.textContent = group.overline;
        items.push(heading);
      }
      previousOverline = group.sharedOverline ? group.overline : null;
      items.push(groupItem(group, listId));
    }
    return items;
  }

  function groupItem(group, listId) {
    const { g, open, done, complete, optional, locked } = group;
    const subId = `${listId}-groupe-${g}`;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'toc__section';
    toggle.dataset.group = String(g);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-controls', subId);
    const total = group.indexes.length;
    const pct = Math.round((done / total) * 100);
    const ringKey = `${listId}:${g}`;
    const before = ringState.get(ringKey);
    ringState.set(ringKey, { pct, complete });
    const animate = Boolean(before) && !REDUCED_MOTION.matches && (before.pct !== pct || before.complete !== complete) && !(before.complete && !complete);
    const startPct = animate ? before.pct : pct;
    const startComplete = animate ? before.complete : complete;
    toggle.innerHTML = `
      <span class="toc__ring${startComplete ? ' toc__ring--done' : ''}" style="--pct:${startPct}" aria-hidden="true">${startComplete ? icon('check', 14) : ''}</span>
      <span class="toc__section-text">
        ${group.overline && !group.sharedOverline ? `<span class="toc__section-over">${escapeHtml(group.overline)}</span>` : ''}
        <span class="toc__section-title">${escapeHtml(group.label)}</span>
      </span>
      <span class="toc__count${complete ? ' toc__count--done' : ''}"><span aria-hidden="true">${locked ? icon('lock', 14) : complete || done === 0 ? '' : `${done}/${total}`}</span><span class="visually-hidden">${locked ? 'à venir, ' : ''}${done} écran${done > 1 ? 's' : ''} terminé${done > 1 ? 's' : ''} sur ${total}</span></span>
      <svg class="toc__chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
    if (animate) {
      const ring = toggle.querySelector('.toc__ring');
      // deux images plus tard, pour que la transition CSS parte de la part précédente
      requestAnimationFrame(() => requestAnimationFrame(() => ring.style.setProperty('--pct', String(pct))));
      if (complete && !before.complete) {
        // l'anneau se ferme, puis la coche apparaît avec un rebond
        setTimeout(() => {
          ring.classList.add('toc__ring--done', 'toc__ring--pop');
          ring.innerHTML = icon('check', 14);
        }, 850);
      }
    }
    toggle.addEventListener('click', () => {
      openSection = open ? null : group.section;
      renderToc();
      document.getElementById(listId)?.querySelector(`[data-group="${g}"]`)?.focus();
    });

    const sub = document.createElement('ol');
    sub.className = 'toc__sublist';
    sub.id = subId;
    sub.hidden = !open;
    for (const i of group.indexes) sub.append(stepItem(screens[i], i, listId));

    const li = document.createElement('li');
    li.className = `toc__group${optional ? ' toc__group--optional' : ''}${locked ? ' toc__group--locked' : ''}`;
    li.append(toggle, sub);
    return li;
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

  setupTextSize(module.id);
  setupTheme(document.querySelectorAll('input[name="theme"]'));
  setupShortcutsSetting(module.id, byId('shortcuts-enabled'));

  /* ---------- Paramètres : taille du texte, raccourcis clavier ---------- */

  function openSettings() {
    setTocOpen(false);
    els.settingsDialog.showModal();
  }
  els.settingsToggle.addEventListener('click', openSettings);
  els.menuSettings.addEventListener('click', openSettings);
  els.settingsClose.addEventListener('click', () => els.settingsDialog.close());
  els.settingsDialog.addEventListener('click', (event) => {
    if (event.target === els.settingsDialog) els.settingsDialog.close();
  });
  els.settingsDialog.addEventListener('close', () => focusVisible(els.settingsToggle, els.tocToggle));
  setupShortcuts({ screenEl: els.screen, prev: els.prev, next: els.next });

  els.prev.addEventListener('click', () => {
    if (index > 0) show(index - 1);
  });

  els.next.addEventListener('click', () => {
    if (tracker.isScreenDone(index)) {
      goNext();
      return;
    }
    // Écran pas terminé : le bouton se secoue, en plus du message
    els.next.classList.remove('btn--denied');
    void els.next.offsetWidth;
    els.next.classList.add('btn--denied');
    setTimeout(() => els.next.classList.remove('btn--denied'), 600);
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

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

const ICONS = {
  clock: '<path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="9" />',
  steps: '<path d="M4 6h16M4 12h16M4 18h10" />',
  question: '<circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01" />',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" />',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />',
  mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M22 6l-10 7L2 6" />',
};

const icon = (name, size = 16) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/**
 * Entrée d'un écran : l'en-tête descend, les blocs montent en cascade (de la droite en avançant, de la gauche en reculant),
 * les réponses arrivent une à une, un trait vert balaie le haut. Rien si l'utilisateur a demandé moins de mouvement.
 */
function animateScreenIn(article, direction) {
  if (REDUCED_MOTION.matches) return;
  const items = [article.querySelector('.screen__header')];
  for (const child of article.children) {
    if (child.classList.contains('screen__header')) continue;
    if (child.classList.contains('scene__steps')) items.push(...child.querySelectorAll('.scene__step > *'));
    else items.push(child);
  }
  items.filter(Boolean).forEach((item, i) => {
    item.classList.add('enter-item');
    item.style.setProperty('--n', String(Math.min(i, 5)));
  });
  article.querySelectorAll('.question__options > .option').forEach((option, i) => option.style.setProperty('--n', String(i)));
  article.dataset.enter = direction;
  article.classList.add('screen--enter');
  // L'entrée terminée, la classe est retirée : elle ne doit pas gêner les animations de la réponse
  setTimeout(() => article.classList.remove('screen--enter'), 2400);
}

/**
 * On « descend » dans le formulaire, comme un papier que l'on fait défiler sous un en-tête fixe : la question qui vient d'être
 * remplie (avec sa réponse écrite) glisse vers le haut et passe sous le bandeau de la feuille, la question suivante monte à sa
 * place et s'illumine un instant, comme avec un surligneur. Tout est un seul défilement (même durée, même courbe) : la fenêtre de
 * la feuille se resserre pendant que son contenu monte. Seulement d'une question à la suivante d'une même section.
 */
function animateSheetDescent(article, previousItem, previousTitle) {
  if (REDUCED_MOTION.matches) return;
  const sheet = article.querySelector('.form-sheet');
  const list = sheet?.querySelector('.form-sheet__items');
  const current = list?.querySelector('.form-sheet__item');
  if (!sheet || !current || sheet.querySelector('.form-sheet__title')?.textContent !== previousTitle) return;

  (sheet.closest('.enter-item') ?? sheet).classList.remove('enter-item'); // la feuille reste en place : c'est le papier qui défile

  // Fenêtre qui découpe le papier (overflow caché), contenant la liste des questions
  const window_ = document.createElement('div');
  window_.className = 'form-sheet__scroll form-sheet__scroll--moving';
  list.replaceWith(window_);
  window_.append(list);

  previousItem.classList.add('form-sheet__ghost');
  previousItem.setAttribute('aria-hidden', 'true');
  previousItem.setAttribute('inert', '');
  list.prepend(previousItem);

  const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
  const shift = previousItem.getBoundingClientRect().height + gap; // distance dont le papier remonte
  const fullHeight = window_.getBoundingClientRect().height;
  const timing = { duration: 1150, delay: 300, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'both' };

  const paper = list.animate([{ transform: 'translateY(0)' }, { transform: `translateY(-${shift}px)` }], timing);
  const frame = window_.animate([{ height: `${fullHeight}px` }, { height: `${fullHeight - shift}px` }], timing);
  // la feuille « tire » légèrement au démarrage, comme un papier qu'on saisit
  sheet.animate(
    [{ transform: 'translateY(0)' }, { transform: 'translateY(3px)', offset: 0.18 }, { transform: 'translateY(0)' }],
    { duration: 900, delay: 300, easing: 'ease-out' },
  );
  current.classList.add('form-sheet__item--now');

  const settle = () => {
    previousItem.remove();
    paper.cancel();
    frame.cancel();
    window_.replaceWith(list); // la mise en page redevient celle de la feuille ordinaire
  };
  Promise.all([paper.finished, frame.finished]).then(settle, settle);
}

/** Compte de 0 à n % en douceur (instantané si l'utilisateur a demandé moins de mouvement). */
function animateNumber(element, from, to) {
  if (REDUCED_MOTION.matches || from === to) {
    element.textContent = `${to} %`;
    return;
  }
  const start = performance.now();
  const duration = Math.min(1400, 450 + Math.abs(to - from) * 35);
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    element.textContent = `${Math.round(from + (to - from) * eased)} %`;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Barre d'avancement d'ensemble : remplissage animé, éclat à chaque progression, pourcentage qui défile. */
function updateOverall(element, percent) {
  const bar = element.querySelector('.overall__bar');
  const fill = element.querySelector('.overall__fill');
  const label = element.querySelector('[data-overall-percent]');
  const previous = Number(element.dataset.percent ?? 0);
  element.dataset.percent = String(percent);
  fill.style.width = `${percent}%`;
  bar.setAttribute('aria-valuenow', String(percent));
  bar.setAttribute('aria-valuetext', `${percent} % terminé`);
  element.classList.toggle('overall--done', percent >= 100);
  if (percent > previous && !REDUCED_MOTION.matches) {
    // l'animation CSS ne repart que si la classe est retirée puis remise
    element.classList.remove('overall--gain');
    void element.offsetWidth;
    element.classList.add('overall--gain');
    setTimeout(() => element.classList.remove('overall--gain'), 1300);
  }
  animateNumber(label, previous, percent);
}

/** Colonne de gauche : titre, pastilles d'information (dérivées du contenu), carte d'aide. */
function renderSidebarIntro(module) {
  els.sideModule.textContent = plainText(module.title);
  const questionCount = module.screens.reduce((n, screen) => n + questionsOf(screen).length, 0);
  const chips = [
    module.durationMinutes ? [icon('clock'), `${module.durationMinutes} min`] : null,
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
