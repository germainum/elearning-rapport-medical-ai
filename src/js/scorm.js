/**
 * Couche SCORM : SEUL fichier du moteur qui connaît SCORM.
 *
 * Le reste du moteur utilise une interface neutre :
 *   init(), getSuspendData(), setSuspendData(), getLocation(), setLocation(),
 *   getLearnerName(), setScore(), setStatus(), recordInteraction(), commit(), finish()
 *
 * Version visée : attribut data-scorm-version de <html> (« 1.2 » par défaut,
 * réécrit par scripts/build.js). Chaque version est décrite par un adaptateur
 * dans ADAPTERS ; ajouter ou corriger une version ne touche que ce fichier.
 *
 * Mode debug : si aucune API LMS n'est trouvée, une API simulée est utilisée.
 * Elle journalise chaque appel dans la console et persiste dans localStorage
 * pour pouvoir tester la reprise. En LMS, ajouter ?debug à l'URL active aussi
 * le journal.
 */

const MAX_PARENT_DEPTH = 500;

const ADAPTERS = {
  '1.2': {
    apiName: 'API',
    calls: {
      initialize: 'LMSInitialize',
      terminate: 'LMSFinish',
      getValue: 'LMSGetValue',
      setValue: 'LMSSetValue',
      commit: 'LMSCommit',
      getLastError: 'LMSGetLastError',
      getErrorString: 'LMSGetErrorString',
      getDiagnostic: 'LMSGetDiagnostic',
    },
    keys: {
      entry: 'cmi.core.entry',
      location: 'cmi.core.lesson_location',
      suspendData: 'cmi.suspend_data',
      learnerName: 'cmi.core.student_name',
      exit: 'cmi.core.exit',
      sessionTime: 'cmi.core.session_time',
      status: 'cmi.core.lesson_status',
    },
    initialStatus: 'not attempted',
    suspendDataLimit: 4096,

    onInitialize({ get, set }) {
      const status = get('cmi.core.lesson_status');
      if (status === '' || status === 'not attempted') set('cmi.core.lesson_status', 'incomplete');
    },

    // SCORM 1.2 n'a qu'un champ : la réussite prime sur la complétion.
    setStatus({ set }, { completion, success }) {
      let value = 'incomplete';
      if (completion === 'completed') {
        value = success === 'passed' || success === 'failed' ? success : 'completed';
      }
      set('cmi.core.lesson_status', value);
    },

    setScore({ set }, raw) {
      set('cmi.core.score.raw', raw);
      set('cmi.core.score.min', 0);
      set('cmi.core.score.max', 100);
    },

    recordInteraction({ get, set }, interaction) {
      const count = get('cmi.interactions._count');
      if (count === '') return; // interactions non prises en charge par le LMS
      const prefix = `cmi.interactions.${Number(count)}.`;
      set(`${prefix}id`, interaction.id);
      set(`${prefix}type`, 'choice');
      set(`${prefix}time`, clockTime(new Date()));
      set(`${prefix}weighting`, interaction.weighting);
      set(`${prefix}student_response`, interaction.response.join(','));
      set(`${prefix}correct_responses.0.pattern`, interaction.correct.join(','));
      set(`${prefix}result`, interaction.result === 'correct' ? 'correct' : 'wrong');
    },

    /** Réponse à un questionnaire (sans bonne réponse) : { id, type: 'likert'|'choice'|'text', response: texte ou liste } */
    recordSurvey({ get, set }, entry) {
      const count = get('cmi.interactions._count');
      if (count === '') return;
      const prefix = `cmi.interactions.${Number(count)}.`;
      set(`${prefix}id`, entry.id);
      set(`${prefix}type`, entry.type === 'text' ? 'fill-in' : entry.type);
      set(`${prefix}time`, clockTime(new Date()));
      set(`${prefix}student_response`, [].concat(entry.response).join(",").slice(0, 250));
    },

    formatDuration: cmiTimespan,
  },

  '2004': {
    apiName: 'API_1484_11',
    calls: {
      initialize: 'Initialize',
      terminate: 'Terminate',
      getValue: 'GetValue',
      setValue: 'SetValue',
      commit: 'Commit',
      getLastError: 'GetLastError',
      getErrorString: 'GetErrorString',
      getDiagnostic: 'GetDiagnostic',
    },
    keys: {
      entry: 'cmi.entry',
      location: 'cmi.location',
      suspendData: 'cmi.suspend_data',
      learnerName: 'cmi.learner_name',
      exit: 'cmi.exit',
      sessionTime: 'cmi.session_time',
      status: 'cmi.completion_status',
    },
    initialStatus: 'unknown',
    suspendDataLimit: 64000,

    onInitialize({ get, set }) {
      const status = get('cmi.completion_status');
      if (['', 'unknown', 'not attempted'].includes(status)) set('cmi.completion_status', 'incomplete');
    },

    setStatus({ set }, { completion, success }) {
      set('cmi.completion_status', completion === 'completed' ? 'completed' : 'incomplete');
      if (success === 'passed' || success === 'failed') set('cmi.success_status', success);
    },

    setScore({ set }, raw) {
      set('cmi.score.raw', raw);
      set('cmi.score.min', 0);
      set('cmi.score.max', 100);
      set('cmi.score.scaled', Math.round(raw) / 100);
    },

    recordInteraction({ get, set }, interaction) {
      const count = get('cmi.interactions._count');
      if (count === '') return;
      const prefix = `cmi.interactions.${Number(count)}.`;
      set(`${prefix}id`, interaction.id);
      set(`${prefix}type`, 'choice');
      set(`${prefix}timestamp`, isoTimestamp(new Date()));
      set(`${prefix}weighting`, interaction.weighting);
      set(`${prefix}learner_response`, interaction.response.join('[,]'));
      set(`${prefix}correct_responses.0.pattern`, interaction.correct.join('[,]'));
      set(`${prefix}result`, interaction.result === 'correct' ? 'correct' : 'incorrect');
      if (interaction.description) set(`${prefix}description`, interaction.description.slice(0, 250));
    },

    recordSurvey({ get, set }, entry) {
      const count = get('cmi.interactions._count');
      if (count === '') return;
      const prefix = `cmi.interactions.${Number(count)}.`;
      set(`${prefix}id`, entry.id);
      set(`${prefix}type`, entry.type === 'text' ? 'fill-in' : entry.type);
      set(`${prefix}timestamp`, isoTimestamp(new Date()));
      set(`${prefix}learner_response`, [].concat(entry.response).join("[,]").slice(0, 250));
      if (entry.description) set(`${prefix}description`, entry.description.slice(0, 250));
    },

    formatDuration: isoDuration,
  },
};

