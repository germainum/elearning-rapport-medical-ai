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
  "id": "rapport-medical-ai",
  "version": "1.0.0",
  "title": "Titre affiché dans Acamedia",
  "description": "Résumé en une phrase.",
  "language": "fr",
  "author": "Office AI du canton de Vaud",
  "durationMinutes": 15,
  "storyTitle": "Rapport de Mme R.",
  "form": {
    "title": "Rapport médical somatique : Réadaptation professionnelle / Rente",
    "reference": "Formulaire 002.099 · v. 09.2023"
  },
  "scoring": {
    "passingScore": 70,
    "allowRetry": true
  },
  "screens": [ … ]
}
```

- `storyTitle` : fil rouge affiché dans le bandeau, à côté de la progression (facultatif).
- `help` : carte d'aide en bas du panneau de gauche sur ordinateur (facultatif) :
  `{ "title": "Une question ?", "body": ["Horaires de la centrale…"], "phone": "021 925 24 24", "email": "info@vd.oai.ch" }`.
  `phone` et `email` deviennent deux boutons (appel `tel:` et courriel `mailto:`) ; sans eux, seul le texte du `body` s'affiche.
- `glossary` : glossaire consultable à tout moment par le bouton « Glossaire » du bandeau, dans une
  fenêtre avec recherche (insensible aux accents). Facultatif :
  `{ "title": "Glossaire", "source": "…", "sections": [{ "title": "Rubrique", "terms": [{ "term": "Invalidité", "definition": "…" }] }] }`.
  Les définitions acceptent le gras, l'italique et les liens.
- `report` : « Mon rapport », le rapport de Mme R. qui se remplit au fil du module (facultatif) :
  `{ "title": "Rapport médical de Mme R.", "availableFrom": "1-1", "fileName": "…", "header": [ … ], "note": "…" }`.
  `hidePrompt: true` sur une question masque son énoncé et sa consigne (« Une seule réponse possible ») : utile quand l'énoncé
  ne ferait que répéter le formulaire affiché au-dessus. Ils restent lus par les lecteurs d'écran.
  Chaque question peut porter un `reportAnswer` (texte ou lignes) : la réponse modèle écrite dans le champ du
  formulaire quand la question est réussie ; sinon le champ montre le corrigé, signalé « Corrigé ». L'intitulé du champ
  vient du bloc `form` de l'écran. `hideReport: true` masque l'onglet sur un écran (ex. M. C.) ; `showReport: true` sur la
  synthèse ajoute la carte « Votre rapport » (voir, imprimer / PDF, télécharger).
- Aucun réglage n'est nécessaire pour le **temps restant** (calculé depuis `durationMinutes`), la **taille du texte**, les **raccourcis clavier** ni les **résultats par section** de la synthèse (groupés par le champ `section` des écrans).
- `logo` : logo affiché en haut à gauche, `{ "src": "images/logo-aivd.png", "alt": "AI VD – Office de l'assurance-invalidité pour le canton de Vaud" }` (facultatif).
- `form` : en-tête affiché sur chaque « extrait du formulaire » (voir les blocs `form`).
- `passingScore` : seuil de réussite en pourcentage (80 si absent).
- `allowRetry` : la synthèse liste les questions fausses (réponse donnée, bonne réponse, explication tirée de
  `feedback.correct`) et propose de les reprendre, une par une ou toutes, même si le module est réussi. La
  reprise est guidée : bandeau « Révision », réponses dans un nouvel ordre, « Suivant » enchaîne les questions à
  revoir puis ramène à la synthèse ; une seconde erreur affiche l'explication. Les bonnes réponses sont
  conservées et le score est recalculé. **Rédigez donc toujours un `feedback.correct`** : c'est lui qui explique.
- `version` : à augmenter à chaque livraison (elle sert aussi à **forcer le rechargement des images, vidéos et PDF**
  remplacés sous le même nom : les adresses des fichiers reçoivent `?v=<version>`) (`1.0.0` → `1.0.1` pour une correction, `1.1.0` pour un ajout).

### Champs communs à tous les écrans

| Champ           | Rôle                                                                 |
|-----------------|----------------------------------------------------------------------|
| `id`            | identifiant unique de l'écran                                        |
| `type`          | `text`, `scene`, `quiz`, `summary` ou `survey`                        |
| `kicker`        | surtitre facultatif, au-dessus du titre (ex. « Question 4 du formulaire ») |
| `title`         | titre de l'écran                                                     |
| `section`       | groupe du sommaire, sous la forme « Surtitre · Nom » (ex. « Section 2 · Situation médicale ») |
| `part`          | intertitre au-dessus d'un ensemble de sections voisines dans le sommaire (ex. « Le formulaire 002.099 ») |
| `hideKicker`    | `true` : masque le surtitre à l'écran (il reste lu par les lecteurs d'écran) ; utile quand l'extrait du formulaire porte déjà le numéro de la question |
| `optional`      | `true` : écran facultatif, sa rubrique est affichée en retrait dans le sommaire |
| `storyTitle`    | remplace le fil rouge du fil d'Ariane pour cet écran (ex. « Second cas : M. C. ») |
| `section`       | titre de groupe dans le sommaire (ex. « Section 2 · Situation médicale ») : affiché quand il change d'un écran à l'autre |
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
    "src": "images/mon-image.jpg",
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
  - `"start": 8` : la lecture commence à la 8ᵉ seconde (première lecture seulement).
  - `"autoplay": true` : la vidéo démarre seule à l'ouverture de l'écran, une fois par session.
    Les navigateurs bloquent souvent le démarrage avec le son : la vidéo démarre alors **en sourdine**,
    sous-titres affichés, avec un bouton « Activer le son ». Pas de lecture automatique si
    l'utilisateur a demandé à réduire les animations (réglage du système).
- `objectives` (facultatif) affiche les **objectifs pédagogiques** dans une carte à coches vertes, sous le texte et avant la
  frise : `{ "items": ["Décrire l'état de santé…", "Attester l'incapacité de travail…"] }`.
  Un objectif par ligne, court, commençant par un **verbe à l'infinitif différent** (évitez de répéter les mêmes mots d'un objectif à
  l'autre) ; le gras est autorisé. `title` est facultatif : sans lui, la carte n'a pas d'intitulé et suit le titre de l'écran, ce
  qui évite de répéter « vous allez apprendre / à la fin vous saurez ».
- `layout: "editorial"` (écran `text` d'accueil) : deux colonnes sur ordinateur, titre + phrase clé (`body`) + repères (`facts`) + bouton à gauche, vidéo à droite ; empilé sur tablette et mobile. `facts` : `[ { "icon": "clock", "text": "{minutes} minutes, à votre rythme" } ]` (icônes `clock`, `questions`, `resume` ; `{minutes}` et `{questions}` sont remplacés par la durée annoncée et le nombre de questions).
- `journey` (facultatif) affiche une **frise de parcours** sous le texte, en ligne sur grand écran et
  en colonne sur mobile :

  ```json
  "journey": {
    "title": "Votre parcours dans ce module",
    "steps": [
      { "icon": "courrier", "label": "Le courrier", "text": "Phrase courte facultative." },
      { "icon": "decision", "label": "La suite à l'AI" }
    ]
  }
  ```

  Icônes disponibles : `courrier`, `dossier`, `examen`, `redaction`, `envoi`, `decision`.
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

Un document `"kind": "courrier"` s'affiche comme une **lettre reçue** (logo du module, enveloppe, plis du papier) :
`title` = expéditeur, `sender` (adresse), `recipient` (destinataire), `date` (« Vevey, le … »), `subtitle` (ligne
« Concerne : … »), `body`, `signature`, `enclosures` (« Annexe : … »). Un bloc `attachment` placé juste après
apparaît agrafé sous la lettre.
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
  "image": { "src": "images/mme-r.jpg", "alt": "Portrait illustré de Mme R., 47 ans." },
  "reference": "Dossier n° 2014-0387",
  "body": ["Résumé de la situation (rubrique « Notes »)."],
  "sections": [
    { "title": "Diagnostics", "data": [{ "label": "Principal", "value": "Lombosciatalgie droite" }] }
  ],
  "journal": [{ "date": "12.01.2026", "text": "Lombosciatalgie droite aiguë. Arrêt de travail à 100 %." }]
}
```

