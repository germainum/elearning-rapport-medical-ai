# Storyboard : « Remplir le rapport médical du médecin traitant »

**Statut : proposition à valider par l'OAI Vaud.** Les erreurs fréquentes, leurs conséquences et les
délais ci-dessous sont des hypothèses de travail. Tout ce qui est marqué ⚠ doit être confirmé ou
corrigé par un médecin SMR ou un·e gestionnaire de l'OAI avant production.

**Confirmé par la vidéo officielle de l'OAI** (voir `docs/source-video-oai.md`) : le rôle du médecin
traitant (première source, 87 % des décisions en 2021), le cadre légal (conséquences durables dans
l'activité habituelle et dans une activité adaptée), les cinq besoins de l'Office AI, l'importance
des éléments cliniques objectifs, et le fait qu'un rapport précis évite des expertises. Restent ⚠ :
le cas fictif, les bonnes réponses détaillées et les délais.

- **Objectif** : à la fin du module, le médecin généraliste sait remplir le formulaire 002.099 MT de
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