/* ---------- Recherche de l'API (algorithme ADL) ---------- */

function findApiFrom(start, name) {
  let win = start;
  for (let depth = 0; win && depth <= MAX_PARENT_DEPTH; depth += 1) {
    try {
      if (win[name]) return win[name];
    } catch {
      // Fenêtre d'une autre origine : on continue vers le parent.
    }
    if (!win.parent || win.parent === win) break;
    win = win.parent;
  }
  return null;
}

function findApi(name) {
  let api = findApiFrom(window, name);
  if (!api && window.opener) api = findApiFrom(window.opener, name);
  if (!api) {
    try {
      if (window.top.opener) api = findApiFrom(window.top.opener, name);
    } catch {
      // Accès refusé à window.top : pas d'API par ce chemin.
    }
  }
  return api;
}

/* ---------- API simulée (mode debug) ---------- */

function createMockApi(version, storageKey) {
  const { calls, keys, initialStatus } = ADAPTERS[version];
  const saved = readStorage(storageKey) ?? {};
  const data = { ...saved };
  data[keys.entry] = saved[keys.exit] === 'suspend' ? 'resume' : 'ab-initio';
  delete data[keys.exit];
  data[keys.learnerName] ??= 'Test, Apprenant';
  data[keys.status] ??= initialStatus;

  const persist = () => writeStorage(storageKey, data);
  const interactionCount = () =>
    Object.keys(data).filter((key) => /^cmi\.interactions\.\d+\.id$/.test(key)).length;

  const impl = {
    initialize: () => 'true',
    terminate: () => (persist(), 'true'),
    getValue: (key) => (key === 'cmi.interactions._count' ? String(interactionCount()) : data[key] ?? ''),
    setValue: (key, value) => ((data[key] = String(value)), 'true'),
    commit: () => (persist(), 'true'),
    getLastError: () => '0',
    getErrorString: () => '',
    getDiagnostic: () => '',
  };

  return Object.fromEntries(Object.entries(calls).map(([name, fn]) => [fn, impl[name]]));
}

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible (navigation privée…) : la reprise ne sera pas testable.
  }
}

/* ---------- Interface publique ---------- */

