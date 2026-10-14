/**
 * Mise en forme du texte venu de module.json.
 * Tout est échappé avant d'appliquer le formatage autorisé :
 *   **gras**, *italique*, [lien](https://…)
 *   lignes « - … » → liste à puces, lignes « 1. … » → liste numérotée
 */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Texte d'une ligne avec formatage en ligne. */
export function inline(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
      if (/^mailto:/i.test(url)) return `<a href="${url}">${label}</a>`;
      if (!/^https?:/i.test(url)) return label;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}<span class="visually-hidden"> (nouvelle fenêtre)</span></a>`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
}

/** Texte brut (pour document.title, descriptions SCORM…). */
export function plainText(text) {
  return String(text ?? '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*?/g, '');
}

const BULLET = /^-\s+/;
const NUMBER = /^\d+[.)]\s+/;

/** Bloc de texte : une chaîne ou un tableau de lignes (une ligne = un paragraphe ou un élément de liste). */
export function rich(value) {
  const lines = Array.isArray(value) ? value : [value];
  let html = '';
  let list = null;

  const flush = () => {
    if (!list) return;
    html += `<${list.tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join('')}</${list.tag}>`;
    list = null;
  };

  for (const raw of lines) {
    const line = String(raw ?? '').trim();
    const pattern = BULLET.test(line) ? BULLET : NUMBER.test(line) ? NUMBER : null;
    if (pattern) {
      const tag = pattern === BULLET ? 'ul' : 'ol';
      if (list?.tag !== tag) flush();
      list ??= { tag, items: [] };
      list.items.push(line.replace(pattern, ''));
      continue;
    }
    flush();
    if (line) html += `<p>${inline(line)}</p>`;
  }
  flush();
  return html;
}
