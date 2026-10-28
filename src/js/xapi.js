/**
 * Couche xAPI (Experience API), isolée comme scorm.js : le reste du moteur n'en connaît que cette interface.
 *
 * xAPI s'ajoute à SCORM, il ne le remplace pas : sans paramètres de lancement, rien n'est envoyé et rien ne change.
 * Un LRS (ou un LMS compatible xAPI) lance le module avec les paramètres habituels de l'adresse (lancement « Tin Can ») :
 *   endpoint        adresse du LRS, ex. https://lrs.example.org/xapi/
 *   auth            en-tête Authorization, ex. « Basic dGVzdDp0ZXN0 »
 *   actor           l'apprenant, en JSON (Agent xAPI)
 *   registration    identifiant d'inscription (facultatif)
 *   activity_id     identifiant de l'activité (facultatif ; sinon xapi.activityId de module.json)
 * Pour voir les statements sans LRS : ajouter ?xapi=debug (affichés dans la console, rien n'est envoyé).
 *
 * Statements : initialized / resumed, experienced (chaque écran, une fois par session), answered (première réponse à chaque
 * question, avec la bonne réponse), completed, passed / failed (avec le score), suspended / terminated (avec la durée).
 * Une réponse n'est jamais envoyée avec le texte saisi par l'apprenant dans les exercices de rédaction (non transmis non plus à SCORM).
 */

const VERSION = '1.0.3';
const LANG = 'fr-CH';
const QUEUE_LIMIT = 500;

const VERBS = {
  initialized: ['http://adlnet.gov/expapi/verbs/initialized', 'a démarré', 'initialized'],
  resumed: ['http://adlnet.gov/expapi/verbs/resumed', 'a repris', 'resumed'],
  experienced: ['http://adlnet.gov/expapi/verbs/experienced', 'a consulté', 'experienced'],
  answered: ['http://adlnet.gov/expapi/verbs/answered', 'a répondu à', 'answered'],
  completed: ['http://adlnet.gov/expapi/verbs/completed', 'a terminé', 'completed'],
  passed: ['http://adlnet.gov/expapi/verbs/passed', 'a réussi', 'passed'],
  failed: ['http://adlnet.gov/expapi/verbs/failed', 'a échoué à', 'failed'],
  suspended: ['http://adlnet.gov/expapi/verbs/suspended', 'a mis en pause', 'suspended'],
  terminated: ['http://adlnet.gov/expapi/verbs/terminated', 'a quitté', 'terminated'],
};

