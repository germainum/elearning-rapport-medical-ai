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
  passe dans le feedback. 40 écrans, 33 questions, ~45 min. L'**accueil est réparti sur 3 écrans courts** (vidéo, « Ce que vous
  allez apprendre », « Comment se déroule la formation »). L'**écran du courrier est découpé en 3** (lettre + formulaire joint, dossier de
  Mme R., « Le rôle de votre rapport »). La **conclusion** (synthèse, merci) forme sa propre section « Conclusion »,
  sans dossier patient (`hidePatientFile`). Champ `section` : regroupe les écrans dans le sommaire, toujours sous la forme « Surtitre · Nom » (Démarrage, Section 1 à 5, Second cas, En pratique, Conclusion, Facultatif).
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
| `survey`  | Questionnaire de satisfaction (Kirkpatrick), facultatif, non noté, après la synthèse |

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
« Mon rapport » (21.10.2026, v0.38.0) : second onglet du bord droit sous « Dossier patient » (`#report-tab`, `src/js/report.js`).
Vue réduite du 002.099 qui se remplit : racine `report`, `reportAnswer` sur 27 questions, champ `correct` / `corrigé` / vide
(`buildReport`). Un panneau à la fois (bouton pour passer de l'un à l'autre, `panneau-ouvert:<id>`) ; < 1024 px : fenêtre
(burger : tuile ; tablette : bouton icône). Impression via `body.printing-report` + `#report-print` ; téléchargement = HTML autonome.
`hideReport` (M. C.), `showReport` (carte « Votre rapport » sur la synthèse).
Confort de lecture (21.10.2026, v0.39.0, `src/js/comfort.js`) : **temps restant estimé** (`durationMinutes` réparti au prorata des écrans et questions restants, sidebar et menu) ;
**taille du texte** A− / A+ (3 niveaux 100 / 112,5 / 125 %, `--text-scale` sur `html`, `localStorage` `taille-texte:<id>`, sidebar ≥ 1024 px et menu en dessous) ;
**raccourcis clavier** (ordinateur) : ← → écran précédent / suivant, 1–9 choisir la réponse, Entrée valider (inactifs dans un champ, une fenêtre, un panneau latéral).
**Résultats par section** sur la synthèse (`tracker.sectionResults`, « Solide » ≥ 80 %, « À consolider » ≥ 50 %, « À revoir »), bouton « Revoir » par section.
Questionnaire de satisfaction (21.10.2026, v0.40.0) : écran `avis` (`survey`, `screens/survey.js`) après la synthèse : 3 étapes (réaction, apprentissage perçu,
transfert), non noté, n'affecte ni score ni complétion. Réponses gardées dans `suspend_data` (`e`, `f`) et envoyées au LMS à l'envoi
(`scorm.recordSurvey`, interactions `eval-<id>`). Détail, niveau 4 et points à confirmer : `docs/evaluation-kirkpatrick.md`.
Sommaire (21.10.2026, v0.41.0) : les rubriques terminées du début du parcours (au moins 2) se replient en une ligne « n parties terminées » (dépliable) ;
champ `part` = intertitre d'un ensemble de rubriques (« Le formulaire 002.099 »), filet à la sortie ; champ `optional` = rubrique en retrait (anneau en pointillés, sans vert). Un surtitre partagé par des rubriques voisines (« Démarrage ») s'affiche une fois, en intertitre ; le compteur « n/total » n'apparaît que qu'une fois la rubrique commencée et tant qu'elle n'est pas finie (coche = terminé). Rubrique à venir (aucun écran accessible) : atténuée, cadenas à la place du compteur. Barre d'avancement d'ensemble (v0.43.0, `[data-overall]`, `role="progressbar"`) sous « Votre progression » et en tête du menu : « 10 % terminé · 4 écrans sur 41 ». Quatre ensembles : Démarrage (surtitre partagé), « Le formulaire 002.099 » (sections 1 à 5), « S'entraîner » (cas de M. C., au cabinet), « Pour finir » (résultat, avis facultatif) ; surtitre vert réservé aux sections 1 à 5.
Illustrations (`content/images/`, **JPEG** 2D à contours sombres, bleu et accents verts sur fond blanc, fournies le 15.10.2026 ;
guide de style et prompts : `docs/guide-illustrations.txt`, galerie : `docs/apercu-illustrations.html`) : un **médecin généraliste** suit le parcours —
`cabinet-courrier.jpg` (courrier), `consultation.jpg` (anamnèse), `redaction-rapport.jpg` (limitations),
`envoi-rapport.jpg` (en pratique), `merci.jpg` (remerciements) — + portraits `mme-r.jpg` et `m-c.jpg`
(second cas, psychosocial). Tous ont un texte alternatif (portraits compris). Fonds blancs opaques (pas de transparence
en JPEG). Remplacer une illustration = même nom de fichier ; adapter le texte alternatif dans `module.json`.
Objectifs pédagogiques : champ `objectives` (`title`, `items`) d'un écran `text`, carte à coches vertes affichée
sous le texte, avant la frise (`objectivesHtml`, `common.js`) ; 5 objectifs courts, sans titre de carte, sur l'écran « Ce que vous
allez apprendre » (verbes tous différents, pas de répétition avec le titre ni l'intro), repris par l'export Rise.
Frise de parcours : champ `journey` d'un écran `text` (HTML accessible, icônes du moteur).
Des photos réelles (OAI / SVM) pourraient remplacer les illustrations : même nom de fichier.
Glossaire : champ `glossary` à la racine (43 termes en 6 rubriques, repris du « Glossaire et notions clés —
assurance-invalidité » de l'OAI Vaud, fourni le 14.10.2026). Bouton « Glossaire » du bandeau, à toutes les tailles
d'écran → `<dialog>` avec recherche insensible aux accents et compteur annoncé (`role="status"`).
Sur ≤ 360 px, la progression du bandeau passe en forme courte « 10/40 » (forme longue lue par les lecteurs d'écran).
Feedback d'une question : texte, ou objet `{ "title", "body" }` pour un feedback par conséquence. **Deux niveaux** (20.10.2026) :
visibles tout de suite, le verdict et **une phrase** (bonne réponse : `feedback.correct` ; mauvaise réponse : la remarque de l'option
choisie, à défaut le `title` de `incorrect`) ; **repliés** sous « Voir l'explication » (`<details>`), la conséquence
(`incorrect`) et l'explication de la bonne réponse. Après une seconde erreur à la reprise, cette explication reste visible.

### Couche SCORM isolée

- `src/js/scorm.js` est **le seul fichier** qui connaît SCORM. Il expose une interface neutre
  (`init`, `getSuspendData`, `setSuspendData`, `getLocation`, `setLocation`, `getLearnerName`,
  `setScore`, `setStatus({ completion, success })`, `recordInteraction`, `commit`, `finish`).
- **SCORM 1.2 par défaut**. Le passage à SCORM 2004 doit se limiter à un adaptateur dans `scorm.js`
  + l'option de version dans le build (manifeste).
- Recherche de l'API (`API` pour 1.2, `API_1484_11` pour 2004) en remontant `window.parent`
  puis `window.opener` (algorithme ADL, 500 niveaux max).
- **Mode debug** : si aucune API n'est trouvée (version en ligne, test local), une API simulée persiste dans `localStorage` pour
  tester la reprise. **Rien ne s'affiche par défaut** (démonstration propre) ; avec **`?debug`** dans l'adresse, la barre jaune « Mode test »
  (bouton « Effacer la progression ») apparaît et chaque appel est journalisé dans la console (`[SCORM simulé] …`).

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
  fausses sont effacées (les bonnes sont conservées). **Révision guidée** (15.10.2026, `tracker.startReview`) :
  la synthèse affiche pour chaque question fausse la réponse donnée, la bonne réponse et son explication
  (`feedback.correct`) ; « Reprendre » mène à la question avec un bandeau « Révision · question k sur n »,
  les réponses dans un **ordre mélangé** (`shuffledOptions`, déterministe), et « Suivant » devient « Question
  suivante à revoir (k sur n) » puis « Revenir à mon résultat » (plus de clics sur les 40 écrans). Une **seconde
  erreur** à la reprise affiche l'explication de la bonne réponse. La file de révision (`q`) et le nombre de
  reprises par question (`t`) sont dans `suspend_data` : la révision survit à un rechargement. Le score est
  recalculé après la révision (une bonne réponse à la reprise compte) ; à confirmer avec Acamedia. Le statut
  LMS ne change qu'à la nouvelle évaluation complète.
  À confirmer avec Acamedia : traitement de `failed` par Chorus pour l'attribution des crédits.
- **Navigation** : libre vers les écrans déjà parcourus (Sommaire). On ne quitte un écran que si
  toutes ses questions sont validées. Règle : écran *i* accessible si tous les écrans précédents sont
  vus et leurs questions validées.
- **Questions** : validation → feedback → verrouillage. Seule la première réponse compte. Choix
  multiple : points seulement si la réponse est exacte. **Ordre des réponses mélangé dès la première fois** (21.10.2026,
  `shuffledOptions`, stable pour une question donnée, la bonne réponse n'a pas de place fixe), puis différent à chaque reprise.
  **Énoncés propres à chaque point** (« Comment présentez-vous le traitement dispensé… ? »), pas « Que notez-vous à la question N ? ».
- **Interactions** : chaque réponse est enregistrée dans `cmi.interactions` (type `choice`).
  D'où la contrainte : identifiants d'options = un caractère `[a-z0-9]`.
- **Manifeste** : pas de `adlcp:masteryscore` (le module calcule lui-même passed/failed), pas de
  fichiers XSD embarqués.
- **Cache** : toutes les adresses de fichiers du contenu (images, vidéo, sous-titres, PDF) sont suffixées de `?v=<version>`
  (`asset()` dans `app.js`). Une image remplacée sous le même nom est donc rechargée dès que la `version` de
  `module.json` change : **augmenter la version à chaque livraison**. Le manifeste SCORM liste les fichiers sans suffixe.
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
- Carte d'aide du panneau de gauche (`help` : `title`, `body`, `phone`, `email`) : pastille « ? », horaires, **bouton téléphone**
  (`tel:`) plein et **bouton courriel** (`mailto:`), cibles de 44 px.
- Logo dans le bandeau via `logo` dans `module.json` ; sur mobile, logo + « Écran x sur n » seulement.

### Mise en page par taille d'écran (14.10.2026)

- **< 1024 px** (mobile, tablette) : une colonne ; sommaire en menu déroulant, dossier patient en fenêtre.
- **< 768 px (mobile) : menu burger** (21.10.2026) : le bandeau n'a plus qu'un bouton « Menu » (icône burger, croix quand il est ouvert,
  44 px). Il déploie un panneau sous le bandeau avec les tuiles **Glossaire** et **Dossier patient** (visible dès la section 1, comme
  l'onglet) puis le **Sommaire** replié par section. Se referme par un clic en dehors, Échap ou le choix d'un écran ; le focus revient au
  burger à la fermeture d'une fenêtre. De 768 à 1023 px, le bandeau garde les boutons « Glossaire », « Dossier patient » et « Sommaire ».
- **≥ 1024 px** : **panneau de gauche** (`.app-sidebar--toc`) : logo, titre, pastilles (durée, étapes,
  questions, calculées), **frise de progression** (coche verte = terminé, point bleu = écran actuel,
  cercle gris = verrouillé ; l'état est aussi écrit pour les lecteurs d'écran), carte d'aide (`help`).
  Au centre : fil d'Ariane (`storyTitle › kicker › title`) + pastille « n / total », contenu (46rem).
- **Dossier patient** : le bouton / l'onglet n'est disponible qu'**à partir de la section 1** (`patientFile.availableFrom: "1-1"`) :
  absent sur le courrier et l'accueil, il réapparaît si l'on revient sur un écran d'avant. Le bloc de la scène du courrier
  annonce : « Dès que vous commencerez à remplir le formulaire… ».
- **Dossier patient (≥ 1024 px)** : **fermé par défaut**. Un **onglet « Dossier patient »** horizontal (vignette + icône + libellé)
  dépasse du bord droit en haut (`#folder-tab`) ; il ouvre une **chemise cartonnée** (`.folder` : onglet titre, fiche papier
  inclinée avec trombone, photo « agrafée », tampon « Confidentiel » décoratif). L'état ouvert/fermé
  **se conserve d'un écran à l'autre** et après rechargement (`localStorage`, clé
  `dossier-ouvert:<id>`, préférence d'affichage propre au navigateur). Fermeture : bouton ou Échap,
  le focus revient à l'onglet. ≥ 1280 px : la chemise ouverte occupe une 3ᵉ colonne ; 1024–1279 px :
  elle s'ouvre par-dessus le contenu. < 1024 px : bouton du bandeau → fenêtre (inchangé).
- **≥ 1440 px** : tout grandit progressivement (taille de base 16 px à 1440 px → 20 px max vers 2560 px,
  relative à la taille choisie dans le navigateur) ; **colonnes latérales** : sommaire à gauche 17,5 rem (≥ 1024 px), 18,5 rem (≥ 1440 px), 20 rem (≥ 1920 px) ; dossier patient à droite 21 / 22 / 24 rem ; contenu 46 rem (50 rem dès 1920 px).
- Le sommaire est rendu deux fois (menu `#toc-list` et colonne `#toc-side-list`), une seule
  version visible à la fois. **Allègement de l'interface (20.10.2026, « trop d'information »)** : le sommaire est **replié
  par section** : une rubrique par section (anneau de progression, surtitre « SECTION 2 » + nom, « 3/8 », chevron), une seule
  ouverte à la fois, celle de l'écran affiché ; `tocItems` ;
  les pastilles durée / étapes / questions ne s'affichent qu'à l'accueil ; un seul indicateur de progression (pastille
  « n / total ») ; l'en-tête n'affiche plus que le fil rouge (le surtitre et le titre sont dans l'écran) ; l'extrait du
  formulaire d'une scène tient sur **une ligne d'en-tête** (`formSheet(..., { compact: true })`) ; l'illustration latérale
  est plus petite ; le message « Vous reprenez le module… » est une **bulle qui disparaît seule** après 5 s (`setNotice` ;
  seule l'erreur de connexion reste en bandeau). Les illustrations JPEG se fondent dans la page (`mix-blend-mode: multiply`).
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
docs/rise/                 version Rise 360 : prompt pour Claude dans Chrome, plan, leçons générées (voir README.md du dossier)
scripts/export-rise.js     génère docs/rise/ depuis module.json (npm run export:rise)
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
npm run export:rise  # régénère le contenu de la version Rise 360 (docs/rise/)
```

Ajouter `?debug` à l'URL journalise aussi les appels SCORM quand une vraie API LMS est présente.

## Conventions

- **« office AI » toujours en minuscule** dans le contenu (« l'office AI », « de l'office AI »), sauf quand le mot ouvre une
  phrase ou une ligne (signature, terme du glossaire) ; le nom complet « Office de l'assurance-invalidité pour le canton de
  Vaud » garde sa majuscule.
- **Jamais de texte vertical ou pivoté de côté** dans l'interface (pas de `writing-mode: vertical-*`,
  pas de libellé tourné à 90°), même pour un onglet latéral.

- Échapper systématiquement le contenu injecté dans le DOM (pas d'`innerHTML` sur du texte brut
  non échappé). Le formatage autorisé dans le JSON est limité (gras, italique, listes, liens).
- Pas de `console.log` hors mode debug.
- Tester au clavier seul et à 320 px de large avant toute livraison.
