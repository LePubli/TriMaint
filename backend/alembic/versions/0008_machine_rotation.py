"""Ajout rotation aux machines pour orientation des etiquettes schema.

Revision ID: 0008_machine_rotation
Revises: 0007_schema_interactif_bt
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_machine_rotation"
down_revision = "0007_schema_interactif_bt"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("machines", sa.Column("rotation", sa.Float(), nullable=True, default=0))


def downgrade():
    op.drop_column("machines", "rotation")