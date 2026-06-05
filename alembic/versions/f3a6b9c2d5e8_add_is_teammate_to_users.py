"""add is_teammate to users

Revision ID: f3a6b9c2d5e8
Revises: e2f5a8b3c1d7
Create Date: 2026-06-05 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f3a6b9c2d5e8'
down_revision: Union[str, None] = 'e2f5a8b3c1d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('is_teammate', sa.Boolean(), nullable=False, server_default='false'),
    )


def downgrade() -> None:
    op.drop_column('users', 'is_teammate')
