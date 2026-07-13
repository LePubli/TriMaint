#!/bin/bash
set -e

echo "=== TriMaint Backend ==="

# Vérification des variables obligatoires
if [ -z "$SECRET_KEY" ]; then
    echo "ERREUR FATALE: SECRET_KEY non défini. Abandon."
    exit 1
fi
if [ -z "$DATABASE_URL" ]; then
    echo "ERREUR FATALE: DATABASE_URL non défini. Abandon."
    exit 1
fi

echo "Attente de PostgreSQL..."

# Attendre que PostgreSQL soit prêt
until python -c "
import psycopg2, os, sys
try:
    psycopg2.connect(os.environ['DATABASE_URL'])
    sys.exit(0)
except Exception as e:
    print(f'  PostgreSQL non disponible: {e}')
    sys.exit(1)
"; do
    sleep 2
done

echo "PostgreSQL prêt."

echo "Exécution des migrations Alembic..."
alembic upgrade head
echo "Migrations terminées."

# Gunicorn en production (2-4 workers selon CPU)
WORKERS=${GUNICORN_WORKERS:-2}
echo "Démarrage du serveur (gunicorn, $WORKERS workers)..."
exec gunicorn app.main:app \
    --workers "$WORKERS" \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --graceful-timeout 30 \
    --access-logfile - \
    --error-logfile -
