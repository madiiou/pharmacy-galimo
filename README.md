# Pharmacy Galimo

Module pharmacie autonome, extrait de Pocket Palace : API backend (Node/Express + PostgreSQL)
consommée par l'app Flutter, et dashboard admin/partenaire (React) pour gérer pharmacies,
médicaments et commandes.

## Structure

- `backend/` — API Express + TypeScript, Postgres, auth JWT, chat de commande via Socket.IO.
- `admin/` — Dashboard React/Vite (login, pharmacies, médicaments, commandes + chat).
- `infra/nginx/` — Config nginx de référence pour `pharmacy.galimo.tech`.
- `docker-compose.yml` — Postgres + API, réseau Docker isolé.
- `Jenkinsfile` — Pipeline de build/déploiement.

## Développement local

```bash
cp .env.example .env   # renseigner DB_PASSWORD et JWT_SECRET
docker compose up --build
```

L'API écoute sur `http://localhost:4001/api`.

```bash
cd admin && npm install && npm run dev
```

## Déploiement

Géré par le `Jenkinsfile` : build des images Docker, `docker compose up -d`, puis build et
publication du dashboard admin sur le serveur. Le fichier `.env` de production n'est jamais
commité — il est maintenu directement sur le serveur.
