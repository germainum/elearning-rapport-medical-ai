/**
 * État de l'apprenant : écrans vus, étapes révélées, réponses, score.
 * Ne connaît pas SCORM : il produit une chaîne compacte pour suspend_data.
 *
 * Format de suspend_data (version 1) :
 *   { "v": 1, "c": "<écran courant>", "s": ["<écrans vus>"],
 *     "r": { "<écran scene>": <étapes révélées en plus de la première> },
 *     "a": { "<question>": "<options>" }, "n": <tentative> }
 * Les identifiants d'options font un caractère : « ac » = options a et c.
 */

const STATE_VERSION = 1;

/** Découpe les blocs d'une scène en étapes, séparées par les blocs « reveal ». */
export function stepsOf(screen) {
  if (screen.type !== 'scene') return [{ blocks: [], reveal: null }];
  const steps = [{ blocks: [], reveal: null }];
  for (const block of screen.blocks ?? []) {
    if (block.type === 'reveal') {
      steps[steps.length - 1].reveal = block;
      steps.push({ blocks: [], reveal: null });
    } else {
      steps[steps.length - 1].blocks.push(block);
    }
  }
  return steps;
}

export function questionsOf(screen) {
  if (screen.type === 'quiz') return screen.questions ?? [];
  if (screen.type === 'scene') return (screen.blocks ?? []).filter((block) => block.type === 'question');
  return [];
}

export function correctIdsOf(question) {
  return question.options.filter((option) => option.correct === true).map((option) => option.id);
}

/** Corrige une réponse : juste seulement si elle correspond exactement aux bonnes options. */
export function evaluate(question, ids) {
  const correctIds = correctIdsOf(question);
  const chosen = new Set(ids);
  const correct = chosen.size === correctIds.length && correctIds.every((id) => chosen.has(id));
  const partial = !correct && correctIds.some((id) => chosen.has(id));
  return { correct, partial, correctIds };
}

export function createTracker(module) {
  const screens = module.screens;
  const questions = new Map();
  for (const screen of screens) {
    for (const question of questionsOf(screen)) questions.set(question.id, question);
  }

  let current = screens[0].id;
  let attempt = 1;
  const viewed = new Set();
  const revealed = new Map(); // id d'écran → nombre d'étapes révélées après la première
  const answers = new Map(); // id de question → [ids d'options]

  const indexOf = (id) => screens.findIndex((screen) => screen.id === id);
  const isAnswered = (questionId) => answers.has(questionId);
  const revealedCount = (screen) => revealed.get(screen.id) ?? 0;
  const isFullyRevealed = (screen) => revealedCount(screen) >= stepsOf(screen).length - 1;
  const isScreenDone = (index) => {
    const screen = screens[index];
    return viewed.has(screen.id) && isFullyRevealed(screen) && questionsOf(screen).every((q) => isAnswered(q.id));
  };

  return {
    get currentIndex() {
      return Math.max(0, indexOf(current));
    },

    get attempt() {
      return attempt;
    },

    /** Restaure l'état depuis suspend_data. Ignore ce qui n'existe plus dans le contenu. */
    restore(raw) {
      if (!raw) return false;
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return false;
      }
      if (!data || data.v !== STATE_VERSION) return false;

      if (indexOf(data.c) >= 0) current = data.c;
      for (const id of data.s ?? []) {
        if (indexOf(id) >= 0) viewed.add(id);
      }
      for (const [id, count] of Object.entries(data.r ?? {})) {
        const screen = screens[indexOf(id)];
        if (screen && Number.isInteger(count) && count > 0) {
          revealed.set(id, Math.min(count, stepsOf(screen).length - 1));
        }
      }
      for (const [questionId, value] of Object.entries(data.a ?? {})) {
        const question = questions.get(questionId);
        if (!question || typeof value !== 'string') continue;
        const ids = [...value].filter((id) => question.options.some((option) => option.id === id));
        if (ids.length) answers.set(questionId, ids);
      }
      attempt = Number(data.n) || 1;
      return true;
    },

    serialize() {
      return JSON.stringify({
        v: STATE_VERSION,
        c: current,
        s: [...viewed],
        r: Object.fromEntries(revealed),
        a: Object.fromEntries([...answers].map(([id, ids]) => [id, ids.join('')])),
        n: attempt,
      });
    },

    visit(index) {
      current = screens[index].id;
      viewed.add(current);
    },

    isViewed: (index) => viewed.has(screens[index].id),
    isAnswered,
    getAnswer: (questionId) => answers.get(questionId) ?? null,

    answer(questionId, ids) {
      answers.set(questionId, [...ids]);
      return evaluate(questions.get(questionId), ids);
    },

    /** Nombre d'étapes révélées après la première (0 = seule la première est visible). */
    revealedCount,
    isFullyRevealed,

    reveal(screen) {
      if (!isFullyRevealed(screen)) revealed.set(screen.id, revealedCount(screen) + 1);
    },

    isScreenDone,

    /** Un écran est accessible si tous les écrans précédents sont terminés. */
    canAccess(index) {
      for (let i = 0; i < index; i += 1) {
        if (!isScreenDone(i)) return false;
      }
      return true;
    },

    firstOpenIndex() {
      const index = screens.findIndex((_, i) => !isScreenDone(i));
      return index < 0 ? screens.length - 1 : index;
    },

    /** Tous les écrans vus, toutes les étapes révélées, toutes les questions validées. */
    isComplete() {
      return screens.every((_, i) => isScreenDone(i));
    },

    /** Score sur 100 ou null s'il n'y a aucune question notée. */
    result(passingScore) {
      let earned = 0;
      let max = 0;
      for (const question of questions.values()) {
        const points = question.points ?? 1;
        max += points;
        const ids = answers.get(question.id);
        if (ids && evaluate(question, ids).correct) earned += points;
      }
      if (max === 0) return null;
      const score = Math.round((earned / max) * 100);
      return { score, earned, max, passed: score >= passingScore };
    },

    /** Nouvelle tentative : efface les réponses, conserve les écrans vus et les étapes révélées. */
    resetAnswers() {
      answers.clear();
      attempt += 1;
    },
  };
}
