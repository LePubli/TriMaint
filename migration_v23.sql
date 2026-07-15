-- Migration v2.3: add couleur and taille_pastille columns to machines table
-- Run this SQL on your database (PostgreSQL) before deploying v2.3
-- Or run: alembic revision --autogenerate -m "add_couleur_taille"

ALTER TABLE machines ADD COLUMN IF NOT EXISTS couleur VARCHAR(7);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS taille_pastille INTEGER;