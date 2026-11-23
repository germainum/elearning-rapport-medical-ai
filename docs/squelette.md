# Squelette de l'e-learning : « Le rapport médical AI »

> Généré le 23 novembre 2026 depuis `content/module.json` (version 0.151.1) : **ne pas modifier à la main**, relancer `npm run export:squelette`.
> Le scénario d'origine et son historique restent dans `docs/storyboard.md`.

## En bref

- **Public** : médecins généralistes vaudois (formation continue, plateforme Acamedia).
- **Formulaire travaillé** : rapport médical somatique, réadaptation professionnelle / rente (002.099, v. 09.2023).
- **Durée** : environ 45 minutes · **42 écrans** · **33 questions** (une question à choix unique par écran de formulaire).
- **Réussite** : seuil de 70 %, reprise possible des questions fausses. Seule la première réponse compte.
- **Fil rouge** : un cas fictif (Mme R., 47 ans, aide-soignante en EMS) ; second cas (M. C.) pour s'entraîner.

## Objectifs

À la fin de la formation, le médecin sait :

1. Décrire l'état de santé : constats objectifs, diagnostics précis, datés et classés selon leur incidence
1. Attester l'incapacité de travail avec des périodes et des taux exacts
1. Cerner le poste réel et formuler des limitations mesurables
1. Chiffrer deux capacités de travail distinctes, le pronostic et l'aptitude à la réadaptation
1. Séparer le médical du psychosocial et connaître les démarches : pièces jointes, MedAI, secret médical, détection précoce

## Le parcours en un coup d'œil

| Ensemble | Section | Écrans | Questions |
|---|---|---|---|
| Démarrage | Introduction | 1 à 3 |  |
| Démarrage | Le cas de Mme R. | 4 à 6 | 1 |
| Le formulaire 002.099 | Section 1 · Informations générales | 7 à 9 | 3 |
| Le formulaire 002.099 | Section 2 · Situation médicale | 10 à 17 | 8 |
| Le formulaire 002.099 | Section 3 · Situation professionnelle | 18 à 23 | 6 |
| Le formulaire 002.099 | Section 4 · Potentiel de réadaptation | 24 à 28 | 5 |
| Le formulaire 002.099 | Section 5 · Divers et annexes | 29 à 33 | 5 |
| S'entraîner | Le cas de M. C. | 34 à 35 | 2 |
| S'entraîner | Au cabinet | 36 à 38 | 3 |
| Pour finir | Votre résultat | 39 |  |
| Pour finir | Trois mois plus tard | 40 |  |
| Pour finir | Votre avis (facultatif) | 41 |  |
| Pour finir | Merci | 42 |  |

## Le détail, écran par écran

### Démarrage

#### Démarrage · Introduction

1. **Remplir le rapport médical AI, point par point** (`introduction` · texte)
   - Accroche : Cette formation en ligne vous fait remplir le rapport d'une patiente, une question à la fois, avec un retour immédiat à chaque réponse. Un rapport pr…
2. **Ce que vous allez apprendre** (`objectifs` · texte)
   - Accroche : Comptez environ 45 minutes. Vous pouvez interrompre le module et le reprendre plus tard.
3. **Comment se déroule la formation** (`parcours` · texte)
   - Accroche : Vous remplissez le rapport de Mme R. en cinq étapes, du courrier de l'office AI à la décision.

#### Démarrage · Le cas de Mme R.

4. **Un courrier de l'office AI** (`courrier` · scène)
   - Accroche : Lundi matin, parmi le courrier du cabinet, une enveloppe de l'office AI du canton de Vaud. Elle concerne Mme R., que vous suivez depuis des années.
5. **Le dossier de Mme R.** (`dossier-mme-r` · scène)
6. **Le rôle de votre rapport** (`but-rapport` · scène · 1 question)
   - Accroche : Avant de remplir quoi que ce soit, une question : qu'attend l'office AI de votre rapport ?
   - Question : À quoi sert ce rapport pour l'office AI ?

### Le formulaire 002.099

#### Section 1 · Informations générales