const ACTIVITY_TYPES = {
  course: 'http://adlnet.gov/expapi/activities/course',
  page: 'http://activitystrea.ms/schema/1.0/page',
  interaction: 'http://adlnet.gov/expapi/activities/cmi.interaction',
};

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const r = Math.floor(Math.random() * 16);
    return (char === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Durée ISO 8601 (« PT1H02M03S »), comme l'exige xAPI. */
export function isoDuration(milliseconds) {
  const total = Math.max(0, Math.round(milliseconds / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `PT${h ? `${h}H` : ''}${h || m ? `${m}M` : ''}${s}S`;
}

/** Agent xAPI depuis le paramètre « actor » : objet 1.0, ou ancienne forme à tableaux (name: [..], mbox: [..]). */
export function parseActor(raw) {
  if (!raw) return null;
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const first = (field) => (Array.isArray(field) ? field[0] : field);
  const actor = { objectType: 'Agent' };
  for (const key of ['name', 'mbox', 'mbox_sha1sum', 'openid']) {
    if (first(value[key])) actor[key] = String(first(value[key]));
  }
  if (value.account && typeof value.account === 'object') actor.account = value.account;
  return actor.mbox || actor.mbox_sha1sum || actor.openid || actor.account ? actor : null;
}

/** Adresse du LRS avec une barre finale (les ressources se placent juste après : « …/statements »). */
export function normalizeEndpoint(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return null;
    return url.href.endsWith('/') ? url.href : `${url.href}/`;
  } catch {
    return null;
  }
}

/**
 * module : contenu de module.json. debug : journalise les statements dans la console (?xapi=debug ou ?debug avec endpoint).
 * Retourne une interface neutre ; sans LRS, toutes les méthodes sont sans effet.
 */
export function createXapi({ module, debug = false, search = window.location.search }) {
  const params = new URLSearchParams(search);
  const endpoint = normalizeEndpoint(params.get('endpoint'));
  const auth = params.get('auth');
  const logOnly = params.get('xapi') === 'debug';
  const actor = parseActor(params.get('actor')) ?? (logOnly ? { objectType: 'Agent', name: 'Apprenant test', mbox: 'mailto:apprenant@example.org' } : null);
  const mode = endpoint && actor ? 'lrs' : logOnly ? 'log' : 'off';
  const registration = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.get('registration') ?? '') ? params.get('registration') : null;
  const activityId = params.get('activity_id') ?? module.xapi?.activityId ?? `https://www.aivd.ch/xapi/${module.id}`;
  const startedAt = Date.now();
  const viewed = new Set();
  const queue = [];
  let timer = 0;
  let finished = false;

  const moduleActivity = {
    objectType: 'Activity',
    id: activityId,
    definition: { type: ACTIVITY_TYPES.course, name: { [LANG]: module.title }, ...(module.description ? { description: { [LANG]: module.description } } : {}) },
  };

  function build(verb, object, { result, context = {} } = {}) {
    const [id, fr, en] = VERBS[verb];
    return {
      id: uuid(),
      actor,
      verb: { id, display: { [LANG]: fr, 'en-US': en } },
      object,
      ...(result ? { result } : {}),
      context: {
        ...(registration ? { registration } : {}),
        language: LANG,
        ...(object.id !== activityId ? { contextActivities: { parent: [{ objectType: 'Activity', id: activityId }] } } : {}),
        ...context,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /* ---------- Envoi : file d'attente, lots, nouvel essai au lot suivant ---------- */

  function headers() {
    return {
      'Content-Type': 'application/json',
      'X-Experience-API-Version': VERSION,
      ...(auth ? { Authorization: auth } : {}),
    };
  }

  async function flush() {
    clearTimeout(timer);
    timer = 0;
    if (mode !== 'lrs' || !queue.length) return;
    const batch = queue.splice(0, queue.length);
    try {
      const response = await fetch(`${endpoint}statements`, { method: 'POST', headers: headers(), body: JSON.stringify(batch) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      // LRS injoignable : on garde le lot pour le prochain envoi (file bornée)
      queue.unshift(...batch);
      if (queue.length > QUEUE_LIMIT) queue.splice(0, queue.length - QUEUE_LIMIT);
      if (debug) console.log('[xAPI] envoi différé :', error.message);
    }
  }

  /** À la fermeture de la page : requête « simple » (formulaire, sans en-têtes personnalisés), qui part même quand la page se ferme. */
  function flushOnUnload() {
    if (mode !== 'lrs' || !queue.length) return;
    const body = new URLSearchParams({
      'Content-Type': 'application/json',
      'X-Experience-API-Version': VERSION,
      content: JSON.stringify(queue),
      ...(auth ? { Authorization: auth } : {}),
    });
    const url = `${endpoint}statements?method=POST`;
    const sent = navigator.sendBeacon?.(url, new Blob([body.toString()], { type: 'application/x-www-form-urlencoded' }));
    if (sent) queue.length = 0;
  }

  function enqueue(statement) {
    if (mode === 'off') return;
    if (mode === 'log') {
      if (debug || logOnly) console.log('[xAPI simulé]', `${statement.verb.display['en-US']} → ${statement.object.id}`, statement);
      return;
    }
    queue.push(statement);
    if (!timer) timer = setTimeout(flush, 1500);
  }

  /* ---------- Interface neutre ---------- */

  return {
    mode,

    /** Au chargement : « initialized », ou « resumed » si la progression est reprise. */
    init(resumed) {
      enqueue(build(resumed ? 'resumed' : 'initialized', moduleActivity));
    },

    /** Un écran affiché : une seule fois par session. */
    screenViewed(screen, number, total) {
      if (mode === 'off' || viewed.has(screen.id)) return;
      viewed.add(screen.id);
      enqueue(
        build('experienced', {
          objectType: 'Activity',
          id: `${activityId}/ecran/${screen.id}`,
          definition: { type: ACTIVITY_TYPES.page, name: { [LANG]: String(screen.title ?? screen.id) } },
        }, { context: { extensions: { [`${activityId}/extensions/ecran`]: `${number}/${total}`, ...(screen.section ? { [`${activityId}/extensions/section`]: screen.section } : {}) } } }),
      );
    },

    /** Première réponse à une question : la réponse donnée, la bonne réponse, le résultat. */
    answered(question, ids, result, screen) {
      if (mode === 'off') return;
      const label = [screen?.kicker, question.prompt].filter(Boolean).join(' · ');
      enqueue(
        build(
          'answered',
          {
            objectType: 'Activity',
            id: `${activityId}/question/${question.id}`,
            definition: {
              type: ACTIVITY_TYPES.interaction,
              interactionType: 'choice',
              name: { [LANG]: String(screen?.kicker ?? question.prompt) },
              description: { [LANG]: label },
              correctResponsesPattern: [result.correctIds.join('[,]')],
              choices: question.options.map((option) => ({ id: option.id, description: { [LANG]: option.text } })),
            },
          },
          { result: { success: result.correct, completion: true, response: ids.join('[,]') } },
        ),
      );
    },

    /** Réponse au questionnaire de satisfaction (non notée). */
    survey({ id, type, response, description }) {
      if (mode === 'off') return;
      const interactionType = type === 'likert' ? 'likert' : type === 'text' ? 'fill-in' : 'choice';
      enqueue(
        build(
          'answered',
          {
            objectType: 'Activity',
            id: `${activityId}/evaluation/${id}`,
            definition: { type: ACTIVITY_TYPES.interaction, interactionType, name: { [LANG]: String(description) } },
          },
          { result: { completion: true, response: Array.isArray(response) ? response.join('[,]') : String(response) } },
        ),
      );
    },

    /** Module terminé (tous les écrans jusqu'à la synthèse) : « completed », puis « passed » ou « failed » avec le score. */
    status({ success }, result) {
      if (mode === 'off') return;
      const duration = isoDuration(Date.now() - startedAt);
      enqueue(build('completed', moduleActivity, { result: { completion: true, duration } }));
      if (result && success !== 'unknown') {
        enqueue(
          build(success === 'passed' ? 'passed' : 'failed', moduleActivity, {
            result: {
              success: success === 'passed',
              completion: true,
              score: { scaled: result.score / 100, raw: result.score, min: 0, max: 100 },
              duration,
            },
          }),
        );
      }
    },

    /** Fin de session : « terminated » si le module est terminé, sinon « suspended ». Envoi immédiat, même à la fermeture de la page. */
    finish(complete) {
      if (mode === 'off' || finished) return;
      finished = true;
      enqueue(build(complete ? 'terminated' : 'suspended', moduleActivity, { result: { duration: isoDuration(Date.now() - startedAt) } }));
      flushOnUnload();
    },
  };
}
