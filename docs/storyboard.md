# Storyboard : « Remplir le rapport médical AI » (formulaire 002.099)

> **14.10.2026 : la formation suit désormais le « Rapport médical somatique : Réadaptation
> professionnelle / Rente » (002.099, 6 pages).** Voir la dernière section. Les sections plus anciennes
> décrivent l'ancienne version fondée sur le 002.099 MT (questions 1 à 12) et restent pour l'historique.

**Statut : proposition à valider par l'OAI Vaud.** Les erreurs fréquentes, leurs conséquences et les
délais ci-dessous sont des hypothèses de travail. Tout ce qui est marqué ⚠ doit être confirmé ou
corrigé par un médecin SMR ou un·e gestionnaire de l'OAI avant production.

**Confirmé par la vidéo officielle de l'OAI** (voir `docs/source-video-oai.md`) : le rôle du médecin
traitant (première source, 87 % des décisions en 2021), le cadre légal (conséquences durables dans
l'activité habituelle et dans une activité adaptée), les cinq besoins de l'Office AI, l'importance
des éléments cliniques objectifs, et le fait qu'un rapport précis évite des expertises. Restent ⚠ :
le cas fictif, les bonnes réponses détaillées et les délais.

- **Objectif** : à la fin du module, le médecin généraliste sait remplir le formulaire 002.099 de
  façon à ce que l'OAI puisse décider sans le relancer.
- **Public** : médecins généralistes installés dans le canton de Vaud.
- **Durée visée** : 12 à 15 minutes.
- **Fil rouge** : un cas fictif, de la réception de la demande jusqu'à l'envoi du rapport.
  Chaque scène correspond à une ou plusieurs questions du formulaire.
- **Bandeau** : « Rapport de Mme R. · question 4 / 12 », pas d'horloge.
- **Feedback** : une mauvaise réponse montre sa **conséquence concrète** pour le dossier et pour la
  patiente, à la manière de Pathogen Patrol.

## Cas fictif : Mme R., 47 ans ⚠ à valider

- Aide-soignante en EMS à 80 % depuis 15 ans : port de charges, mobilisation de résidents,
  horaires irréguliers.
- Lombosciatalgie droite chronique sur hernie discale L5-S1, opérée il y a 8 mois.
  Douleurs résiduelles.
- En incapacité de travail depuis 9 mois, certificats successifs.
- Annonce déposée auprès de l'AI. L'OAI vous adresse le formulaire 002.099 MT.
- Hypertension artérielle traitée et bien contrôlée, sans lien avec la capacité de travail.

## Scènes

### 0. Introduction (type `text`)
Pourquoi ce rapport compte : c'est sur lui que l'OAI s'appuie pour choisir entre mesures de
réinsertion, réadaptation et examen du droit à la rente. Un rapport précis = une décision plus rapide
pour votre patiente.
Bouton d'action : **« Ouvrir le courrier de l'OAI »**

### 1. Le courrier de l'OAI (type `scene`)
- Bloc « document » : courrier d'accompagnement fictif et en-tête du formulaire.
- Bloc « dossier patient » : synthèse du dossier de Mme R.
- Question : *À quoi sert ce rapport pour l'OAI ?*
  - ✔ Établir, d'un point de vue médical, ce que Mme R. peut encore faire et à quelles conditions
  - ✘ Appuyer la demande de rente de votre patiente
  - ✘ Remplacer les certificats d'incapacité de travail
- Conséquence (incorrect) ⚠ : un rapport rédigé comme un plaidoyer est moins exploitable
  et conduit plus souvent à une demande de complément.

### 2. Diagnostics (question 1)
- Bloc « extrait du formulaire » : question 1 avec ses lignes « depuis : ».
- Question : *Quels diagnostics inscrivez-vous ?* (choix multiple)
  - ✔ Lombosciatalgie droite chronique sur hernie discale L5-S1, opérée le …, depuis le …
  - ✘ Hypertension artérielle traitée
  - ✘ « Douleurs dorsales »
- Message clé : seuls les diagnostics **précis**, **datés** et **ayant une répercussion sur la
  capacité de travail**.

### 3. Anamnèse, status et traitements (questions 2 et 3)
- Question : *Quels éléments sont utiles à l'OAI ?* (choix multiple)
  - ✔ Status objectif récent (mobilité lombaire, Lasègue, examen neurologique)
  - ✔ Traitement actuel et observance (physiothérapie 2×/semaine suivie, antalgiques)
  - ✘ « La patiente se plaint beaucoup »
- Conséquence (incorrect) ⚠ : sans status objectif, l'OAI ne peut pas apprécier les limitations,
  et l'avis du SMR est retardé.

### 4. Limitations fonctionnelles (question 4) : scène centrale
- Bloc « extrait du formulaire » : question 4, champ vide.
- Question : *Quelle formulation choisissez-vous ?*
  - ✘ « Lombalgies chroniques invalidantes »
    *(c'est un diagnostic, pas une limitation)*
  - ✘ « Ne peut pas travailler »
    *(c'est une conclusion, sans élément exploitable)*
  - ✔ « Pas de port de charges > 5 kg, pas de travail penché en avant ni en torsion, alternance
    assis/debout toutes les 30 à 45 minutes, marche limitée à 20 minutes »
- Conséquence (incorrect) ⚠ : *« Six semaines plus tard… L'OAI vous adresse une demande de
  précisions. Faute de limitations concrètes, aucune activité adaptée n'a pu être définie pour
  Mme R. »*

### 5. Capacité de travail (questions 5, 6 et 7)
- Message : l'activité **habituelle** et une activité **adaptée** aux limitations sont deux questions
  distinctes.
- Question : *Comment remplissez-vous les deux champs ?*
  - ✔ Habituelle : 0 % depuis le … / Adaptée : 50 % depuis le …, avec les raisons à la question 7 ⚠
  - ✘ « 0 % dans toute activité » sans justification
  - ✘ Ne remplir que l'activité habituelle
- Conséquence (incorrect) ⚠ : l'OAI ne peut pas évaluer les possibilités de réadaptation, et un
  examen complémentaire est demandé.

### 6. Mesure de réinsertion (questions 8 et 9)
- Bloc « à retenir » : le texte de la question 8, cité tel quel.
- Question : *Mme R. suit de la physiothérapie. Existe-t-il une contre-indication à une mesure de
  réinsertion ?*
  - ✘ « Oui : elle est encore en traitement »
  - ✔ « Non. Une mesure aurait été possible depuis le … »
- Conséquence (incorrect) ⚠ : la réinsertion est différée alors que les chances de reprise diminuent
  avec la durée de l'arrêt.

### 7. Pronostic et incapacités attestées (questions 10 et 11)
- Question : pronostic avec taux et délai, plutôt que « réservé ».
- Question : reporter les périodes d'incapacité avec dates et taux précis, cohérents avec les
  certificats.
- Conséquence (incorrect) ⚠ : des incohérences avec les certificats entraînent des questions
  supplémentaires.

### 8. Envoi du rapport (pied du formulaire)
- Rappel : joindre les rapports de spécialistes et d'examens (case à cocher), puis date, timbre et
  signature.

### 9. Synthèse (type `summary`)
Points clés ⚠ à valider :
1. Des diagnostics précis, datés, en lien avec la capacité de travail.
2. Des limitations fonctionnelles concrètes et mesurables, et non des diagnostics.
3. Deux capacités de travail distinctes : activité habituelle et activité adaptée, chacune datée.
4. Une mesure de réinsertion n'est pas une thérapie : signalez dès quand elle est possible.
5. Un pronostic chiffré et les pièces jointes.

## À fournir par l'OAI

- Confirmation ou correction du cas fictif et des bonnes réponses.
- Les erreurs réellement les plus fréquentes dans les rapports reçus, et leurs conséquences réelles :
  relance, délai, examen SMR, expertise.
- Les messages clés définitifs.
- Le logo et la charte, s'ils doivent apparaître.

## Ajouts du 14.10.2026 (suite à la review) ⚠ à valider

- **Distracteurs** réécrits à partir d'erreurs plausibles (formulation vague, conclusion au lieu de
  limitation, date manquante, confusion activité habituelle / adaptée) ; longueurs équilibrées.
  ⚠ À remplacer idéalement par les erreurs **réellement** observées dans les rapports reçus.
- **Exercices de rédaction** (non notés) : limitations de Mme R. et de M. B., avec exemple et grille.
- **Second cas, atteinte psychique** : M. B., 41 ans, gestionnaire de dossiers, épisode dépressif
  moyen (F32.1), arrêt à 100 % depuis le 16.03.2026. ⚠ Cas, limitations modèles et conséquence
  (« interroger le psychiatre, voire ordonner une expertise ») à valider.
- **Notion « exigible »** expliquée dans l'écran capacité de travail. ⚠ Définition à valider.
- **Écran « En pratique »** ⚠ chaque point à confirmer par l'OAI :
  - délai : « figure dans le courrier » — préciser le délai habituel ;
  - secret médical : autorisation donnée par l'assuré lors de la demande (art. 6a LAI) — vérifier
    la référence et la formulation ;
  - portail MedAI (portal-medai.ch), repris de aivd.ch ;
  - rémunération : « rémunéré par l'AI, modalités indiquées par l'Office AI » — préciser le tarif.
- Points restants de la review : valider le 50 % en activité adaptée et le pronostic « 3 à 6 mois »
  (cas de Mme R.), crédits de formation continue avec Acamedia, test auprès de généralistes.

## Intégration de la FAQ « Corps médical » (14.10.2026)

Source officielle : `docs/source-faq-aivd.md`. **Confirmé** : MedAI (rapports en ligne 7 j/7, 24 h/24),
calcul de l'incapacité sur un 100 %, diagnostic ≠ degré d'incapacité, aptitude à la réadaptation
malgré l'incapacité, détection précoce, rapport actualisé si l'état évolue, formations AI Vaud–SVM
et CFAI, horaires de la centrale (lu–ve 8 h–17 h).
**Toujours ⚠** : délai de retour, rémunération du rapport, base légale du secret médical (art. 6a LAI).

## Intégration de l'atelier n°1 « Le rapport médical » (14.10.2026)

Source : `docs/source-atelier-rapport-medical.md` (atelier SMR du 05.09.2024). Ajouts :

- **Diagnostics** : code CIM-10 (M51.1 pour Mme R.), date de pose, classement selon l'impact.
  ⚠ Le code M51.1 est une proposition à valider par le SMR.
- **Anamnèse** : encadré « à quoi elle sert pour le médecin du SMR » (cohérence diagnostics / status).
- **Capacité** : encadré « Connaître le poste réel » (cahier des charges) ; dossier de Mme R. complété
  par son poste. ⚠ Le 002.099 MT n'a pas de rubrique dédiée : on propose de décrire le poste à la
  question 7. À confirmer.
- **Pronostic** : encadré « À qui sert le pronostic ? » (gestionnaire de rente, conseiller en
  réadaptation, SMR ni trop tôt ni trop tard). ⚠ L'atelier parle de tendance favorable / défavorable,
  le formulaire de taux et de délai : le module demande les deux. À trancher.
- **Incapacités attestées** : encadré sur le délai d'attente (40 % en moyenne pendant un an, sans
  interruption notable), les interruptions et la rente limitée dans le temps ; taux sur 100 %.
- **Troisième cas, M. C.** (cas pratique de l'atelier) : menuisier chef d'équipe, arthrose du poignet
  droit, épicondylite, état dépressif réactionnel, contexte de divorce et de précarité. Deux questions :
  limitations (dont l'erreur « symptôme au lieu de limitation », écho à l'exemple du genou) et place
  du contexte psychosocial (anamnèse oui, motif d'incapacité non). ⚠ Formulations à valider.
- **Synthèse** : les **3 piliers** (diagnostic, limitations, capacité de travail) et le psychosocial.
- Durée portée à 25 minutes (13 écrans, 13 questions).

## Restructuration sur le formulaire 002.099 complet (14.10.2026) ⚠ à valider

Source : `docs/formulaire-002099.md` (intitulés exacts). 14 écrans, 13 questions, ~25 minutes.

| Écran | Formulaire | Question notée |
|---|---|---|
| Courrier | aperçu complet (5 sections + 2 annexes) | À quoi sert le rapport |
| Informations générales | 1.1 à 1.3 | Périodes d'incapacité (1.3) |
| Antécédents, symptômes, constats | 2.1 à 2.4 | Constats objectifs et médication avec dosage |
| Diagnostics | 2.5 et 2.6 | Avec incidence (2.5) / sans incidence (2.6 : l'hypertension) |
| Pronostic et plan de traitement | 2.7 et 2.8 | Pronostic sur 100 % |
| Situation professionnelle | 3.1 à 3.3 | Exigences du poste (3.3) |
| Limitations | 3.4 + annexe des travaux exigibles | Formulation mesurable |
| Potentiel de réadaptation | 4.1 à 4.5 (+ 3.5, 3.6 en encadré) | Heures par jour, habituelle / adaptée |
| Aptitude à la réadaptation | annexe page 6 | Contre-indication à une mesure de réinsertion |
| Relecture | annexes, section 5 « Divers » | Pièces jointes, usage de « Divers » |
| Second cas : M. C. | 3.4, 2.1, 4.4 | Limitations ; place du contexte psychosocial |

- **Supprimé** : le cas de M. B. (atteinte psychique), le formulaire étant **somatique**. Les capacités
  psychiques restent abordées par l'annexe des travaux exigibles (concentration, compréhension,
  adaptation, résistance) et l'état dépressif réactionnel de M. C.
- **Dossier de Mme R. complété** pour les nouvelles questions : suivi mensuel, chirurgien orthopédiste,
  poste en rotation d'équipes, langues (français, portugais), famille, voiture.
- ⚠ **Réponses modèles à valider** : 1.1–1.3, 2.1–2.8 (HTA codée I10 en 2.6), 3.1–3.4, annexe des
  travaux exigibles (4 h/jour, 5 kg, etc.), 4.1–4.5 (4 h par jour = 50 % sur un 100 %), annexe réadaptation.
- ⚠ **4.5 tâches ménagères** : l'encadré dit que pour une personne à temps partiel l'Office AI tient
  aussi compte des empêchements dans le ménage (méthode mixte). Formulation à confirmer.
- ⚠ **4.4 obstacles** : le module admet d'y signaler le contexte psychosocial s'il freine la
  réadaptation, sans en faire une limitation. À confirmer.
- ⚠ **3.6 capacité de conduire** : encadré seulement, pas de question. À compléter si l'OAI le souhaite.
- La page 5 n'a pas de titre sur le formulaire : le module l'appelle « Annexe : travaux exigibles dans
  une activité adaptée ».

## Point par point (14.10.2026) ⚠ à valider

Demande : « aller point par point, avec à chaque fois 3 possibilités pour répondre ; trop d'info par écran ».

- **Un écran par point du formulaire** : 1.1 → 4.5, section 5, pièces jointes, annexe des travaux exigibles
  (ligne « soulever/porter »), annexe réadaptation (1 contre-indication, 2 pronostic d'amélioration).
- Chaque écran : extrait vide → **une question, 3 réponses, choix unique** → feedback de conséquence → réponse remplie.
- Les encadrés « À retenir » sont supprimés ; leur contenu passe dans les feedbacks.
- M. C. : 2 écrans (3.4 limitations, 2.1 contexte psychosocial). En pratique : 3 écrans-questions
  (envoi MedAI, secret médical art. 6a LAI, détection précoce). La rémunération et le rapport actualisé
  ne sont plus présentés (⚠ à réintégrer si l'OAI le souhaite).
- 35 écrans, 33 questions, ~35 minutes. ⚠ Durée à discuter avec Acamedia (crédits).
- ⚠ Toutes les réponses modèles et tous les distracteurs sont des propositions à valider par le SMR.