7. **Le traitement dispensé** (`1-1` · scène · 1 question)
   - Point du formulaire : 1.1 · Le traitement ambulatoire / hospitalier que vous avez dispensé a eu lieu
   - Accroche : Vous ouvrez le formulaire à côté du dossier de Mme R. La première question porte sur votre suivi.
   - Question : Que reportez-vous pour Mme R. ?
   - Astuce affichée une fois : Deux outils sous la main
8. **La fréquence des consultations** (`1-2` · scène · 1 question)
   - Point du formulaire : 1.2 · A quelle fréquence voyez-vous le patient / la patiente actuellement ?
   - Accroche : Vous feuilletez vos consultations avec Mme R. pour répondre juste.
   - Question : Que reportez-vous pour Mme R. ?
9. **L'incapacité de travail attestée** (`1-3` · scène · 1 question)
   - Point du formulaire : 1.3 · Quelle est, jusqu'à aujourd'hui, l'évolution de l'incapacité de travail attestée médicale…
   - Accroche : Reste l'arrêt de travail que vous avez établi en janvier.
   - Question : Que reportez-vous pour Mme R. ?

#### Section 2 · Situation médicale

10. **Antécédents et évolution** (`2-1` · scène · 1 question)
   - Point du formulaire : 2.1 · Antécédents médicaux et évolution de la situation du patient/de la patiente
   - Accroche : Le 5 octobre, vous avez revu Mme R. en consultation. Vous reprenez son dossier.
   - Question : Que reportez-vous pour Mme R. ?
11. **Situation et symptômes actuels** (`2-2` · scène · 1 question)
   - Point du formulaire : 2.2 · Situation et symptômes médicaux actuels
   - Accroche : Vous repensez à la dernière consultation : ce que Mme R. vous a dit de ses douleurs.
   - Question : Que reportez-vous pour Mme R. ?
12. **La médication actuelle** (`2-3` · scène · 1 question)
   - Point du formulaire : 2.3 · Médication actuelle (y compris le dosage)
   - Accroche : Vous vérifiez ce que Mme R. prend réellement contre la douleur.
   - Question : Que reportez-vous pour Mme R. ?
13. **Les constats médicaux** (`2-4` · scène · 1 question)
   - Point du formulaire : 2.4 · Constats médicaux complets sur la base des examens que vous avez pratiqués
   - Accroche : Vous reprenez vos notes de l'examen clinique du 5 octobre.
   - Question : Que reportez-vous pour Mme R. ?
14. **Diagnostics avec incidence** (`2-5` · scène · 1 question)
   - Point du formulaire : 2.5 · Diagnostics ayant une incidence sur la capacité de travail
   - Accroche : Dans tout ce parcours, vous cherchez ce qui empêche vraiment Mme R. de travailler.
   - Question : Que reportez-vous pour Mme R. ?
15. **Diagnostics sans incidence** (`2-6` · scène · 1 question)
   - Point du formulaire : 2.6 · Diagnostics sans incidence sur la capacité de travail
   - Accroche : Vous relisez la liste de ses autres problèmes de santé, un par un.
   - Question : Que reportez-vous pour Mme R. ?
16. **Le pronostic** (`2-7` · scène · 1 question)
   - Point du formulaire : 2.7 · Votre pronostic sur la capacité de travail du patient/de la patiente sur un taux de 100%
   - Accroche : L'office AI voudra savoir où en sera Mme R. dans quelques mois.
   - Question : Que reportez-vous pour Mme R. ?
