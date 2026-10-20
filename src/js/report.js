/**
 * « Mon rapport » : le formulaire 002.099 de la patiente, qui se remplit au fil des réponses.
 *
 * Chaque question qui porte un champ « reportAnswer » correspond à un champ du formulaire (intitulé repris du bloc « form »
 * du même écran). Trois états :
 *  - correct   : l'apprenant a trouvé la bonne réponse, le champ est rempli avec la réponse modèle ;
 *  - corrected : réponse fausse : le corrigé est affiché, signalé comme tel (l'apprenant l'a vu dans le retour) ;
 *  - empty     : pas encore répondu : lignes à remplir.
 * À la fin du module, le rapport est donc toujours complet : on peut l'imprimer, l'enregistrer en PDF ou le télécharger.
 */

import { escapeHtml, inline, plainText } from './format.js';
import { evaluate, questionsOf } from './tracker.js';

/** Champs du rapport regroupés par section du formulaire, dans l'ordre du module. */
export function buildReport(module, tracker) {
  const sections = [];
  let filled = 0;
  let total = 0;

  for (const screen of module.screens) {
    const form = screen.blocks?.find((block) => block.type === 'form');
    for (const question of questionsOf(screen)) {
      if (question.reportAnswer === undefined || !form) continue;
      const items = form.items.filter((item) => item.label && item.field !== false);
      const item = items.find((entry) => entry.number !== undefined) ?? items[0];
      // Intitulé de rubrique : titre de l'annexe, sinon section du formulaire, sinon la rubrique précédente
      const heading = form.title ?? form.items.find((entry) => entry.section)?.section ?? sections.at(-1)?.title ?? '';
      if (!sections.length || sections.at(-1).title !== heading) sections.push({ title: heading, fields: [] });

      const ids = tracker.getAnswer(question.id);
      const status = !ids ? 'empty' : evaluate(question, ids).correct ? 'correct' : 'corrected';
      total += 1;
      if (status === 'correct') filled += 1;
      sections.at(-1).fields.push({
        id: question.id,
        number: item?.number,
        label: item?.label ?? plainText(question.prompt),
        lines: [].concat(question.reportAnswer),
        status,
      });
    }
  }
  return { sections, filled, total };
}

/** Rapport sous forme de formulaire papier (panneau latéral, fenêtre, impression). */
export function reportHtml(data, module) {
  const report = module.report;
  const person = (report.header ?? [])
    .map((row) => `<div class="report__person-row"><dt>${inline(row.label)}</dt><dd>${inline(row.value)}</dd></div>`)
    .join('');

  const field = (f) => `
    <div class="report__field report__field--${f.status}" data-field="${escapeHtml(f.id)}">
      <p class="report__label">${f.number !== undefined ? `<span class="report__num">${escapeHtml(String(f.number))}</span> ` : ''}${inline(f.label)}</p>
      <div class="report__answer">${
        f.status === 'empty'
          ? '<span class="report__blank" aria-hidden="true"></span><span class="visually-hidden">À remplir</span>'
          : f.lines.map((line) => `<span class="report__line">${inline(line)}</span>`).join('')
      }</div>
      ${f.status === 'corrected' ? '<span class="report__tag">Corrigé</span>' : ''}
    </div>`;

  const sections = data.sections
    .map(
      (section) => `
        <section class="report__section">
          <h3 class="report__section-title">${inline(section.title)}</h3>
          ${section.fields.map(field).join('')}
        </section>`,
    )
    .join('');

  const hasCorrected = data.sections.some((section) => section.fields.some((f) => f.status === 'corrected'));
  return `
    <article class="report" aria-label="${escapeHtml(plainText(report.title))}">
      <header class="report__head">
        <span class="report__title">${inline(module.form?.title ?? report.title)}</span>
        <span class="report__ref">${inline(module.form?.reference ?? '')}</span>
      </header>
      <p class="report__subject">${inline(report.title)}</p>
      ${person ? `<dl class="report__person">${person}</dl>` : ''}
      ${sections}
      ${hasCorrected ? '<p class="report__legend"><span class="report__tag">Corrigé</span> : réponse à revoir, affichée avec son corrigé.</p>' : ''}
      ${report.note ? `<p class="report__note">${inline(report.note)}</p>` : ''}
    </article>`;
}

/** Nom du fichier téléchargé (sans extension), à partir de report.fileName ou du titre. */
export function reportFileName(module) {
  const base = module.report.fileName ?? plainText(module.report.title);
  return (
    base
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'rapport'
  );
}

const DOCUMENT_CSS = `
  body { margin: 0; padding: 24px; background: #fff; color: #1f232b; font: 14px/1.5 Arial, Helvetica, sans-serif; }
  .report { max-width: 760px; margin: 0 auto; }
  .report__head { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 6px; border-bottom: 2px solid #0f1d96; }
  .report__title { color: #0f1d96; font-weight: 700; }
  .report__ref { color: #4a4f5c; font-size: 12px; }
  .report__subject { margin: 12px 0 6px; font-size: 18px; font-weight: 700; color: #0f1d96; }
  .report__person { margin: 0 0 12px; display: grid; gap: 2px; }
  .report__person-row { display: flex; gap: 8px; }
  .report__person-row dt { min-width: 140px; color: #4a4f5c; }
  .report__person-row dd { margin: 0; font-weight: 700; }
  .report__section-title { margin: 18px 0 6px; padding: 4px 8px; background: #eef0fb; color: #0f1d96; font-size: 14px; }
  .report__field { padding: 8px 0; border-bottom: 1px dashed #c3c8d4; break-inside: avoid; }
  .report__label { margin: 0 0 4px; color: #4a4f5c; font-size: 12px; }
  .report__num { color: #0f1d96; font-weight: 700; }
  .report__answer { display: grid; gap: 2px; color: #0f1d96; font-weight: 600; }
  .report__field--corrected .report__answer { color: #4a4f5c; font-weight: 400; font-style: italic; }
  .report__blank { display: block; height: 36px; background: repeating-linear-gradient(transparent 0 17px, #c3c8d4 17px 18px); }
  .report__tag { display: inline-block; margin-top: 4px; padding: 0 6px; border: 1px solid #4a4f5c; border-radius: 3px; color: #4a4f5c; font-size: 11px; }
  .report__legend, .report__note { margin-top: 14px; color: #4a4f5c; font-size: 12px; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  @media print { body { padding: 0; } }
`;

/** Document HTML autonome (téléchargement) : s'ouvre dans le navigateur, s'imprime ou s'enregistre en PDF. */
export function reportDocument(data, module) {
  return `<!doctype html>
<html lang="${escapeHtml(module.language ?? 'fr')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(plainText(module.report.title))}</title>
<style>${DOCUMENT_CSS}</style>
</head>
<body>
${reportHtml(data, module)}
</body>
</html>
`;
}
