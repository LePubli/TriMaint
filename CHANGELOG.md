# Changelog

Tous les changements notables du projet RefMaint/TriMaint sont documentés ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [1.3.1] - 2026-07-24

### Corrigé
- **500 sur `GET /api/bons-travail/?type_bt=nettoyage`** : le modèle `BonTravail`
  ne déclarait pas les relations `machine`, `demandeur`, `intervenant`, alors que
  `list_bons_travail` les utilise via `joinedload()` et que `_bt_to_list_item`
  y accède (`bt.demandeur.username`, `bt.machine.nom`, …). Ajout des trois
  relations avec `lazy="joined"` et `foreign_keys=[...]` (nécessaire car deux
  FK pointent vers `users`).
- **422 sur `POST /api/machines/`** : le frontend `SchemaInteractif.tsx` envoie
  `taille_pastille` en em brut (float, ex. 0.9, 1.4) mais le schéma Pydantic
  `MachineCreate` le déclarait en `Optional[int]`. En mode lax de Pydantic v2,
  les floats à virgule sont rejetés sur un champ `int` → 422. Le champ passe à
  `Optional[float]` côté schéma ET modèle.
- **Frontend** : suppression du champ `type` (non présent dans `MachineCreate`)
  du payload envoyé par `handleCreateMachine` (POST `/machines/`).
- **Migration** : `migration_v24_taille_pastille_float.sql` + Alembic
  `0011_taille_pastille_float.py` convertissent la colonne `INTEGER` en
  `DOUBLE PRECISION` et divisent par 10 les anciennes valeurs `em*10` (entiers
  dans [1, 19]) pour préserver l'affichage existant.

## [1.1.0] - 2026-07-13

### Sécurité (Critique)
- **SECRET_KEY fail-fast** : l'application refuse de démarrer si `SECRET_KEY` n'est pas définie (suppression du default hardcodé)
- **Suppression de l'auto-création admin/admin123** : remplacée par un flag optionnel `BOOTSTRAP_ADMIN=1` avec mot de passe configurable
- **CORS restrictif** : `allow_origins=["*"]` remplacé par une liste explicite via `ALLOWED_ORIGINS` (env var)
- **Migration python-jose → PyJWT** : élimination des CVE-2024-33664 et CVE-2024-33663
- **Rate limiting sur /api/auth/login** : 5 tentatives/minute/IP via slowapi
- **Authorisations corrigées** : `require_manager_or_admin` sur tous les DELETE/PUT destructeurs (pannes, interventions, pieces, maintenance_preventive)
- **Upload magic bytes verification** : validation du contenu des fichiers et non plus seulement de l'extension
- **Validation PanneCreate.criticite** : contrainte `Field(ge=1, le=5)` au niveau Pydantic
- **Validation UserCreate.password** : longueur 8-72 caractères
- **Validation UserCreate.email** : utilisation de `EmailStr` (au lieu de `str`)
- **Suppression des identifiants par défaut** dans Login.tsx, README.md et replit.md

### Base de données
- **Migration 0006** : contraintes CHECK (`criticite` 1-5, `role` enum), CASCADE sur FK, PRIMARY KEY composite `pannes_pieces`, index de performance
- **Alembic env.py corrigé** : import des 8 modèles (au lieu de 5) pour autogenerate complet
- **Ajout `users.updated_at`** pour cohérence avec les autres modèles

### Infrastructure
- **docker-compose.yml** : ports publiés (8080:80), healthchecks sur les 3 services, restart policy, log rotation
- **docker-compose.yml** : variables obligatoires avec fail-fast (`${VAR:?message}`)
- **docker-compose.yml** : suppression `version: "3.9"` déprécié
- **Backend Dockerfile** : ajout curl pour healthcheck, HEALTHCHECK directive
- **Backend entrypoint** : Gunicorn avec 2 workers UvicornWorker (au lieu d'1 worker uvicorn brut)
- **nginx** : ajout CSP, HSTS, Referrer-Policy, Permissions-Policy headers
- **nginx** : cache static assets 30 jours, client_max_body_size 12m

### Frontend
- **Code splitting** : `React.lazy` + `Suspense` sur toutes les routes (bundle 390KB → 265KB initial, -32%)
- **Suppression @tanstack/react-query** : dépendance morte (jamais utilisée)
- **Interfaces TypeScript** : création de `src/types/index.ts` avec tous les types métier
- **ESLint 9 + Prettier** configurés (eslint.config.js, .prettierrc)
- **Vitest** configuré + 5 tests sur la page Login
- **Favicon SVG inline** (suppression référence /vite.svg manquante)
- **Login.tsx** : `autoComplete` sur les inputs, gestion d'erreur typée

### Backend
- **Lifespan FastAPI** : remplacement de `@app.on_event("startup")` déprécié
- **Pydantic v2** : `Field()` avec contraintes sur tous les champs sensibles
- **JWT** : ajout des claims `iat` et `nbf`, utilisation de `datetime.now(timezone.utc)`
- **bcrypt** : cost 12, vérification longueur 72 bytes avant hash
- **Upload path traversal** : protection renforcée avec `os.path.basename()` + `realpath` check
- **CSV export** : sécurité contre path traversal conservée
- **Logging** : log_activity sur login (audit trail)

### Tests & CI/CD
- **Tests backend** : 23 tests pytest (auth, pannes, pieces, autorisations, validation)
- **Tests frontend** : 5 tests vitest sur Login
- **CI GitHub Actions** : pipeline backend (lint, security, tests, coverage) + frontend (type-check, lint, build, tests)
- **Linters** : flake8 + black + isort + mypy (backend), ESLint + Prettier (frontend)

### Nettoyage
- **Suppression fichiers Replit** : `.replit`, `start.sh`, `deploy.sh`, `replit.md`, `main.py` vestigial, `uv.lock`, `pyproject.toml` racine
- **Suppression `attached_assets/`** (72 Mo de photos + logs debug)
- **Suppression `.agents/memory/`** (mémoire interne agent IA)
- **Suppression dead deps** : `passlib[bcrypt]`, `pillow` (jamais importés)
- **pyproject.toml backend** : ajout config black/isort/mypy/pytest
- **.gitignore** : ajout `attached_assets/`, `.env`, `coverage/`, etc.

### Documentation
- **README.md** réécrit : Docker uniquement, plus d'identifiants par défaut, instructions bootstrap admin, commandes Makefile, sauvegarde/restauration

## [1.0.0] - 2026-07-08

Version initiale (pré-audit).
- Application GMAO fonctionnelle avec FastAPI + React + PostgreSQL
- 5 migrations Alembic
- 50 endpoints API, 15 routes frontend
- Problèmes de sécurité critiques (voir rapport d'audit)
