# TriMaint / RefMaint — GMAO Triselec

Application de **Gestion de Maintenance Assistée par Ordinateur (GMAO)** pour les installations de tri Triselec. Gestion centralisée des machines, pannes, interventions, pièces détachées et maintenance préventive.

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | FastAPI 0.115 + Uvicorn/Gunicorn + Python 3.11 |
| Frontend | React 18 + Vite 5 + TypeScript 5.7 + Tailwind CSS 3.4 |
| Base de données | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0 + Alembic 1.14 |
| Auth | JWT (PyJWT) + bcrypt |
| Reverse proxy | Nginx (Alpine) |
| Conteneurisation | Docker Compose |

## Démarrage rapide (Docker)

### Prérequis
- Docker 24+
- Docker Compose v2

### Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/LePubli/RefMaint.git
cd RefMaint

# 2. Créer le fichier .env avec des secrets forts
cp .env.example .env

# 3. Générer un SECRET_KEY et un POSTGRES_PASSWORD forts
openssl rand -hex 32  # -> SECRET_KEY
openssl rand -base64 24  # -> POSTGRES_PASSWORD

# 4. (Optionnel) Créer un admin initial au premier démarrage
# Dans .env, mettre :
#   BOOTSTRAP_ADMIN=1
#   BOOTSTRAP_ADMIN_PASSWORD=UnMotDePasseFort123!

# 5. Démarrer
docker compose up -d --build

# 6. Vérifier que tout est OK
docker compose ps
docker compose logs -f backend  # voir le démarrage
```

L'application est accessible sur **http://localhost:8080** (port configurable via `FRONTEND_PORT`).

### Création du compte admin

Pour la première installation, deux options :

1. **Bootstrap automatique** (recommandé pour premier déploiement) :
   - Dans `.env` : `BOOTSTRAP_ADMIN=1` et `BOOTSTRAP_ADMIN_PASSWORD=UnMotDePasseFort123!`
   - Au premier démarrage, un utilisateur `admin` est créé avec ce mot de passe.
   - **Changez ce mot de passe immédiatement** après la première connexion.
   - Désactivez ensuite `BOOTSTRAP_ADMIN` (remettez à `0`).

2. **Manuellement via psql** (plus sécurisé) :
   ```bash
   docker compose exec postgres psql -U trimaint -d trimaint -c "
     INSERT INTO users (username, email, hashed_password, role, is_active, created_at)
     VALUES ('admin', 'admin@trimaint.local',
             '\$2b\$12\$XXX_VOTRE_HASH_BCRYPT_XXX',
             'admin', true, NOW());
   "
   ```
   Générez le hash bcrypt avec : `python -c "import bcrypt; print(bcrypt.hashpw(b'VotrePassword', bcrypt.gensalt(12)).decode())"`

> ⚠️ **Sécurité** : il n'y a **plus d'identifiants par défaut**. L'application refuse de démarrer si `SECRET_KEY` ou `POSTGRES_PASSWORD` ne sont pas définis.

## Commandes utiles (Makefile)

```bash
make up          # Démarrer
make down        # Arrêter
make logs        # Logs en temps réel
make logs-b      # Logs backend uniquement
make migrate     # Exécuter les migrations
make revision m="description"  # Créer une migration
make rollback    # Revenir d'une migration en arrière
make shell-b     # Shell dans le conteneur backend
make test-b      # Lancer les tests backend
make test-f      # Lancer les tests frontend
make help        # Voir toutes les commandes
```

## Développement local (hors Docker)

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

# Variables d'environnement (utiliser une DB de test)
export DATABASE_URL="postgresql://trimaint:password@localhost:5432/trimaint_dev"
export SECRET_KEY="dev-secret-not-for-production-64-chars-minimum"
export ALLOWED_ORIGINS="http://localhost:5000"

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # http://localhost:5000
```

### Tests
```bash
# Backend
cd backend && pytest -v --cov=app

# Frontend
cd frontend && npm test
```

## Structure du projet

```
RefMaint/
├── backend/                  # API FastAPI
│   ├── app/
│   │   ├── api/              # Routeurs (11 modules)
│   │   ├── core/             # Sécurité, config, activité, notifications
│   │   ├── db/               # Base de données
│   │   ├── models/           # Modèles SQLAlchemy (8 entités)
│   │   └── schemas/          # Schémas Pydantic v2
│   ├── alembic/              # Migrations (0001-0006)
│   ├── tests/                # Tests pytest
│   ├── requirements.txt      # Dépendances production
│   ├── requirements-dev.txt  # Dépendances dev/test
│   └── Dockerfile
├── frontend/                 # SPA React/Vite
│   ├── src/
│   │   ├── pages/            # 15 pages
│   │   ├── components/       # Layout, NotificationBell
│   │   ├── context/          # AuthContext
│   │   ├── hooks/            # useNotifications
│   │   ├── types/            # Interfaces TypeScript
│   │   └── services/         # API client
│   └── Dockerfile
├── .github/workflows/ci.yml  # Pipeline CI
├── docker-compose.yml
├── Makefile
└── .env.example
```

## Sécurité

- **JWT** : tokens signés HS256, durée 8h (configurable), `iat` et `nbf` inclus
- **Mots de passe** : bcrypt avec cost 12, validation longueur 8-72 caractères
- **CORS** : origines explicites uniquement (via `ALLOWED_ORIGINS`)
- **Rate limiting** : 5 tentatives de login / minute / IP (slowapi)
- **RBAC** : 3 rôles (admin, manager, technicien) avec guards sur les endpoints destructifs
- **Uploads** : validation extension + magic bytes + taille max 10 Mo
- **Headers** : CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **DB** : contraintes CHECK sur `criticite` (1-5) et `role`, CASCADE sur FK

## API Documentation

Une fois démarré :
- Swagger UI : http://localhost:8080/docs
- ReDoc : http://localhost:8080/redoc
- OpenAPI JSON : http://localhost:8080/openapi.json

## Sauvegarde / Restauration

```bash
# Sauvegarde
docker compose exec postgres pg_dump -U trimaint trimaint > backup_$(date +%Y%m%d).sql

# Restauration
cat backup_20260713.sql | docker compose exec -T postgres psql -U trimaint trimaint
```

## Licence

Projet interne Triselec. Tous droits réservés.
