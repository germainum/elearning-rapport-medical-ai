/**
 * Mode relecture : un bouton « Commenter » sur chaque écran, un panneau avec les commentaires de l'écran et de tout le module.
 * Chargé seulement avec ?review dans l'adresse, et seulement dans la version de relecture (dossier review/ : jamais dans le paquet SCORM).
 * Les commentaires sont gardés par le serveur de relecture (review/server.js), partagés entre tous les relecteurs.
 */

const API = 'api/review';
const NAME_KEY = 'relecture-nom';

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const plain = (text) => String(text ?? '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*?/g, '');
const formatDate = (iso) =>
  new Date(iso).toLocaleString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

async function request(path, options = {}) {
  const response = await fetch(`${API}/${path}`, {
    ...options,
    headers: { 'X-Review': '1', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    credentials: 'same-origin',
  });
  if (!response.ok) {
    let message = 'Le serveur de relecture a refusé la demande.';
    try {
      message = (await response.json()).error ?? message;
    } catch {
      // réponse sans détail
    }
    throw new Error(message);
  }
  return response;
}

export function startReview({ module }) {
  const screens = module.screens;
  const state = { comments: [], view: 'screen', filter: 'all', open: false, quote: '', screenId: null, busy: false };
  let name = '';
  try {
    name = localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    // stockage indisponible : le nom est redemandé à chaque fois
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('review.css', import.meta.url).href;
  document.head.append(link);

  /* ---------- Structure ---------- */

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'review-fab';
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'review-panel');
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
    <span>Commenter</span>
    <span class="review-fab__count" hidden></span>`;

  const panel = document.createElement('aside');
  panel.className = 'review-panel';
  panel.id = 'review-panel';
  panel.setAttribute('aria-label', 'Relecture du module');
  panel.hidden = true;
  panel.innerHTML = `
    <header class="review-panel__head">
      <h2 class="review-panel__title">Relecture <span class="review-panel__version">v${esc(module.version)}</span></h2>
      <button type="button" class="review-panel__close" aria-label="Fermer la relecture"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
    </header>
    <div class="review-tabs" role="group" aria-label="Affichage">
      <button type="button" class="review-tab" data-view="screen" aria-pressed="true"></button>
      <button type="button" class="review-tab" data-view="all" aria-pressed="false"></button>
    </div>
    <div class="review-panel__body"></div>
    <p class="review-status" role="status"></p>`;
  document.body.append(fab, panel);

  const body = panel.querySelector('.review-panel__body');
  const statusLine = panel.querySelector('.review-status');
  const tabs = [...panel.querySelectorAll('.review-tab')];

  /* ---------- Écran courant ---------- */

  const currentIndex = () => {
    const labelled = document.querySelector('main article')?.getAttribute('aria-labelledby') ?? '';
    const id = labelled.replace(/^screen-/, '').replace(/-title$/, '');
    return Math.max(0, screens.findIndex((screen) => screen.id === id));
  };
  const screenInfo = (index) => ({
    id: screens[index].id,
    index,
    title: plain(screens[index].title),
    section: plain(screens[index].section ?? ''),
  });

  /* ---------- Passage sélectionné par le relecteur ---------- */

  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || !selection.anchorNode) return;
    const anchor = selection.anchorNode.nodeType === 1 ? selection.anchorNode : selection.anchorNode.parentElement;
    if (anchor?.closest('main') && !anchor.closest('.review-panel')) state.quote = text.replace(/\s+/g, ' ').slice(0, 300);
  });

  /* ---------- Données ---------- */

  async function load() {
    try {
      state.comments = (await (await request('comments')).json()).comments;
      statusLine.textContent = '';
    } catch (error) {
      statusLine.textContent = error.message === 'Failed to fetch' ? 'Le serveur de relecture ne répond pas.' : error.message;
    }
    render();
  }

  const forScreen = (id) => state.comments.filter((comment) => comment.screenId === id);
  const pending = (list) => list.filter((comment) => comment.status !== 'done');

  /* ---------- Affichage ---------- */

  function commentHtml(comment, { showScreen = false } = {}) {
    const done = comment.status === 'done';
    return `
      <li class="review-comment${done ? ' review-comment--done' : ''}" data-id="${esc(comment.id)}">
        <p class="review-comment__meta"><strong>${esc(comment.author)}</strong> · ${esc(formatDate(comment.createdAt))} · <span class="review-comment__state">${done ? 'Résolu' : 'À traiter'}</span></p>
        ${showScreen ? `<p class="review-comment__screen">Écran ${comment.screenIndex + 1} · ${esc(comment.screenTitle)}</p>` : ''}
        ${comment.quote ? `<blockquote class="review-comment__quote">« ${esc(comment.quote)} »</blockquote>` : ''}
        <p class="review-comment__text">${esc(comment.text).replace(/\n/g, '<br>')}</p>
        <div class="review-comment__actions">
          <button type="button" class="review-link" data-action="toggle">${done ? 'Rouvrir' : 'Marquer comme résolu'}</button>
          <button type="button" class="review-link review-link--danger" data-action="delete">Supprimer</button>
        </div>
      </li>`;
  }

  function renderScreenView() {
    const index = currentIndex();
    const info = screenInfo(index);
    const list = forScreen(info.id);
    body.innerHTML = `
      <p class="review-context">Écran ${index + 1} sur ${screens.length} · <strong>${esc(info.title)}</strong></p>
      <form class="review-form" novalidate>
        <label class="review-label" for="review-name">Votre nom</label>
        <input class="review-input" id="review-name" name="name" autocomplete="name" maxlength="60" value="${esc(name)}">
        <label class="review-label" for="review-text">Votre commentaire sur cet écran</label>
        <textarea class="review-input review-input--area" id="review-text" name="text" rows="4" maxlength="4000" placeholder="Ce qui est clair, ce qui ne l'est pas, une faute, une idée…"></textarea>
        ${state.quote ? `<p class="review-quote"><span>Passage concerné : « ${esc(state.quote)} »</span> <button type="button" class="review-link" data-action="drop-quote">Retirer</button></p>` : '<p class="review-hint">Astuce : sélectionnez un passage de l\'écran avant d\'ouvrir cette fenêtre pour le citer.</p>'}
        <button type="submit" class="review-button">Envoyer le commentaire</button>
      </form>
      <h3 class="review-subtitle">Sur cet écran (${list.length})</h3>
      ${list.length ? `<ul class="review-list">${list.map((comment) => commentHtml(comment)).join('')}</ul>` : '<p class="review-empty">Aucun commentaire sur cet écran pour l\'instant.</p>'}`;
  }

  function renderAllView() {
    const shown = state.comments.filter((comment) => state.filter === 'all' || (state.filter === 'open' ? comment.status !== 'done' : comment.status === 'done'));
    const groups = new Map();
    for (const comment of [...shown].sort((a, b) => a.screenIndex - b.screenIndex || a.createdAt.localeCompare(b.createdAt))) {
      if (!groups.has(comment.screenId)) groups.set(comment.screenId, []);
      groups.get(comment.screenId).push(comment);
    }
    body.innerHTML = `
      <div class="review-toolbar">
        <label class="review-label" for="review-filter">Afficher</label>
        <select class="review-input" id="review-filter">
          <option value="all"${state.filter === 'all' ? ' selected' : ''}>Tous (${state.comments.length})</option>
          <option value="open"${state.filter === 'open' ? ' selected' : ''}>À traiter (${pending(state.comments).length})</option>
          <option value="done"${state.filter === 'done' ? ' selected' : ''}>Résolus (${state.comments.length - pending(state.comments).length})</option>
        </select>
        <div class="review-toolbar__buttons">
          <a class="review-button review-button--secondary" href="${API}/export.md" download="retours-relecture.md">Télécharger (Markdown)</a>
          <button type="button" class="review-button review-button--secondary" data-action="copy">Copier (Markdown)</button>
        </div>
      </div>
      ${
        groups.size
          ? [...groups].map(([screenId, list]) => {
              const index = Math.max(0, screens.findIndex((screen) => screen.id === screenId));
              return `
              <section class="review-group">
                <h3 class="review-subtitle">Écran ${index + 1} · ${esc(plain(screens[index].title))}
                  <button type="button" class="review-link" data-action="goto" data-index="${index}">Aller à l'écran</button></h3>
                <ul class="review-list">${list.map((comment) => commentHtml(comment)).join('')}</ul>
              </section>`;
            }).join('')
          : '<p class="review-empty">Aucun commentaire à afficher.</p>'
      }`;
  }

  function render() {
    const info = screenInfo(currentIndex());
    tabs[0].textContent = `Cet écran (${forScreen(info.id).length})`;
    tabs[1].textContent = `Tous (${state.comments.length})`;
    tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.view === state.view)));
    const count = pending(forScreen(info.id)).length;
    const badge = fab.querySelector('.review-fab__count');
    badge.hidden = count === 0;
    badge.textContent = String(count);
    fab.setAttribute('aria-label', count ? `Commenter, ${count} commentaire${count > 1 ? 's' : ''} à traiter sur cet écran` : 'Commenter');
    if (!state.open) return;
    // Un champ en cours de saisie n'est jamais écrasé par un rafraîchissement
    if (state.view === 'screen' && body.contains(document.activeElement) && document.activeElement.matches('input, textarea')) return;
    if (state.view === 'screen') renderScreenView();
    else renderAllView();
  }

  /* ---------- Actions ---------- */

  function setOpen(open) {
    state.open = open;
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    if (open) {
      load();
      body.querySelector('#review-text')?.focus();
    } else fab.focus();
  }

  fab.addEventListener('click', () => setOpen(!state.open));
  panel.querySelector('.review-panel__close').addEventListener('click', () => setOpen(false));
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
    }
  });
  tabs.forEach((tab) =>
    tab.addEventListener('click', () => {
      state.view = tab.dataset.view;
      render();
    }),
  );

  body.addEventListener('change', (event) => {
    if (event.target.id === 'review-filter') {
      state.filter = event.target.value;
      render();
    }
  });

  body.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.busy) return;
    const form = event.target;
    const text = form.elements.text.value.trim();
    const author = form.elements.name.value.trim();
    if (!author) return say("Indiquez votre nom pour que l'on sache qui a écrit.", form.elements.name);
    if (!text) return say('Écrivez votre commentaire avant de l\'envoyer.', form.elements.text);
    name = author;
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      // idem
    }
    const info = screenInfo(currentIndex());
    state.busy = true;
    try {
      const { comment } = await (
        await request('comments', {
          method: 'POST',
          body: JSON.stringify({ screenId: info.id, screenIndex: info.index, screenTitle: info.title, section: info.section, version: module.version, author, text, quote: state.quote }),
        })
      ).json();
      state.comments.push(comment);
      state.quote = '';
      say('Commentaire envoyé, merci.');
      renderScreenView();
      render();
      body.querySelector('#review-text')?.focus();
    } catch (error) {
      say(error.message === 'Failed to fetch' ? 'Le serveur ne répond pas : votre texte est conservé, réessayez.' : error.message);
    } finally {
      state.busy = false;
    }
  });

  body.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.closest('.review-comment')?.dataset.id;
    const comment = state.comments.find((item) => item.id === id);
    try {
      switch (button.dataset.action) {
        case 'drop-quote':
          state.quote = '';
          renderScreenView();
          break;
        case 'toggle': {
          const status = comment.status === 'done' ? 'open' : 'done';
          await request(`comments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
          comment.status = status;
          render();
          renderCurrent();
          break;
        }
        case 'delete':
          // Confirmation en deux temps, sans fenêtre du navigateur
          if (button.dataset.confirm !== '1') {
            button.dataset.confirm = '1';
            button.textContent = 'Confirmer la suppression';
            return;
          }
          await request(`comments/${id}`, { method: 'DELETE' });
          state.comments = state.comments.filter((item) => item.id !== id);
          render();
          renderCurrent();
          break;
        case 'goto':
          document.dispatchEvent(new CustomEvent('review-goto', { detail: { index: Number(button.dataset.index) } }));
          state.view = 'screen';
          render();
          break;
        case 'copy': {
          const text = await (await request('export.md')).text();
          await navigator.clipboard.writeText(text);
          say('Commentaires copiés : collez-les dans un message.');
          break;
        }
        default:
      }
    } catch (error) {
      say(error.message === 'Failed to fetch' ? 'Le serveur ne répond pas.' : error.message);
    }
  });

  function renderCurrent() {
    if (!state.open) return;
    if (state.view === 'screen') renderScreenView();
    else renderAllView();
  }

  function say(message, field = null) {
    statusLine.textContent = message;
    field?.focus();
  }

  /* ---------- Suivi du changement d'écran ---------- */

  const main = document.querySelector('main') ?? document.body;
  new MutationObserver(() => {
    const id = screens[currentIndex()].id;
    if (id === state.screenId) return;
    state.screenId = id;
    state.quote = '';
    statusLine.textContent = '';
    render();
    if (state.open) renderCurrent();
  }).observe(main, { childList: true, subtree: true });
  state.screenId = screens[currentIndex()].id;

  load();
  // Les commentaires des autres relecteurs apparaissent sans recharger la page
  setInterval(() => {
    if (state.open && !document.hidden) load();
  }, 45000);
}
