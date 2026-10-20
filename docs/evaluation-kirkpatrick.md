# Évaluation de la formation (modèle de Kirkpatrick)

Écran `avis` (type `survey`), placé après la synthèse, avant les remerciements. Facultatif, non noté : il ne
change ni le score, ni la complétion, ni le statut. Environ 2 minutes, en 3 étapes.

| Niveau | Ce qu'on mesure | Dans le module |
|---|---|---|
| 1. Réaction | Satisfaction, pertinence, clarté, durée | Étape 1 « Votre expérience » : 3 échelles + durée perçue |
| 2. Apprentissage | Auto-évaluation de ce qui est acquis | Étape 2 « Ce que vous avez appris » : 3 échelles (attentes de l'office AI, limitations et capacité de travail, aisance à remplir le 002.099). Les 33 questions notées mesurent l'apprentissage réel |
| 3. Comportement | Intention de transfert, freins | Étape 3 « Dans votre cabinet » : intention d'appliquer, freins (choix multiple), commentaire libre |
| 4. Résultats | Effet sur l'organisation | **Non mesurable dans le module.** À suivre par l'office AI (voir ci-dessous) |

## Données transmises au LMS

Une interaction SCORM par question répondue (`cmi.interactions`), identifiants `eval-<id>` :

| id | Question | Valeurs |
|---|---|---|
| `eval-satisfaction`, `eval-pertinence`, `eval-clarte`, `eval-attentes`, `eval-limitations`, `eval-autonomie` | Échelles d'accord | 1 (pas du tout d'accord) à 5 (tout à fait d'accord), type `likert` |
| `eval-duree` | Durée perçue | `c` trop courte, `a` adaptée, `l` trop longue |
| `eval-usage` | Intention d'appliquer | `p` dès le prochain rapport, `o` à l'occasion, `n` ne sait pas, `x` non |
| `eval-freins` | Freins | `t` temps, `i` informations manquantes, `f` formulaire peu clair, `r` rien (plusieurs possibles, séparés par une virgule) |
| `eval-amelioration` | Commentaire libre (250 caractères) | texte |

À confirmer avec Acamedia / MOS Chorus : si les interactions sont exploitables dans les rapports du LMS (certains
LMS ne les affichent pas). À défaut, Acamedia a probablement sa propre évaluation de satisfaction ; on peut alors
retirer l'écran `avis` ou n'en garder que le commentaire libre.

Le texte « vie privée » de l'écran (`privacy`) dit que les réponses sont transmises à la plateforme avec le
parcours de l'apprenant. **À faire valider** (protection des données, anonymat éventuel).

## Niveau 4 : indicateurs à suivre par l'office AI

À comparer avant / après la diffusion de la formation (sur les médecins formés ou la population des médecins vaudois) :

- nombre de demandes de compléments adressées aux médecins après réception d'un rapport ;
- délai moyen entre réception du rapport et décision ;
- part des rapports complets dès la première réception (dates, taux, limitations mesurables, capacité en h/jour) ;
- recours aux expertises externes.

## Modifier le questionnaire

Tout est dans `content/module.json` (écran `avis`) : étapes (`steps`), questions (`items`, types `scale`, `choice`,
`multiple`, `text`), libellés de l'échelle (`scaleLabels`). Les identifiants de questions (`id`) servent de clés
dans le LMS : ne pas les renommer une fois le module en ligne.
