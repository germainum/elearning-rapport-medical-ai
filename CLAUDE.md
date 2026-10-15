# CLAUDE.md — Module e-learning SCORM pour Acamedia

## Contexte

- **Destination** : Acamedia, plateforme de formation continue de la Société vaudoise de médecine (SVM).
- **LMS** : MOS Chorus (MindOnSite). Le module tourne dans une **iframe**.
- **Producteur** : Office AI du canton de Vaud (**AI = assurance-invalidité**, OAI Vaud).
- **Objectif pédagogique** : apprendre aux **médecins généralistes vaudois** à remplir le
  **Rapport médical somatique : Réadaptation professionnelle / Rente** (formulaire OAI **002.099**, v. 09.2023,
  6 pages : 5 sections + annexe des travaux exigibles + annexe sur l'aptitude à la réadaptation).
  Décision du 14.10.2026 : toute la formation suit ce formulaire (il remplace le 002.099 MT, 1 page).
  **Point par point** (décision du 14.10.2026 : « trop d'info par écran ») : **un écran par point du formulaire**
  (1.1 à 4.5, section 5, pièces jointes, annexe des travaux exigibles, annexe réadaptation 1 et 2), puis 2 écrans
  M. C. et 3 écrans pratiques. Chaque écran : une phrase d'accroche au plus, l'extrait vide, **une question à
  choix unique à exactement 3 réponses** et son feedback (sans « réponse remplie » : redondant avec le feedback, retirée le 14.10.2026). Pas d'encadré « À retenir » : l'essentiel
  passe dans le feedback. 35 écrans, 33 questions, ~35 min. Champ `section` : regroupe les écrans dans le sommaire.
  Intitulés exacts : `docs/formulaire-002099.md` (à citer tels quels, ne pas reformuler).
  Scénario pédagogique : `docs/storyboard.md` (en attente de validation par l'OAI).
  Source officielle : `docs/source-video-oai.md` (transcription de la vidéo OAI pour les médecins
  traitants) `docs/source-faq-aivd.md` (FAQ « Corps médical » d'aivd.ch) et
  `docs/source-atelier-rapport-medical.md` (atelier SMR du 05.09.2024 : 3 piliers, CIM-10, poste réel,
  psychosocial), à privilégier sur toute formulation inventée.
- **Public** : médecins installés, peu de temps, souvent sur **tablette ou mobile**.
- **Langue** : français (interface et contenu). Code et identifiants en anglais, commentaires en français.
- **Test de référence** : SCORM Cloud avant livraison à Acamedia.

## Contraintes techniques (non négociables)

- HTML / CSS / JavaScript **vanilla**, sans framework ni bibliothèque côté navigateur.
- **Node uniquement pour les outils** (build, validation, serveur local). Aucune dépendance npm si possible.
- **Aucune ressource externe** dans le paquet : pas de CDN, pas de Google Fonts, pas d'appel réseau hors du paquet.
  Polices = pile système. Images = fichiers locaux.
- **Mobile d'abord**, responsive. Cibles tactiles ≥ 44×44 px.
- **WCAG 2.1 AA** : navigation clavier complète, focus visible, contrastes ≥ 4.5:1 (texte) / 3:1 (UI),
  textes alternatifs obligatoires, structure sémantique (landmarks, titres hiérarchisés, `fieldset`/`legend`
  pour les questions), annonces `aria-live` pour les feedbacks et changements d'écran, respect de
  `prefers-reduced-motion`.

## Architecture

### Séparation contenu / moteur

- **Tout le contenu** est dans `content/module.json` (+ images dans `content/images/`).
  Ce fichier doit rester lisible et modifiable par une personne qui ne code pas.
- Le moteur (`src/`) ne contient **aucun texte pédagogique**, seulement les libellés d'interface.
- Tout changement de schéma de `module.json` doit être répercuté dans `scripts/validate.js`
  et dans `README.md` (guide de rédaction).

### Types d'écrans

| `type`    | Usage                                                      |
|-----------|------------------------------------------------------------|
| `text`    | Texte avec image optionnelle                               |
| `scene`   | Scène narrative : blocs `text`, `document`, `form`, `callout`, `question`, séparés par des boutons d'action `reveal` |
| `quiz`    | QCM à choix unique (`single`) ou multiple (`multiple`), avec feedback |
| `summary` | Synthèse finale : points clés + score                      |

Champs communs : `section` (titre de groupe dans le sommaire), `kicker` (surtitre), `continueLabel` (texte du bouton vers l'écran suivant),
`storyTitle` (fil rouge propre à l'écran), `hidePatientFile` (masque le dossier de Mme R., ex. second cas).
Bloc `writing` : exercice de rédaction non noté (texte gardé dans `localStorage`, jamais transmis au LMS).
Vidéo : champ `video` d'un écran `text` (en tête) ou bloc `video` d'une scène. Fichier MP4 **embarqué**
dans `content/videos/` (jamais d'iframe YouTube : règle « aucune ressource externe »), sous-titres
WebVTT obligatoires (affichés par défaut), transcription dépliable. Vidéo de l'OAI :
`content/videos/rapport-medical-oai.mp4` (10,7 Mo, 2 min 31) ; ses sous-titres (49) viennent de la
transcription **horodatée fournie par l'OAI** (`docs/video-transcription-horodatee.txt`), convertie
par `scripts/captions-from-timestamps.js`. `scripts/make-captions.js` (minutages estimés) ne sert
qu'en dernier recours, sans horodatage. Le serveur local gère les
requêtes partielles (Range), nécessaires à la lecture vidéo.
Vidéo d'introduction : `start: 8` (le contenu commence à 8 s, comme les sous-titres) et `autoplay: true`.
Lecture automatique : une fois par session, essai avec le son puis repli **en sourdine** + bouton « Activer le son »
(les navigateurs et l'iframe du LMS bloquent souvent le son sans interaction) ; désactivée si `prefers-reduced-motion`.
Logique dans `wireVideos` (`src/js/screens/common.js`), appelée par `app.js` après l'insertion de l'écran.
Courrier : document `kind: "courrier"` rendu comme une **lettre reçue** (`letter()` dans `blocks.js`) : en-tête avec logo
AI VD et adresse de Vevey, destinataire, date, « Concerne », signature, annexes ; enveloppe, timbre vert et plis
en CSS décoratif ; pièce jointe suivante « agrafée » (trombone). Rien n'est pivoté.
Pièce jointe : bloc `attachment` (PDF dans `content/documents/`). Avec `preview`, ouvre une fenêtre
modale avec l'aperçu HTML du formulaire et un bouton « Télécharger le PDF » (attribut `download`).
Choix délibéré : pas de PDF dans une iframe (non affiché sur Android, première page seule sur iOS).
Le formulaire 002.099 y est joint au courrier : `content/documents/rapport-medical-002099.pdf`
(PDF standard 6 pages exporté de Word — jamais de PDF XFA, illisible dans les navigateurs).
Dossier patient = **dossier médical papier** (`medicalRecord()` dans `blocks.js`) : feuille perforée à marge rouge,
en-tête « Dossier médical » + n° (`reference`), photo agrafée, « Notes » (`body`), rubriques (`sections`), journal des
consultations daté (`journal`), tampon « Confidentiel » ; dans une scène, glissé dans une chemise cartonnée à onglet.
Même rendu pour les documents `kind: "dossier"` (M. C.). Dans la chemise latérale, la feuille de la chemise sert de papier.
Fiche patient : définie une fois à la racine (`patientFile`), affichée dans une scène par le bloc
`{ "type": "patientFile" }` et consultable ensuite à tout moment via le bouton « Dossier patient » du bandeau
(`<dialog>` natif : focus piégé, Échap pour fermer, focus rendu au bouton).
Illustrations (`content/images/`, **JPEG** 2D à contours sombres, bleu et accents verts sur fond blanc, fournies le 15.10.2026 ;
guide de style : « GUIDE DES ILLUSTRATIONS » de l'outil de production) : un **médecin généraliste** suit le parcours —
`cabinet-courrier.jpg` (courrier), `consultation.jpg` (anamnèse), `redaction-rapport.jpg` (limitations),
`envoi-rapport.jpg` (en pratique), `merci.jpg` (remerciements) — + portraits `mme-r.jpg` et `m-c.jpg`
(second cas, psychosocial). Tous ont un texte alternatif (portraits compris). Fonds blancs opaques (pas de transparence
en JPEG). Remplacer une illustration = même nom de fichier ; adapter le texte alternatif dans `module.json`.
Frise de parcours : champ `journey` d'un écran `text` (HTML accessible, icônes du moteur).
Des photos réelles (OAI / SVM) pourraient remplacer les illustrations : même nom de fichier.
Glossaire : champ `glossary` à la racine (43 termes en 6 rubriques, repris du « Glossaire et notions clés —
assurance-invalidité » de l'OAI Vaud, fourni le 14.10.2026). Bouton « Glossaire » du bandeau, à toutes les tailles
d'écran → `<dialog>` avec recherche insensible aux accents et compteur annoncé (`role="status"`).
Sur ≤ 360 px, la progression du bandeau passe en forme courte « 10/35 » (forme longue lue par les lecteurs d'écran).
Feedback d'une question : texte, ou objet `{ "title", "body" }` pour un feedback par conséquence.

### Couche SCORM isolée

- `src/js/scorm.js` est **le seul fichier** qui connaît SCORM. Il expose une interface neutre
  (`init`, `getSuspendData`, `setSuspendData`, `getLocation`, `setLocation`, `getLearnerName`,
  `setScore`, `setStatus({ completion, success })`, `recordInteraction`, `commit`, `finish`).
- **SCORM 1.2 par défaut**. Le passage à SCORM 2004 doit se limiter à un adaptateur dans `scorm.js`
  + l'option de version dans le build (manifeste).
- Recherche de l'API (`API` pour 1.2, `API_1484_11` pour 2004) en remontant `window.parent`
  puis `window.opener` (algorithme ADL, 500 niveaux max).
- **Mode debug** : si aucune API n'est trouvée, une API simulée journalise chaque appel dans la
  console (`[SCORM mock] LMSSetValue(...)`) et persiste dans `localStorage` pour tester la reprise.

### Règles de suivi

- **Reprise** : progression (écrans vus, réponses, écran courant) sérialisée dans `cmi.suspend_data`
  (limite SCORM 1.2 : 4096 caractères → format compact, clés courtes, basé sur les `id` d'écrans/questions).
  `cmi.core.lesson_location` = id de l'écran courant. `cmi.core.exit = "suspend"` en quittant.
- **Completed** : quand tous les écrans **jusqu'à la synthèse** ont été vus (et leurs questions validées). Les écrans
  `text` placés **après** la synthèse (écran « Merci », illustration `merci.jpg`) ne conditionnent pas la complétion :
  l'apprenant qui s'arrête sur son résultat a terminé le module (`tracker.isComplete`).
- **Score** : transmis en `cmi.core.score.raw` (0–100), `min` = 0, `max` = 100.
- **Passed** : si le score atteint `passingScore` défini dans `module.json`.
- En SCORM 1.2 un seul champ `lesson_status` : la logique complétion/réussite reste séparée dans le
  moteur et c'est l'adaptateur 1.2 qui la projette sur `lesson_status`.
- `cmi.core.session_time` envoyé à la fin de la session.

### Décisions validées (13.10.2026)

- **Sous le seuil** (tous les écrans vus, score < `passingScore`) : statut `failed`. Si
  `scoring.allowRetry` vaut `true`, la synthèse liste les **questions fausses** (« Questions à revoir ») :
  reprise d'une question ou de toutes, proposée **même si le module est réussi**. Seules les réponses
  fausses sont effacées (les bonnes sont conservées) ; l'apprenant arrive directement sur la question,
  puis « Suivant » enchaîne jusqu'à la synthèse. Le statut LMS reste inchangé jusqu'à la nouvelle
  évaluation complète ; le score ne peut que monter.
  À confirmer avec Acamedia : traitement de `failed` par Chorus pour l'attribution des crédits.
- **Navigation** : libre vers les écrans déjà parcourus (Sommaire). On ne quitte un écran que si
  toutes ses questions sont validées. Règle : écran *i* accessible si tous les écrans précédents sont
  vus et leurs questions validées.
- **Questions** : validation → feedback → verrouillage. Seule la première réponse compte. Choix
  multiple : points seulement si la réponse est exacte.
- **Interactions** : chaque réponse est enregistrée dans `cmi.interactions` (type `choice`).
  D'où la contrainte : identifiants d'options = un caractère `[a-z0-9]`.
- **Manifeste** : pas de `adlcp:masteryscore` (le module calcule lui-même passed/failed), pas de
  fichiers XSD embarqués.
- **Chargement** : modules ES + `fetch('content/module.json')`. Nécessite un serveur http (LMS ou
  `npm start`). Ouvrir `index.html` en double-clic ne fonctionne pas.
- **Visuel** : thème clair uniquement (`src/css/tokens.css`), sans logo pour l'instant.

### Décisions validées (13.10.2026, inspiration « Pathogen Patrol », Articulate Rise)

- ~~Palette chaude~~ remplacée le 14.10.2026 par la **charte AI VD** (voir ci-dessous).

### Charte AI VD (14.10.2026)

- Sources : logo officiel (extrait du formulaire 002.099 MT, `content/images/logo-aivd.png`) et site
  aivd.ch, section « Corps médical ».
- **Bleu marine `#0f1d96`** (couleur du public « Corps médical ») : titres, boutons, liens.
- **Vert AI VD `#009628`** : accents graphiques uniquement (3.9:1, pas de petit texte vert).
  **Vert foncé `#007a20`** pour le texte vert (surtitres, étiquettes).
- Texte noir / anthracite `#33373d`, fonds blancs et `#f4f4f4`, gris du logo `#bec3c3` décoratif.
- ~~Angles droits, aplats~~ remplacés le 14.10.2026 par un **style « application »** inspiré d'un mockup
  e-learning : fond gris clair `#f3f4f8`, panneaux et cartes blancs arrondis (10 / 16 / 20 px), ombres
  douces, surtitres en pastilles, boutons secondaires sur teinte bleue `#eef0fb`, barre de navigation
  flottante sur ordinateur. Numéros de la synthèse dans un carré vert arrondi (écho au logo).
- Logo dans le bandeau via `logo` dans `module.json` ; sur mobile, logo + « Écran x sur n » seulement.

### Mise en page par taille d'écran (14.10.2026)

- **< 1024 px** (mobile, tablette) : une colonne ; sommaire en menu déroulant, dossier patient en fenêtre.
- **≥ 1024 px** : **panneau de gauche** (`.app-sidebar--toc`) : logo, titre, pastilles (durée, étapes,
  questions, calculées), **frise de progression** (coche verte = terminé, point bleu = écran actuel,
  cercle gris = verrouillé ; l'état est aussi écrit pour les lecteurs d'écran), carte d'aide (`help`).
  Au centre : fil d'Ariane (`storyTitle › kicker › title`) + pastille « n / total », contenu (46rem).
- **Dossier patient (≥ 1024 px)** : **fermé par défaut**. Un **onglet « Dossier patient »** horizontal (vignette + icône + libellé)
  dépasse du bord droit en haut (`#folder-tab`) ; il ouvre une **chemise cartonnée** (`.folder` : onglet titre, fiche papier
  inclinée avec trombone, photo « agrafée », tampon « Confidentiel » décoratif). L'état ouvert/fermé
  **se conserve d'un écran à l'autre** et après rechargement (`localStorage`, clé
  `dossier-ouvert:<id>`, préférence d'affichage propre au navigateur). Fermeture : bouton ou Échap,
  le focus revient à l'onglet. ≥ 1280 px : la chemise ouverte occupe une 3ᵉ colonne ; 1024–1279 px :
  elle s'ouvre par-dessus le contenu. < 1024 px : bouton du bandeau → fenêtre (inchangé).
- **≥ 1440 px** : tout grandit progressivement (taille de base 16 px à 1440 px → 20 px max vers 2560 px,
  relative à la taille choisie dans le navigateur) ; **≥ 1920 px** : colonnes élargies (17 / 50 / 21rem).
- Le sommaire est rendu deux fois (menu `#toc-list` et colonne `#toc-side-list`), une seule
  version visible à la fois.
- Police **Work Sans** (celle du site), **embarquée** dans `src/fonts/` (version variable 100–900,
  Fontsource 5.3.0, sous-ensembles latin, latin étendu et italique latin, ~130 Ko) et déclarée dans
  `src/css/fonts.css`. Licence SIL OFL 1.1 : `src/fonts/OFL.txt`, à garder dans le paquet.
  Repli sur Arial (police du formulaire).
- **Type d'écran `scene`** qui **remplace `case`** : suite de blocs (texte, dossier patient, extrait
  du formulaire, question) avec des **boutons d'action** qui révèlent la suite. Progression dans la
  scène sauvegardée dans `suspend_data`.
- **Feedback par conséquence** : le feedback d'une mauvaise réponse raconte son effet concret sur le
  dossier ou la patiente (titre + texte).
- **Ludification légère** : bandeau de progression, **pas de points**. Le score reste réservé à la
  synthèse.
- Ne pas reprendre : faux boutons non focusables, bandeau qui masque le contenu, animations
  non désactivables.

## Fichiers

```
content/module.json        contenu (seul fichier à éditer pour le contenu)
content/images/            images du module
src/index.html             squelette sémantique (landmarks, région live, barre de debug)
src/css/fonts.css          @font-face Work Sans (fichiers dans src/fonts/, licence OFL.txt)
src/css/tokens.css         couleurs, typo, espacements (charte graphique)
src/css/base.css           reset, focus visible, utilitaires a11y
src/css/components.css     composants
src/js/scorm.js            SEULE couche SCORM (recherche API, adaptateurs 1.2 / 2004, API simulée)
src/js/tracker.js          état apprenant, score, sérialisation suspend_data
src/js/app.js              démarrage, navigation, sommaire, liaison tracker ↔ scorm
src/js/format.js           échappement HTML + mini-formatage
src/js/screens/*.js        un fichier par type d'écran (text, scene, quiz, summary)
                           + blocks.js (blocs de scène) + question.js (partagé) + common.js
docs/formulaire-002099.md  intitulés exacts du formulaire (référence de contenu)
docs/storyboard.md         scénario pédagogique, hypothèses ⚠ à valider par l'OAI
scripts/validate.js        validation du schéma (messages en français)
scripts/build.js           validation, staging (build/package), manifeste, zip (dist/)
scripts/serve.js           serveur local de test
scripts/lib/zip.js         écriture zip sans dépendance
```

## Build

- `scripts/build.js` : valide `module.json`, copie `src/` + `content/` dans `build/package/`,
  réécrit `data-scorm-version` dans `index.html`, génère `imsmanifest.xml` (liste exhaustive des
  fichiers) et produit `dist/<id>-<version>-scorm12.zip` (ou `-scorm2004.zip`) avec
  **`imsmanifest.xml` à la racine du zip**.
- Pas d'outil de zip externe : écriture du zip en Node pur (`zlib` + CRC32).
- Fichiers parasites exclus du paquet : `desktop.ini`, `Thumbs.db`, fichiers cachés, `~$*`, `*.tmp`.

## Commandes

```
npm run validate     # vérifie content/module.json, messages d'erreur en français
npm start            # serveur local http://localhost:8080 (API SCORM simulée)
npm run build        # génère dist/<id>-<version>-scorm12.zip
npm run build:2004   # génère dist/<id>-<version>-scorm2004.zip
npm run preview      # sert build/package (le dernier paquet généré)
```

Ajouter `?debug` à l'URL journalise aussi les appels SCORM quand une vraie API LMS est présente.

## Conventions

- **Jamais de texte vertical ou pivoté de côté** dans l'interface (pas de `writing-mode: vertical-*`,
  pas de libellé tourné à 90°), même pour un onglet latéral.

- Échapper systématiquement le contenu injecté dans le DOM (pas d'`innerHTML` sur du texte brut
  non échappé). Le formatage autorisé dans le JSON est limité (gras, italique, listes, liens).
- Pas de `console.log` hors mode debug.
- Tester au clavier seul et à 320 px de large avant toute livraison.
