"""add is_internal to jobs

Revision ID: a1b2c3d4e5f6
Revises: f3a6b9c2d5e8
Create Date: 2026-06-06

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'f3a6b9c2d5e8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('is_internal', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('jobs', 'is_internal')