export function createScorm({ storageKey = 'scorm-simule', debug = false } = {}) {
  const preferred = document.documentElement.dataset.scormVersion === '2004' ? '2004' : '1.2';
  const other = preferred === '1.2' ? '2004' : '1.2';

  let version = preferred;
  let api = findApi(ADAPTERS[preferred].apiName);
  if (!api) {
    api = findApi(ADAPTERS[other].apiName);
    if (api) version = other;
  }
  const mode = api ? 'lms' : 'mock';
  if (!api) api = createMockApi(version, storageKey);

  const adapter = ADAPTERS[version];
  const { calls, keys } = adapter;
  const verbose = debug; // journal dans la console : seulement avec ?debug
  let initialized = false;
  let terminated = false;
  let startedAt = Date.now();

  function log(message) {
    if (!verbose) return;
    const label = mode === 'mock' ? `[SCORM ${version} simulé]` : `[SCORM ${version}]`;
    console.info(`%c${label}`, 'color:#1d4f7c;font-weight:bold', message);
  }

  function call(name, ...args) {
    let result;
    try {
      result = api[calls[name]](...args);
    } catch (error) {
      console.warn(`[SCORM] ${calls[name]} a levé une exception`, error);
      return '';
    }
    log(`${calls[name]}(${args.map((a) => JSON.stringify(a)).join(', ')}) → ${JSON.stringify(result)}`);
    return result;
  }

  function reportError(context) {
    try {
      const code = String(api[calls.getLastError]());
      if (code && code !== '0') {
        console.warn(`[SCORM] Erreur ${code} (${api[calls.getErrorString](code)}) sur ${context}`);
      }
    } catch {
      // API défaillante : rien de plus à signaler.
    }
  }

  const active = () => initialized && !terminated;

  function get(key) {
    if (!active()) return '';
    const value = call('getValue', key);
    reportError(`${calls.getValue}("${key}")`);
    return value == null ? '' : String(value);
  }

  function set(key, value) {
    if (!active()) return false;
    const ok = String(call('setValue', key, String(value))) === 'true';
    if (!ok) reportError(`${calls.setValue}("${key}")`);
    return ok;
  }

  const io = { get, set };

  return {
    version,
    mode,

    /** Ouvre la session. Retourne false si le LMS refuse l'initialisation. */
    init() {
      if (initialized) return true;
      initialized = String(call('initialize', '')) === 'true';
      if (!initialized) {
        reportError(calls.initialize);
        return false;
      }
      startedAt = Date.now();
      adapter.onInitialize(io);
      return true;
    },

    getSuspendData: () => get(keys.suspendData),

    setSuspendData(data) {
      if (data.length > adapter.suspendDataLimit) {
        console.warn(`[SCORM] suspend_data dépasse ${adapter.suspendDataLimit} caractères (${data.length}).`);
      }
      set(keys.suspendData, data);
    },

    getLocation: () => get(keys.location),
    setLocation: (location) => set(keys.location, location),
    getLearnerName: () => get(keys.learnerName),

    /** Score de 0 à 100. */
    setScore: (raw) => adapter.setScore(io, raw),

    /** completion : 'completed' | 'incomplete' ; success : 'passed' | 'failed' | 'unknown' */
    setStatus: (status) => adapter.setStatus(io, status),

    /** { id, response: [ids], correct: [ids], result: 'correct'|'incorrect', weighting, description } */
    recordInteraction: (interaction) => adapter.recordInteraction(io, interaction),

    /** { id, type: 'likert'|'choice'|'text', response: texte, description } : réponse au questionnaire de satisfaction */
    recordSurvey: (entry) => adapter.recordSurvey(io, entry),

    commit() {
      if (active()) call('commit', '');
    },

    /** Ferme la session en conservant la progression pour la prochaine ouverture. */
    finish() {
      if (!active()) return;
      set(keys.exit, 'suspend');
      set(keys.sessionTime, adapter.formatDuration(Date.now() - startedAt));
      call('commit', '');
      call('terminate', '');
      terminated = true;
    },

    /** Mode debug uniquement : efface la progression simulée. */
    resetMock() {
      if (mode !== 'mock') return;
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Rien à effacer.
      }
    },
  };
}

/* ---------- Formats de temps ---------- */

const pad = (n, size = 2) => String(n).padStart(size, '0');

function splitDuration(ms) {
  const cs = Math.max(0, Math.round(ms / 10)); // centièmes de seconde
  return {
    hours: Math.floor(cs / 360000),
    minutes: Math.floor(cs / 6000) % 60,
    seconds: (cs % 6000) / 100,
  };
}

/** SCORM 1.2 CMITimespan : HHHH:MM:SS.SS */
function cmiTimespan(ms) {
  const { hours, minutes, seconds } = splitDuration(ms);
  return `${pad(Math.min(hours, 9999))}:${pad(minutes)}:${seconds.toFixed(2).padStart(5, '0')}`;
}

/** SCORM 2004 : durée ISO 8601 (PT1H2M3.4S) */
function isoDuration(ms) {
  const { hours, minutes, seconds } = splitDuration(ms);
  return `PT${hours}H${minutes}M${seconds}S`;
}

/** SCORM 1.2 CMITime : HH:MM:SS */
function clockTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** SCORM 2004 : horodatage YYYY-MM-DDThh:mm:ss */
function isoTimestamp(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${clockTime(date)}`;
}