17. **Le plan de traitement** (`2-8` · scène · 1 question)
   - Point du formulaire : 2.8 · Prochaines mesures que vous envisagez / votre plan de traitement (thérapies, opérations c…
   - Accroche : Et maintenant ? Vous réfléchissez à la suite de sa prise en charge.
   - Question : Que reportez-vous pour Mme R. ?

#### Section 3 · Situation professionnelle

18. **L'activité actuelle** (`3-1` · scène · 1 question)
   - Point du formulaire : 3.1 · Quelle est l'activité actuelle de votre patient / votre patiente ?
   - Accroche : Vous passez à sa vie professionnelle : à quoi ressemblent aujourd'hui ses journées ?
   - Question : Que reportez-vous pour Mme R. ?
19. **La situation professionnelle** (`3-2` · scène · 1 question)
   - Point du formulaire : 3.2 · Quelles sont les informations dont vous disposez sur la situation professionnelle de votr…
   - Accroche : Vous vous rappelez ce que Mme R. vous a dit de son employeur.
   - Question : Que reportez-vous pour Mme R. ?
20. **Les exigences du poste** (`3-3` · scène · 1 question)
   - Point du formulaire : 3.3 · A quelles exigences votre patient/patiente doit-il/elle faire face dans son activité prof…
   - Accroche : C'est l'une des questions les plus importantes pour le médecin du SMR : elle permet de comparer le poste réel et les limitations.
   - Question : Que reportez-vous pour Mme R. ?
21. **Les limitations fonctionnelles** (`3-4` · scène · 1 question)
   - Point du formulaire : 3.4 · Existe-t-il des limitations fonctionnelles ? Quels effets ont-elles sur l'activité que le…
   - Accroche : La question décisive : une limitation décrit ce que la personne ne peut plus faire, de façon mesurable, sans répéter le diagnostic.
   - Question : Que reportez-vous pour Mme R. ?
22. **Les ressources** (`3-5` · scène · 1 question)
   - Point du formulaire : 3.5 · Votre patient/votre patiente dispose-t-il/elle de ressources qui pourraient être utiles p…
   - Accroche : Mme R. a aussi des atouts : vous cherchez ce qui pourrait l'aider à rebondir.
   - Question : Que reportez-vous pour Mme R. ?
23. **La capacité de conduire** (`3-6` · scène · 1 question)
   - Point du formulaire : 3.6 · Avez-vous des doutes quant à sa capacité de conduire ? Lesquels ?
   - Accroche : Elle se rend d'habitude au travail en voiture : peut-elle encore conduire ?
   - Question : Que reportez-vous pour Mme R. ?

#### Section 4 · Potentiel de réadaptation

24. **Heures par jour : l'activité habituelle** (`4-1` · scène · 1 question)
   - Point du formulaire : 4.1 · Combien d'heures de travail par jour peut-on raisonnablement attendre de votre patient/vo…
   - Accroche : Vous entrez dans la section clé : combien de temps Mme R. peut-elle travailler, chaque jour, dans son métier ?
   - Question : Que reportez-vous pour Mme R. ?
25. **Heures par jour : une activité adaptée** (`4-2` · scène · 1 question)
   - Point du formulaire : 4.2 · Combien d'heures de travail par jour peut-on raisonnablement attendre de votre patient/vo…
   - Accroche : Et si on lui proposait un poste adapté à ses limitations ?
   - Question : Que reportez-vous pour Mme R. ?
26. **Le potentiel de réadaptation** (`4-3` · scène · 1 question)
   - Point du formulaire : 4.3 · Votre pronostic sur le potentiel de réadaptation du patient/de la patiente. Capacité de t…
   - Accroche : Vous pensez à l'avenir : jusqu'où Mme R. pourra-t-elle reprendre ?
   - Question : Que reportez-vous pour Mme R. ?
27. **Les obstacles à la réadaptation** (`4-4` · scène · 1 question)
   - Point du formulaire : 4.4 · Quels sont les facteurs qui font obstacle à une réadaptation ?
   - Accroche : Quelque chose pourrait-il freiner son retour au travail ?
   - Question : Que reportez-vous pour Mme R. ?
28. **Les tâches ménagères** (`4-5` · scène · 1 question)
   - Point du formulaire : 4.5 · Dans quelle mesure votre patient/votre patiente est-il/elle limité/e dans l'accomplisseme…
   - Accroche : Mme R. travaille à 80 % : l'office AI tient aussi compte de ses empêchements dans les tâches ménagères.
   - Question : Que reportez-vous pour Mme R. ?

#### Section 5 · Divers et annexes

29. **Divers** (`5` · scène · 1 question)
   - Accroche : Vous arrivez à la section « Divers », un espace laissé à votre jugement.
   - Question : À quoi peut servir la section 5 ?
30. **Les documents à joindre** (`annexes` · scène · 1 question)
   - Accroche : Votre rapport est presque terminé : que faut-il y joindre ?
   - Question : Que reportez-vous pour Mme R. ?
31. **Les travaux exigibles** (`exigibles` · scène · 1 question)
   - Accroche : L'annexe traduit vos limitations en travaux encore exigibles, activité par activité : oui ou non, combien d'heures par jour, avec quel rendement.
   - Question : Comment remplissez-vous la ligne « soulever/porter » ?
32. **La mesure de réinsertion** (`reinsertion` · scène · 1 question)
   - Point du formulaire : 1 · Existe-t-il des contre-indications médicales à suivre une telle mesure ?
   - Accroche : L'office AI se demande si Mme R. pourrait déjà suivre une mesure de réinsertion.
   - Question : Mme R. suit encore de la physiothérapie. Existe-t-il une contre-indication médicale ?
33. **Le pronostic d'amélioration** (`amelioration` · scène · 1 question)
   - Point du formulaire : 2 · Quel est votre pronostic d'amélioration de la capacité de travail ?
   - Accroche : Il reste à dire jusqu'où, et en combien de temps, Mme R. peut encore progresser.
   - Question : Que reportez-vous pour Mme R. ?

### S'entraîner

#### Le cas de M. C.

34. **Les limitations de M. C.** (`mc-limitations` · scène · 1 question)
   - Point du formulaire : 3.4 · Existe-t-il des limitations fonctionnelles ? Quels effets ont-elles sur l'activité que le…
   - Accroche : L'office AI vous demande maintenant un rapport pour M. C., 46 ans.
   - Question : Que reportez-vous pour M. C. ?
35. **Le contexte psychosocial** (`mc-contexte` · scène · 1 question)
   - Point du formulaire : 2.1 · Antécédents médicaux et évolution de la situation du patient/de la patiente
   - Accroche : M. C. traverse un divorce difficile et sa situation financière est devenue très précaire.
   - Question : Que faites-vous du divorce et des difficultés financières dans le rapport ?

#### Au cabinet

36. **Envoyer le rapport** (`envoi` · scène · 1 question)
   - Accroche : Votre rapport est prêt. Il ne reste qu'à l'envoyer, avec les pièces utiles : par courrier ou en ligne, via MedAI.
   - Question : Comment pouvez-vous envoyer le rapport ?
37. **Le secret médical** (`secret` · scène · 1 question)
   - Accroche : Avant d'envoyer, un scrupule vous traverse : le secret médical.
   - Question : Pouvez-vous transmettre le rapport et les documents utiles sans nouvel accord de Mme R. ?
38. **La détection précoce** (`detection` · scène · 1 question)
   - Accroche : Un autre patient, en arrêt depuis des semaines, vous inquiète.
   - Question : Un patient est en arrêt de travail sans date de retour prévisible. Pouvez-vous le signaler à l'AI avant toute demande ?

### Pour finir

#### Votre résultat

39. **Ce qu'il faut retenir** (`synthese` · synthèse)
   - Accroche : Vos rapports sont toujours examinés attentivement : plus les informations sont précises et exhaustives, moins l'office AI doit recourir aux expertise…
   - Score, résultats par section, possibilité de revoir les questions fausses.

#### Trois mois plus tard

40. **Trois mois plus tard** (`epilogue` · texte)
   - Accroche : Janvier. Une enveloppe de l'office AI arrive au cabinet : la décision concernant Mme R.

#### Votre avis (facultatif)

41. **Votre avis sur la formation** (`avis` · avis)
   - Questionnaire de satisfaction en 3 étapes, facultatif, non noté.

#### Merci

42. **Merci pour votre engagement** (`merci` · texte)
   - Accroche : Vous avez pris le temps de suivre cette formation, malgré un agenda chargé. Merci beaucoup.

## Ce qui reste à valider par l'OAI

Textes rédigés pour le module, qui ne viennent pas tels quels d'un document officiel :

- les 27 réponses modèles écrites dans le formulaire et les conséquences décrites après une mauvaise réponse ;
- les phrases d'accroche qui ouvrent chaque écran du cas de Mme R. ;
- l'épilogue « Trois mois plus tard » (scénario plausible, pas un fait) ;
- les dossiers de Mme R. et de M. C. (cohérence clinique, codes CIM-10) ;
- le seuil de réussite, la durée annoncée et le questionnaire de satisfaction.

Le document Word `docs/relecture-elearning-v<version>.docx` (`npm run export:relecture`) sert à recueillir ces avis.
