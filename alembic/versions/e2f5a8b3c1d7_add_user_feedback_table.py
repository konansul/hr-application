"""add user_feedback table

Revision ID: e2f5a8b3c1d7
Revises: d1e4f7a2b9c6
Create Date: 2026-06-05 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e2f5a8b3c1d7'
down_revision: Union[str, None] = 'd1e4f7a2b9c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_feedback',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('feedback_id', sa.String(64), nullable=False),
        sa.Column('user_id', sa.String(64), nullable=False),
        sa.Column('stars', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_feedback_feedback_id', 'user_feedback', ['feedback_id'], unique=True)
    op.create_index('ix_user_feedback_user_id', 'user_feedback', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_user_feedback_user_id', table_name='user_feedback')
    op.drop_index('ix_user_feedback_feedback_id', table_name='user_feedback')
    op.drop_table('user_feedback')
