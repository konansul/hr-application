"""add inactivity fields to users

Revision ID: e9f3a12b4c7d
Revises: 77c5b41aba6b
Create Date: 2026-05-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e9f3a12b4c7d'
down_revision: Union[str, Sequence[str], None] = '77c5b41aba6b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('last_active_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('inactivity_warning_sent_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('reactivation_token', sa.String(128), nullable=True))
    op.create_index('ix_users_reactivation_token', 'users', ['reactivation_token'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_users_reactivation_token', table_name='users')
    op.drop_column('users', 'reactivation_token')
    op.drop_column('users', 'inactivity_warning_sent_at')
    op.drop_column('users', 'last_active_at')
