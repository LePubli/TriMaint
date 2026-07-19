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

# Fix stale alembic_version if DB was partially upgraded with old revision IDs
python -c "
import psycopg2, os
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute(\"SELECT version_num FROM alembic_version\")
row = cur.fetchone()
if row and row[0] == '0006':
    cur.execute(\"UPDATE alembic_version SET version_num = '0006_constraints_cascade'\")
    conn.commit()
    print('Fixed alembic_version: 0006 -> 0006_constraints_cascade')
cur.close()
conn.close()
" 2>/dev/null || true

# Ajout idempotent de la colonne rotation (supprimée de la migration 0008)
python -c "
import psycopg2, os
conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
cur = conn.cursor()
cur.execute(\"SELECT column_name FROM information_schema.columns WHERE table_name='machines' AND column_name='rotation'\")
if not cur.fetchone():
    cur.execute('ALTER TABLE machines ADD COLUMN rotation FLOAT')
    print('Colonne rotation ajoutée à machines.')
else:
    print('Colonne rotation déjà présente.')
cur.close(); conn.close()
"

echo "Exécution des migrations Alembic..."
alembic upgrade head
echo "Migrations terminées."

# Seed equipment data (idempotent - skips if already present)
echo "Vérification du seed des équipements..."
python -c "from seed_equipment import seed_equipment; seed_equipment()" || echo "Seed skipped (may already exist)"

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
