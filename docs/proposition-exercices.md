# Proposition : exercices natifs (équivalents H5P)

Statut : **prototype** (v0.146.0), à valider. Démonstration : `?demo=exercices` ajouté à l'adresse du module
(ex. `https://germainum.github.io/elearning-rapport-medical-ai/?demo=exercices`, ou `http://localhost:8080/?demo=exercices` avec `npm start`).
Contenu de la démo : `content/demo-exercices.json`. Aucun écran du parcours réel n'a été modifié.

## Les trois exercices

| Exercice | Équivalent H5P | Bloc `module.json` | Interaction |
|---|---|---|---|
| Texte à trous avec banque de mots | Drag the Words / Fill in the Blanks | `blanks` | toucher un mot puis le trou (ou l'inverse), glisser à la souris, toucher un mot placé pour le reprendre |
| Remise en ordre d'étapes | Sort the Paragraphs | `sequence` | boutons Monter / Descendre (44 px), annonce de la position pour les lecteurs d'écran |
| Questions dans la vidéo | Interactive Video | `checkpoints` d'une `video` | la lecture s'arrête à l'instant voulu, la question s'affiche **sous** la vidéo, « Reprendre la vidéo » |

Règles communes : non noté (ni score, ni complétion, ni `suspend_data`) ; thème sombre, mobile et clavier gérés comme le reste du module ;
aucune bibliothèque ajoutée.

## Où les placer (à discuter)

Décision du 14.10.2026 : un écran par point du formulaire, une question à 3 réponses. Les exercices **ne doivent donc pas s'ajouter** aux
écrans du formulaire ; ils remplaceraient plutôt un écran de la partie « En pratique » ou du cas de M. C.

1. **Texte à trous : décrire les limitations fonctionnelles** (section 3, ou « En pratique ») : l'apprenant construit la phrase du rapport
   (« ne peut plus porter de {charges lourdes}… »). C'est le point que la vidéo de l'OAI met en avant (« décrire les limitations fonctionnelles »).
2. **Remise en ordre : les étapes avant l'envoi du rapport** (« En pratique ») : relecture, pièces jointes, signature, envoi papier ou MedAI.
3. **Questions dans la vidéo d'accueil** : une ou deux questions au maximum (le prototype en pose deux, à 0:31 et 2:12).
   Risque : la vidéo d'accueil est le premier contact ; trop de questions la rendent lourde.

## Limites connues

- Le glisser-déposer ne fonctionne qu'à la souris (le tactile passe par « toucher le mot puis le trou »).
- Pas de glisser dans la remise en ordre (boutons seulement) : plus sûr au doigt et au clavier.
- Les questions de la vidéo sont sautées si l'apprenant avance avec la barre de lecture.
- Le mode cinéma est désactivé sur une vidéo avec questions (la question s'affiche sous la vidéo, pas dans la fenêtre).
- Si un exercice devait compter dans le score : il faudrait l'ajouter à `suspend_data` (limité à 4096 caractères en SCORM 1.2) et revoir
  « Questions à revoir » ; je ne l'ai pas fait.
- Les textes de la démo (énoncés, indices, feedbacks) sont de moi : à faire relire par l'OAI.
- Non testé : vrai téléphone, Safari / Firefox, lecteur d'écran.