`availableFrom` (facultatif) est l'`id` de l'écran à partir duquel le bouton « Dossier patient » apparaît (ex. `"1-1"` : dès la
section 1) ; sans lui, le bouton apparaît dès que l'apprenant a découvert le dossier dans la scène.

La fiche s'affiche comme un **dossier médical papier** (feuille perforée, marge rouge, photo agrafée,
tampon « Confidentiel »), glissée dans une chemise cartonnée dans les scènes. `sections` regroupe les
renseignements en rubriques ; `journal` liste les consultations datées ; `data` (sans rubrique) reste
possible. Un bloc `document` de type `"dossier"` (autre patient, ex. M. C.) utilise le même rendu et les
mêmes champs.

Placez ensuite `{ "type": "patientFile" }` dans la scène où l'apprenant découvre le dossier. À partir
de ce moment, un bouton « Dossier patient » (icône de presse-papiers) apparaît dans le bandeau et permet de
revoir la fiche dans une fenêtre, jusqu'à la fin du module. Sans bloc `patientFile` dans les scènes,
le bouton est disponible dès le début.

Règles pour les extraits du formulaire (`form`) :

- `label` reprend **mot pour mot** l'intitulé du formulaire (voir `docs/formulaire-002099.md`).
- `number` est le numéro imprimé : `"2.5"` (entre guillemets) ou un nombre entier ; facultatif.
- `{ "section": "2 Situation médicale" }` affiche un titre de section du formulaire avant les questions qui suivent.
- `title` d'un bloc `form` remplace le titre du formulaire (ex. pour une annexe).
- Sans `answer`, le champ s'affiche vide (lignes pointillées). Avec `answer`, il s'affiche rempli,
  marqué « Exemple de réponse ».
