/**
 * Génère le squelette à jour de l'e-learning (docs/squelette.md) à partir de content/module.json :
 * objectifs, parcours par ensembles et sections, puis la liste des écrans avec leur rôle, le point du formulaire travaillé
 * et la question posée. Aucune dépendance. À relancer après chaque changement de structure ou de contenu.
 *
 *   npm run export:squelette
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_DIR, ROOT } from './validate.js';

const module = JSON.parse(readFileSync(join(CONTENT_DIR, 'module.json'), 'utf8'));
const screens = module.screens;
const plain = (text) => String(text ?? '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*?/g, '').replace(/\s+/g, ' ').trim();
const fill = (text) => plain(text).replaceAll('{minutes}', module.durationMinutes).replaceAll('{today}', 'date du jour');
const clip = (text, max = 150) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
const blocksOf = (screen) => (screen.type === 'scene' ? screen.blocks : []);
const questionOf = (screen) => blocksOf(screen).find((block) => block.type === 'question');
const questionCount = screens.filter(questionOf).length;

/** Point du formulaire travaillé : numéro et intitulé de la première question de l'extrait (ex. « 3.4 · Existe-t-il des limitations… »). */
function formPoint(screen) {
  const form = blocksOf(screen).find((block) => block.type === 'form');
  const item = form?.items?.find((entry) => entry.number);
  return item ? `${item.number} · ${clip(plain(item.label), 90)}` : '';
}

const kindLabel = { scene: 'scène', text: 'texte', summary: 'synthèse', survey: 'avis', quiz: 'quiz' };

// Regroupement : ensemble (part) › section
const groups = [];
for (const [index, screen] of screens.entries()) {
  const part = screen.part ?? (screen.section ?? '').split(' · ')[0];
  const section = screen.section ?? '';
  let group = groups.at(-1);
  if (!group || group.part !== part) {
    group = { part, sections: [] };
    groups.push(group);
  }
  let block = group.sections.at(-1);
  if (!block || block.section !== section) {
    block = { section, screens: [] };
    group.sections.push(block);
  }
  block.screens.push({ screen, number: index + 1 });
}

const objectives = screens.find((screen) => screen.objectives)?.objectives?.items ?? [];
const today = new Date().toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });
const lines = [];
const out = (text = '') => lines.push(text);

out(`# Squelette de l'e-learning : « ${plain(module.title)} »`);
out();
out(`> Généré le ${today} depuis \`content/module.json\` (version ${module.version}) : **ne pas modifier à la main**, relancer \`npm run export:squelette\`.`);
out('> Le scénario d\'origine et son historique restent dans `docs/storyboard.md`.');
out();
out('## En bref');
out();
out(`- **Public** : médecins généralistes vaudois (formation continue, plateforme Acamedia).`);
out(`- **Formulaire travaillé** : rapport médical somatique, réadaptation professionnelle / rente (002.099, v. 09.2023).`);
out(`- **Durée** : environ ${module.durationMinutes} minutes · **${screens.length} écrans** · **${questionCount} questions** (une question à choix unique par écran de formulaire).`);
out(`- **Réussite** : seuil de ${module.scoring?.passingScore ?? '—'} %${module.scoring?.allowRetry ? ', reprise possible des questions fausses' : ''}. Seule la première réponse compte.`);
out(`- **Fil rouge** : un cas fictif (Mme R., 47 ans, aide-soignante en EMS) ; second cas (M. C.) pour s'entraîner.`);
out();

if (objectives.length) {
  out('## Objectifs');
  out();
  out('À la fin de la formation, le médecin sait :');
  out();
  for (const item of objectives) out(`1. ${fill(item)}`);
  out();
}

out('## Le parcours en un coup d\'œil');
out();
out('| Ensemble | Section | Écrans | Questions |');
out('|---|---|---|---|');
for (const group of groups) {
  for (const block of group.sections) {
    const first = block.screens[0].number;
    const last = block.screens.at(-1).number;
    const questions = block.screens.filter((entry) => questionOf(entry.screen)).length;
    const name = block.section.startsWith(`${group.part} · `) ? block.section.slice(group.part.length + 3) : block.section;
    out(`| ${plain(group.part)} | ${plain(name)} | ${first === last ? first : `${first} à ${last}`} | ${questions || ''} |`);
  }
}
out();

out('## Le détail, écran par écran');
for (const group of groups) {
  out();
  out(`### ${plain(group.part)}`);
  for (const block of group.sections) {
    out();
    out(`#### ${plain(block.section)}`);
    out();
    for (const { screen, number } of block.screens) {
      const question = questionOf(screen);
      const intro = blocksOf(screen).find((b) => b.type === 'text')?.body ?? screen.body;
      const bits = [`\`${screen.id}\``, kindLabel[screen.type] ?? screen.type];
      if (question) bits.push('1 question');
      out(`${number}. **${plain(screen.title)}** (${bits.join(' · ')})`);
      const point = formPoint(screen);
      if (point) out(`   - Point du formulaire : ${point}`);
      const hook = [].concat(intro ?? [])[0];
      if (hook) out(`   - Accroche : ${clip(fill(hook))}`);
      if (question) out(`   - Question : ${clip(fill(question.prompt))}`);
      if (screen.type === 'summary') out('   - Score, résultats par section, possibilité de revoir les questions fausses.');
      if (screen.type === 'survey') out('   - Questionnaire de satisfaction en 3 étapes, facultatif, non noté.');
      if (screen.tip) out(`   - Astuce affichée une fois : ${clip(plain(screen.tip.title))}`);
    }
  }
}

out();
out('## Ce qui reste à valider par l\'OAI');
out();
out('Textes rédigés pour le module, qui ne viennent pas tels quels d\'un document officiel :');
out();
out(`- les ${screens.reduce((n, s) => n + blocksOf(s).filter((b) => b.type === 'question' && b.reportAnswer).length, 0)} réponses modèles écrites dans le formulaire et les conséquences décrites après une mauvaise réponse ;`);
out('- les phrases d\'accroche qui ouvrent chaque écran du cas de Mme R. ;');
out('- l\'épilogue « Trois mois plus tard » (scénario plausible, pas un fait) ;');
out('- les dossiers de Mme R. et de M. C. (cohérence clinique, codes CIM-10) ;');
out('- le seuil de réussite, la durée annoncée et le questionnaire de satisfaction.');
out();
out('Le document Word `docs/relecture-elearning-v<version>.docx` (`npm run export:relecture`) sert à recueillir ces avis.');
out();

writeFileSync(join(ROOT, 'docs', 'squelette.md'), lines.join('\n'));
console.log(`Squelette : docs/squelette.md (${screens.length} écrans, ${groups.length} ensembles)`);
