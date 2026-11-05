# Version de relecture du module : le module construit avec le mode relecture + le serveur de commentaires.
# Ce n'est PAS le paquet SCORM livré à Acamedia (celui-ci se construit avec « npm run build » et ne contient rien de tout cela).

FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN node scripts/build.js --review

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    SITE_DIR=/app/site \
    DATA_DIR=/data
COPY --from=build /app/build/package /app/site
COPY review/server.js /app/server.js
# Les commentaires sont écrits dans /data : à monter sur un volume persistant (sinon ils disparaissent à chaque mise à jour)
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/api/review/health || exit 1
# REVIEW_PASSWORD est obligatoire (à définir dans les variables d'environnement de l'hébergeur, jamais dans l'image)
CMD ["node", "server.js"]