- `"field": false` affiche un point explicatif du formulaire sans champ à remplir (ex. texte d'introduction de l'annexe sur la réadaptation).

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
- Le `feedback` d'une option s'affiche si l'apprenant l'a choisie : **écrivez-le en une phrase**, c'est ce qui apparaît d'abord.
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

**Le retour s'affiche en deux niveaux.** Visible tout de suite : le verdict et une phrase (bonne réponse : le texte de `correct` ;
mauvaise réponse : le `feedback` de l'option choisie, à défaut le `title` de `incorrect`). Replié sous « Voir l'explication » :
la conséquence (`title` et `body` de `incorrect`) et pourquoi la bonne réponse est la bonne (`correct`). Après une seconde erreur à la
reprise, l'explication de la bonne réponse reste visible. Gardez donc un `correct` court : c'est la phrase que l'on lit.

### Écran « synthèse » (`summary`)

Un seul écran `summary`. Il peut être suivi d'écrans `text` (ex. remerciements) : ils restent facultatifs pour
la complétion, transmise dès que la synthèse est atteinte. Donnez alors à la synthèse un `continueLabel` (ex. « Un dernier mot »).

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

### Écran « questionnaire de satisfaction » (`survey`)

Facultatif et non noté (modèle de Kirkpatrick, voir `docs/evaluation-kirkpatrick.md`), à placer après la synthèse. Il se déroule
en étapes courtes ; les réponses sont gardées au fil de la saisie et transmises au LMS à l'envoi (une interaction `eval-<id>` par question).

```json
{
  "id": "avis",
  "type": "survey",
  "title": "Votre avis sur la formation",
  "intro": ["Trois étapes courtes…"],
  "scaleLabels": ["Pas du tout d'accord", "…", "Tout à fait d'accord"],
  "privacy": "Texte sur l'usage des réponses.",
  "thanks": ["Merci…"],
  "steps": [
    { "title": "Votre expérience", "items": [
      { "id": "satisfaction", "kind": "scale", "prompt": "Cette formation m'a donné satisfaction." },
      { "id": "duree", "kind": "choice", "prompt": "La durée m'a paru :", "options": [ { "id": "a", "text": "Adaptée" }, { "id": "l", "text": "Trop longue" } ] },
      { "id": "amelioration", "kind": "text", "prompt": "Que faudrait-il améliorer ?" }
    ] }
  ]
}
```

`kind` : `scale` (échelle d'accord en 5 cases), `choice` (un choix), `multiple` (plusieurs choix), `text` (commentaire libre, 250 caractères).
Les `id` de questions (minuscules, chiffres, tirets) et d'options (un caractère) servent de clés dans le LMS : ne pas les renommer en ligne.

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
