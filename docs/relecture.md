# Version de relecture (commentaires dans l'interface)

Une version du module avec un bouton **Commenter** sur chaque écran, pour recueillir des retours avant publication.
Les commentaires sont gardés par un petit serveur et **partagés** entre tous les relecteurs.
**Rien de tout cela n'est dans le paquet SCORM livré à Acamedia** (`npm run build` ne contient ni le mode relecture ni appel réseau).

## Pour les relecteurs

1. Ouvrir le lien de la version de relecture avec **`?review`** à la fin de l'adresse (ex. `https://…/?review`), puis saisir le mot de passe commun.
2. Tous les écrans sont accessibles depuis **Parcours** (pas besoin de répondre aux questions pour avancer).
3. **Commenter** (en bas à gauche) : saisir son nom une fois, écrire le commentaire, « Envoyer ».
   Pour citer un passage, le sélectionner à l'écran avant d'ouvrir la fenêtre.
4. Onglet **Tous** : tous les commentaires classés par écran, filtre « À traiter / Résolus », « Aller à l'écran »,
   « Télécharger » ou « Copier » en Markdown (à coller dans un message, ou à donner à Claude pour corriger).

## Lancer en local (test)

```
npm run review      # construit avec le mode relecture et lance le serveur : http://localhost:8080/?review (mot de passe : review)
```

Les commentaires de test sont dans `review-data/` (ignoré par Git).

## Mettre en ligne chez Infomaniak (Jelastic)

L'image Docker est construite et publiée par GitHub à chaque push sur `main` (`.github/workflows/review-image.yml`) :
**`ghcr.io/germainum/formation-germain`** (étiquettes `latest`, `v<version>` et le numéro du commit).

Dans la console Jelastic, pour le nœud Docker :

1. **Image** : `ghcr.io/germainum/formation-germain:latest`.
   - Si le paquet GitHub est **privé**, renseigner les identifiants du registre (jeton GitHub avec la seule permission `read:packages`) ;
     sinon, rendre le paquet public dans GitHub (Paramètres du paquet › Visibilité).
2. **Variable d'environnement obligatoire** : `REVIEW_PASSWORD` = le mot de passe commun. À saisir dans la console uniquement,
   jamais dans le dépôt. Sans elle, le serveur refuse de démarrer.
3. **Volume** : monter un volume persistant sur **`/data`** (les commentaires y sont écrits : sans volume, ils disparaissent à chaque mise à jour).
   Le serveur tourne avec l'utilisateur de l'image (root) : si le volume est refusé en écriture, il l'indique dans les journaux.
4. **Port** : le conteneur écoute sur **8080** (variable `PORT` si besoin). Ouvrir ce port comme point de terminaison.
5. **HTTPS** : activer un certificat sur l'adresse publique (le mot de passe circule sinon en clair).
6. **Mise à jour** : après un push, redéployer le nœud avec l'étiquette `latest` (les commentaires restent sur le volume).

Sonde de santé (sans mot de passe, sans donnée) : `/api/review/health`.

## Récupérer les commentaires

- Depuis l'interface : onglet **Tous** › Télécharger (Markdown).
- Directement : `GET /api/review/export.md` (ajouter `?status=open` pour les seuls commentaires à traiter).
- Sur le volume : `/data/comments.json` (sauvegarde simple : copier ce fichier).

## Sécurité : ce qu'il faut savoir

- Un **mot de passe commun** protège tout le site (module compris) ; l'identifiant saisi est ignoré. Pour retirer l'accès à quelqu'un,
  changer le mot de passe.
- 20 essais ratés depuis la même adresse bloquent cette adresse 10 minutes. Derrière un répartiteur de charge qui ne transmet pas
  l'adresse du visiteur (`X-Forwarded-For`), tous les visiteurs partagent la même adresse : un malveillant pourrait alors bloquer les autres 10 minutes.
- Les écritures exigent un en-tête propre à l'application et refusent les requêtes venant d'un autre site.
- Le module n'utilise que des cas fictifs ; les commentaires contiennent le nom saisi par le relecteur et son texte. Ne pas y coller de données de patients réels.
- Non testé ici : la construction de l'image Docker (pas de démon Docker dans l'environnement de développement) et le déploiement réel sur Jelastic.
