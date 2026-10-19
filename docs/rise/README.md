# Version Rise 360 du module

Contenu et prompt pour construire une seconde version du module dans **Articulate Rise 360**, avec Claude dans Chrome.

| Fichier | Rôle |
|---|---|
| `00-prompt-claude-in-chrome.md` | Le prompt à coller dans Claude dans Chrome |
| `01-plan-du-cours.md` | Réglages du cours, ordre des leçons, types de blocs, différences avec le module SCORM |
| `02-fichiers-a-televerser.md` | Images, vidéo, sous-titres et PDF à téléverser, avec leur chemin |
| `lecons/NN-*.md` | Une leçon par fichier, bloc par bloc *(généré)* |
| `glossaire.md` | Leçon Glossaire, 43 termes *(généré)* |
| `evaluation-finale.md` | 12 questions de la leçon Quiz notée *(généré)* |
| `exemples-remplis.json` | Réponses modèles du formulaire (reprises de l'historique du module) |

## Utilisation

1. Ouvrir Rise 360 dans Chrome et se connecter à Articulate 360.
2. Ouvrir Claude dans Chrome, coller le contenu de `00-prompt-claude-in-chrome.md`.
3. Répondre « OK » au résumé en 5 lignes, puis laisser l'assistant construire, leçon par leçon.
4. Relire dans Rise, puis publier soi-même (SCORM 1.2) et tester sur SCORM Cloud.

Adresse de lecture des fichiers (dépôt public) :
`https://raw.githubusercontent.com/germainum/elearning-rapport-medical-ai/main/docs/rise/<fichier>`

## Régénérer le contenu

Les fichiers marqués *(généré)* et le tableau des leçons du plan viennent de `content/module.json` :

```
npm run export:rise
```

Ne pas les modifier à la main : modifier `module.json` (ou `scripts/export-rise.js` pour le découpage en leçons et le choix des
questions notées), puis relancer la commande, et pousser les fichiers.
