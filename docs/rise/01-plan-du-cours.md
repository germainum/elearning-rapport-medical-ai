# Plan du cours Rise 360 — « Le rapport médical AI »

Version 2 du module, construite dans **Articulate Rise 360** à partir du même contenu que le module SCORM
(`content/module.json`). Rise impose ses propres blocs : ce plan dit ce qui est repris tel quel et ce qui
change. Les textes sont dans les fichiers `lecons/NN-*.md`, `evaluation-finale.md` et `glossaire.md`.

## 1. Réglages du cours

| Réglage | Valeur |
|---|---|
| Titre | **Le rapport médical AI** |
| Sous-titre / description | Remplir le rapport médical somatique de l'AI (formulaire 002.099), point par point, à partir d'un cas fictif. Durée : environ 45 minutes. |
| Langue du cours | **Français** (réglage de langue du cours : les libellés de Rise, comme « Continuer », passent en français) |
| Auteur | Office AI du canton de Vaud |
| Couleur d'accentuation | **#0F1D96** (bleu marine AI VD). Le vert **#009628** est réservé aux accents graphiques. |
| Police | Work Sans si elle est proposée, sinon Arial. Ne pas chercher à contourner. |
| Logo | `content/images/logo-aivd.png` (texte alternatif : « AI VD – Office de l'assurance-invalidité pour le canton de Vaud ») |
| Image de couverture | `content/images/cabinet-courrier.jpg` |
| Navigation | **Restreinte** (leçon après leçon, comme dans le module SCORM). La leçon Glossaire est la 2ᵉ pour rester accessible tôt. |
| Menu latéral | Affiché, avec les sections ci-dessous |

## 2. Ordre des leçons

Chaque ligne est une **leçon** ; les en-têtes en gras sont des **sections** (séparateurs du plan du cours).

<!-- LECONS:DEBUT -->
| N° | Leçon Rise | Fichier de contenu | Blocs | Pratique |
|---|---|---|---|---|
| | **Avant de commencer** | | | |
| 1 | Votre rapport, pièce maîtresse du dossier AI | `lecons/01-bienvenue.md` | 6 |  |
| 2 | Glossaire (leçon facultative) | `glossaire.md` | 12 |  |
| 3 | Un courrier de l'office AI | `lecons/02-courrier.md` | 6 | 1 |
| | **Section 1 · Informations générales** | | | |
| 4 | Section 1 · Informations générales | `lecons/03-section-1.md` | 15 | 2 |
| | **Section 2 · Situation médicale** | | | |
| 5 | Section 2 · Antécédents, symptômes, médication et constats | `lecons/04-section-2a.md` | 19 | 3 |
| 6 | Section 2 · Diagnostics, pronostic et plan de traitement | `lecons/05-section-2b.md` | 21 | 2 |
| | **Section 3 · Situation professionnelle** | | | |
| 7 | Section 3 · La situation professionnelle | `lecons/06-section-3a.md` | 15 | 2 |
| 8 | Section 3 · Limitations, ressources et conduite | `lecons/07-section-3b.md` | 15 | 2 |
| | **Section 4 · Potentiel de réadaptation** | | | |
| 9 | Section 4 · Potentiel de réadaptation | `lecons/08-section-4.md` | 25 | 3 |
| | **Section 5 et annexes** | | | |
| 10 | Section 5 et annexes | `lecons/09-section-5-annexes.md` | 25 | 3 |
| | **Second cas** | | | |
| 11 | Second cas : M. C. | `lecons/10-second-cas.md` | 6 |  |
| | **En pratique** | | | |
| 12 | En pratique | `lecons/11-en-pratique.md` | 9 | 3 |
| | **Évaluation** | | | |
| 13 | Évaluation finale (leçon Quiz notée) | `evaluation-finale.md` | 12 questions |  |
| | **Conclusion** | | | |
| 14 | Ce qu'il faut retenir | `lecons/12-retenir.md` | 3 |  |
| 15 | Merci | `lecons/13-merci.md` | 3 |  |
<!-- LECONS:FIN -->

« Pratique » = exercices de **Contrôle des connaissances** (non notés). Les 12 questions de l'**évaluation finale**
sont les seules notées.

## 3. Types de blocs Rise (noms anglais / français)

| Dans les fichiers de leçon | Bloc Rise (EN / FR) | Remarque |
|---|---|---|
| Titre | Heading / Titre (catégorie *Texte*) | |
| Texte | Paragraph / Paragraphe | Appliquer le gras, l'italique, les listes avec l'éditeur. |
| Déclaration, style « Note » | Statement / Déclaration (style *Note*) ; à défaut, Quote / Citation | Sert pour l'extrait du formulaire et la lettre reçue. |
| Image | Image | Saisir le **texte alternatif** indiqué, sans le modifier. |
| Vidéo | Video / Vidéo (téléverser le MP4) | Ajouter les sous-titres `.vtt`, langue français. |
| Pièce jointe | Attachment / Pièce jointe | PDF du formulaire 002.099. |
| Accordéon | Accordion / Accordéon (catégorie *Interactif*) | |
| Processus | Process / Processus (catégorie *Interactif*) | Une étape par élément. |
| Liste numérotée | Numbered list / Liste numérotée | |
| Contrôle des connaissances · Choix multiple | Knowledge check / Contrôle des connaissances → Multiple choice / Choix multiple | Une seule bonne réponse. Non noté. |

Si un type de bloc n'existe pas dans votre version de Rise, prendre l'alternative la plus proche et la noter dans
le compte rendu.

## 4. Leçons « Quiz » et « Glossaire »

- **Évaluation finale** : ajouter une leçon de type **Quiz** (menu *Ajouter une leçon → Quiz*), nommée « Évaluation finale ».
  Y créer les 12 questions de `evaluation-finale.md`, dans l'ordre. Réglages du quiz : seuil de réussite **70 %**,
  nouvelles tentatives autorisées, retour affiché après chaque question, ordre des questions et des réponses aléatoire.
- **Glossaire** : une leçon de contenu « Glossaire », contenu dans `glossaire.md` (6 rubriques, 43 termes, en accordéons).

## 5. Ce qui change par rapport au module SCORM

| Module SCORM | Version Rise |
|---|---|
| Dossier patient ouvrable à tout moment sur le côté | Accordéon « Dossier de Mme R. (rappel) » en tête de chaque leçon de pratique |
| Lettre reçue avec enveloppe et timbre | Bloc *Note* (texte de la lettre) + pièce jointe PDF |
| Extrait du formulaire stylisé | Bloc *Note* avec l'intitulé exact du formulaire |
| 33 questions, toutes notées | **21** exercices de pratique non notés + **12** questions notées (points clés et cas de M. C.), voir ci-dessous |
| Retour distinct pour chaque mauvaise réponse | Un seul retour pour les mauvaises réponses : la conséquence, puis les remarques sur chaque réponse écartée |
| Révision guidée des questions fausses (question par question) | Non disponible : Rise relance le quiz entier à chaque nouvelle tentative |
| Vidéo lancée seule à la 8ᵉ seconde | Non disponible dans Rise : la vidéo démarre à zéro, sans lecture automatique (les premières secondes n'ont pas de sous-titres) |
| Glossaire avec recherche | Leçon de glossaire en accordéons (pas de recherche) |
| Lettre, dossier et illustrations animés ou inclinés | Statique, dans les limites des blocs Rise |

**Pourquoi 12 questions notées et pas 33 :** Rise ne note que les leçons Quiz. Les points clés (diagnostics, limitations,
capacité de travail) sont donc **enseignés par un exemple rempli** dans les leçons, puis **évalués** dans le quiz. Les
deux questions sur M. C. testent le transfert sur un cas nouveau. Les autres points restent des exercices de pratique,
avec retour, sans note.

## 6. Publication (à faire par une personne, pas par l'assistant)

1. Vérifier l'aperçu de quelques leçons sur ordinateur et sur mobile.
2. *Publier* → **LMS** → **SCORM 1.2** (version attendue par MOS Chorus). Reporter la réussite sur le quiz, seuil 70 %.
   Les libellés exacts de cet écran varient selon la version de Rise : à vérifier à l'écran.
3. Tester le paquet sur **SCORM Cloud**, puis sur Chorus, avant de le donner à Acamedia.
