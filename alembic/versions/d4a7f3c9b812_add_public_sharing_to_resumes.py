"""add public_sharing_enabled to resumes

Revision ID: d4a7f3c9b812
Revises: c3f8d2e1a059
Create Date: 2026-05-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4a7f3c9b812'
down_revision: Union[str, Sequence[str], None] = 'c3f8d2e1a059'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'resumes',
        sa.Column('public_sharing_enabled', sa.Boolean(), nullable=False, server_default=sa.false())
    )


def downgrade() -> None:
    op.drop_column('resumes', 'public_sharing_enabled')
