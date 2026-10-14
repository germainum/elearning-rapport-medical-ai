# Module e-learning SCORM – Acamedia

Module de formation continue pour Acamedia (Société vaudoise de médecine, plateforme MOS Chorus),
produit par l'Office AI du canton de Vaud.

- **Rédiger ou modifier le contenu** : uniquement dans `content/module.json` (et les images dans `content/images/`).
- **Le moteur** (`src/`) et les **outils** (`scripts/`) n'ont pas à être modifiés pour changer le contenu.

---

## Version en ligne

- **Module** : https://germainum.github.io/elearning-rapport-medical-ai/
  (sans plateforme LMS : le module tourne en **mode test**, progression enregistrée dans le navigateur).
- **Déploiement automatique** : chaque push sur `main` relance `scripts/build.js` et republie le site
  (`.github/workflows/pages.yml`). Le paquet SCORM 1.2 correspondant est téléchargeable dans l’onglet
  **Actions** du dépôt (artefact « paquet-scorm-1.2 »).

---

## 1. Démarrage rapide

Prérequis : [Node.js](https://nodejs.org) version 18 ou plus récente. Aucune installation de paquet n'est nécessaire.

```
npm run validate     Vérifie content/module.json et signale les erreurs en français
npm start            Ouvre le module sur http://localhost:8080 (API SCORM simulée)
npm run build        Produit le paquet SCORM 1.2 dans dist/
npm run build:2004   Produit le paquet SCORM 2004 dans dist/
npm run preview      Sert le dernier paquet généré (build/package) sur http://localhost:8080
```

En local, aucune plateforme n'est présente : le module passe en **mode test**. Un bandeau jaune
l'indique, les échanges SCORM s'affichent dans la console du navigateur (F12), et la progression
est conservée dans le navigateur pour tester la reprise. Le bouton **« Effacer la progression »**
repart de zéro.

---

## 2. Guide de rédaction de `module.json`

### Règles de base du format JSON

- Les textes sont entre **guillemets droits** `"…"`. Pour mettre des guillemets dans un texte,
  utilisez les guillemets français « … ».
- Les éléments d'une liste `[ … ]` ou d'un objet `{ … }` sont séparés par des virgules,
  **sans virgule après le dernier élément**.
- `true` et `false` s'écrivent sans guillemets.
- En cas de doute, lancez `npm run validate` : il indique la ligne et la nature de l'erreur.

### Mise en forme des textes

Les champs `body` sont une **liste de lignes** : chaque ligne devient un paragraphe.

| Écrire                         | Résultat                         |
|--------------------------------|----------------------------------|
| `**texte**`                    | **gras**                         |
| `*texte*`                      | *italique*                       |
| `[libellé](https://…)`         | lien (ouvert dans un nouvel onglet) |
| ligne commençant par `- `      | élément de liste à puces         |
| ligne commençant par `1. `     | élément de liste numérotée       |

Le HTML n'est pas interprété : il s'affiche tel quel.

### Identifiants (`id`)

Chaque écran et chaque question a un `id` : lettres sans accents, chiffres, `-` ou `_`, sans espace
(ex. `cas-monsieur-d`). **Ne modifiez pas un `id` après la mise en ligne** : la progression
des apprenants est enregistrée avec ces identifiants. Le texte, lui, peut être corrigé à tout moment.

Les réponses d'une question ont un `id` d'**une seule lettre** : `a`, `b`, `c`…

### En-tête du module

```json
{
  "schemaVersion": 1,
  "id": "rapport-medical-mt",
  "version": "1.0.0",
  "title": "Titre affiché dans Acamedia",
  "description": "Résumé en une phrase.",
  "language": "fr",
  "author": "Office AI du canton de Vaud",
  "durationMinutes": 15,
  "storyTitle": "Rapport de Mme R.",
  "form": {
    "title": "Rapport médical du médecin traitant",
    "reference": "Formulaire 002.099 MT · v. 09.2023"
  },
  "scoring": {
    "passingScore": 70,
    "allowRetry": true
  },
  "screens": [ … ]
}
```

- `storyTitle` : fil rouge affiché dans le bandeau, à côté de la progression (facultatif).
- `help` : carte d'aide en bas du panneau de gauche sur ordinateur, `{ "title": "Une question ?", "body": ["…"] }` (facultatif).
- `logo` : logo affiché en haut à gauche, `{ "src": "images/logo-aivd.png", "alt": "AI VD – Office de l'assurance-invalidité pour le canton de Vaud" }` (facultatif).
- `form` : en-tête affiché sur chaque « extrait du formulaire » (voir les blocs `form`).
- `passingScore` : seuil de réussite en pourcentage (80 si absent).
- `allowRetry` : propose « Reprendre les questions » sur la synthèse si le seuil n'est pas atteint.
- `version` : à augmenter à chaque livraison (`1.0.0` → `1.0.1` pour une correction, `1.1.0` pour un ajout).

### Champs communs à tous les écrans

| Champ           | Rôle                                                                 |
|-----------------|----------------------------------------------------------------------|
| `id`            | identifiant unique de l'écran                                        |
| `type`          | `text`, `scene`, `quiz` ou `summary`                                 |
| `kicker`        | surtitre facultatif, au-dessus du titre (ex. « Question 4 du formulaire ») |
| `title`         | titre de l'écran                                                     |
| `storyTitle`    | remplace le fil rouge du fil d'Ariane pour cet écran (ex. « Second cas : M. B. ») |
| `hidePatientFile` | `true` : masque le dossier patient pendant cet écran (autre cas, informations générales) |
| `continueLabel` | texte du bouton pour passer à l'écran suivant (« Suivant » par défaut), ex. « Passer à la capacité de travail » |

### Écran « texte avec image » (`text`)

```json
{
  "id": "introduction",
  "type": "text",
  "kicker": "Introduction",
  "title": "Titre de l'écran",
  "continueLabel": "Ouvrir le courrier",
  "body": [
    "Premier paragraphe.",
    "- premier point",
    "- deuxième point"
  ],
  "image": {
    "src": "images/mon-image.svg",
    "alt": "Description de ce que montre l'image",
    "caption": "Légende facultative",
    "position": "side"
  }
}
```

- `video` (facultatif) affiche une vidéo **en tête de l'écran**, au-dessus du texte :

  ```json
  "video": {
    "src": "videos/ma-video.mp4",
    "captions": "videos/ma-video.fr.vtt",
    "title": "Titre de la vidéo",
    "duration": "2 min 30",
    "transcript": ["Texte intégral de la vidéo, un paragraphe par ligne."]
  }
  ```

  La vidéo est **incluse dans le paquet** (MP4, sans espace ni accent dans le nom, dans
  `content/videos/`). Les sous-titres `.vtt` sont **obligatoires** (accessibilité) et s'affichent
  par défaut. Pour créer les sous-titres à partir de la transcription horodatée de YouTube
  (« … Plus › Afficher la transcription », copier le texte avec les horaires) :
  `node scripts/captions-from-timestamps.js transcription.txt content/videos/ma-video.fr.vtt <durée_s>`.
  Sans horodatage, `node scripts/make-captions.js transcription.txt sortie.vtt <début_s> <fin_s>`
  produit un premier jet aux minutages estimés, à vérifier.
  Une vidéo peut aussi être placée dans une scène, comme bloc `{ "type": "video", … }`.
- `image` est facultative. `position` : `"top"` (au-dessus, par défaut), `"bottom"` (en dessous)
  ou `"side"` (à côté du texte sur grand écran, au-dessus sur mobile).
- `alt` est **obligatoire** : décrivez l'information que porte l'image pour une personne qui ne la voit pas.
  Pour une image purement décorative, remplacez `alt` par `"decorative": true`.
- Les fichiers d'images vont dans `content/images/`. Leur nom ne doit contenir ni espace ni accent.

### Écran « scène » (`scene`)

Une scène raconte une étape du cas : elle enchaîne des **blocs** (texte, pièce du dossier, extrait
du formulaire, question, encadré). Les blocs `reveal` deviennent des **boutons d'action** qui
dévoilent la suite, à la manière d'un récit. L'apprenant ne peut cliquer sur un bouton d'action
qu'après avoir répondu aux questions déjà affichées.

```json
{
  "id": "limitations",
  "type": "scene",
  "kicker": "Question 4 du formulaire",
  "title": "Les limitations fonctionnelles",
  "continueLabel": "Passer à la capacité de travail",
  "blocks": [
    { "type": "text", "body": ["Texte d'introduction de la scène."] },
    { "type": "form", "items": [{ "number": 4, "label": "Quelles sont les limitations fonctionnelles à prendre en compte ?" }] },
    { "type": "question", "id": "limitations", "kind": "single", "prompt": "…", "options": [ … ], "feedback": { … } },
    { "type": "reveal", "label": "Voir la question 4 remplie" },
    { "type": "form", "items": [{ "number": 4, "label": "…", "answer": ["- Pas de port de charges de plus de 5 kg."] }] },
    { "type": "callout", "title": "À retenir", "body": ["…"] }
  ]
}
```

Les blocs possibles :

| `type`     | Contenu | Champs |
|------------|---------|--------|
| `text`     | paragraphe(s), avec titre et image facultatifs | `body`, `title`, `image` |
| `writing`  | exercice de rédaction non noté : consigne, zone de texte, puis exemple de réponse et grille d'auto-vérification | `id`, `prompt`, `placeholder`, `model` (exemple), `checklist` (liste de points à vérifier) |
| `attachment` | pièce jointe PDF : avec `preview`, le bouton ouvre une fenêtre (aperçu du formulaire + « Télécharger le PDF ») ; sans `preview`, il ouvre le PDF dans un nouvel onglet | `title`, `src` (`documents/…pdf`), `meta` (ex. « PDF · 2 pages · 129 Ko »), `label` (texte du bouton), `preview` : `{ "fields": [champs d'en-tête], "items": [questions comme dans `form`, avec `details` facultatif], "footer": [lignes de pied] }` |
| `patientFile` | la fiche du patient définie à la racine (voir ci-dessous) | aucun autre champ : `{ "type": "patientFile" }` |
| `document` | pièce du dossier : fiche patient, courrier reçu, note | `kind` (`"dossier"`, `"courrier"` ou `"note"`), `title`, `subtitle`, `body`, `data` (liste de `{ "label", "value" }`), `image` (portrait) |
| `form`     | extrait du formulaire, vide ou rempli | `items` : liste de `{ "number", "label", "answer" }` |
| `callout`  | encadré « À retenir » | `title` (facultatif), `body` |
| `question` | question à choix unique ou multiple | mêmes champs qu'une question de QCM, plus `"type": "question"` |
| `reveal`   | bouton d'action qui dévoile la suite | `label` |

**Fiche du patient consultable à tout moment.** Définissez la fiche une seule fois, à la racine de
`module.json` :

```json
"patientFile": {
  "title": "Mme R., 47 ans",
  "subtitle": "Patiente du cabinet depuis 2014",
  "image": { "src": "images/mme-r.svg", "decorative": true },
  "body": ["Résumé de la situation."],
  "data": [{ "label": "Profession", "value": "Aide-soignante en EMS, 80 %" }]
}
```

Placez ensuite `{ "type": "patientFile" }` dans la scène où l'apprenant découvre le dossier. À partir
de ce moment, un bouton « Dossier patient » (icône de presse-papiers) apparaît dans le bandeau et permet de
revoir la fiche dans une fenêtre, jusqu'à la fin du module. Sans bloc `patientFile` dans les scènes,
le bouton est disponible dès le début.

Règles pour les extraits du formulaire (`form`) :

- `label` reprend **mot pour mot** l'intitulé du formulaire (voir `docs/formulaire-002099-MT.md`).
- Sans `answer`, le champ s'affiche vide (lignes pointillées). Avec `answer`, il s'affiche rempli,
  marqué « Exemple de réponse ».
- `"field": false` affiche un point explicatif du formulaire sans champ à remplir (ex. point 8).

Règles pour les boutons `reveal` : jamais en premier ni en dernier bloc, jamais deux de suite.
Pour passer à l'écran suivant, utilisez `continueLabel`.

### Écran « QCM » (`quiz`)

```json
{
  "id": "qcm-1",
  "type": "quiz",
  "title": "Vérifiez vos connaissances",
  "body": ["Introduction facultative."],
  "questions": [ … ]
}
```

### Questions (écrans `quiz` et blocs `question` des scènes)

```json
{
  "id": "q1",
  "kind": "single",
  "prompt": "Énoncé de la question ?",
  "options": [
    { "id": "a", "text": "Réponse A" },
    { "id": "b", "text": "Réponse B", "correct": true },
    { "id": "c", "text": "Réponse C", "feedback": "Explication propre à ce choix (facultatif)." }
  ],
  "feedback": {
    "correct": "Message si la réponse est juste.",
    "incorrect": "Message si la réponse est fausse ou incomplète."
  },
  "points": 1
}
```

- `kind` : `"single"` (une seule bonne réponse) ou `"multiple"` (une ou plusieurs bonnes réponses).
- Marquez les bonnes réponses avec `"correct": true`.
- Une question à choix multiple ne rapporte ses points que si **toutes** les bonnes réponses
  et **aucune** mauvaise sont cochées.
- Le `feedback` d'une option s'affiche si l'apprenant l'a choisie.
- `points` : facultatif, 1 par défaut.
- L'`id` d'une question doit être unique dans tout le module.

**Feedback par conséquence.** Plutôt qu'un simple « c'est faux », racontez ce qui se passe ensuite.
`correct` et `incorrect` acceptent un objet avec un titre :

```json
"feedback": {
  "correct": "Message si la réponse est juste.",
  "incorrect": {
    "title": "Quelques semaines plus tard…",
    "body": "L'Office AI vous adresse une demande de précisions. Le dossier de votre patiente reste en attente."
  }
}
```

L'apprenant voit d'abord « ✗ Réponse incorrecte », puis le titre en grand, puis le texte.

### Écran « synthèse » (`summary`)

Toujours en **dernier**, un seul par module.

```json
{
  "id": "synthese",
  "type": "summary",
  "title": "Synthèse",
  "keyPoints": ["Point clé 1", "Point clé 2"],
  "showScore": true,
  "messages": {
    "passed": "Message en cas de réussite.",
    "failed": "Message si le seuil n'est pas atteint."
  }
}
```

---

## 3. Comportement pour l'apprenant

- L'apprenant avance avec le bouton d'action en bas de l'écran (`continueLabel`, ou « Suivant »).
  Pour quitter un écran, il doit avoir validé toutes ses questions et, dans une scène, dévoilé
  toutes les étapes.
- Une réponse validée affiche son feedback et ne peut plus être modifiée. Seule la première
  réponse compte dans le score.
- Le **Sommaire** permet de revenir librement aux écrans déjà parcourus.
- En quittant, la progression est enregistrée. À la réouverture, l'apprenant reprend là où il
  s'était arrêté.

## 4. Suivi transmis à la plateforme

| Situation                                                | SCORM 1.2 `lesson_status` | SCORM 2004                                |
|----------------------------------------------------------|---------------------------|-------------------------------------------|
| Module en cours                                          | `incomplete`              | `incomplete` / `unknown`                  |
| Tous les écrans vus, score ≥ seuil                       | `passed`                  | `completed` / `passed`                    |
| Tous les écrans vus, score < seuil                       | `failed`                  | `completed` / `failed`                    |
| Tous les écrans vus, aucune question notée               | `completed`               | `completed` / `unknown`                   |

- Score : 0 à 100 (`score.raw`), transmis lorsque le module est terminé.
- Chaque réponse est enregistrée comme interaction (`cmi.interactions`) : question, réponse
  donnée, réponse attendue, juste ou fausse.
- Pendant une reprise après échec, le statut reste `failed` jusqu'à ce que toutes les questions
  aient été de nouveau validées.

## 5. Tester sur SCORM Cloud

1. `npm run build` puis récupérer `dist/<id>-<version>-scorm12.zip`.
2. Sur SCORM Cloud : **Library → Add Content → Import a SCORM package**, choisir le zip.
3. **Launch** pour suivre le module comme un apprenant.
4. Fermer, relancer : vérifier la reprise.
5. Dans **Registrations / View Registration** : vérifier le statut, le score,
   `suspend_data` et les interactions.

Pour un journal détaillé des échanges dans la plateforme, ajouter `?debug` à l'URL de lancement
quand c'est possible : les appels SCORM s'affichent dans la console du navigateur.
