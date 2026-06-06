"""add user_activity_logs table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-06

"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_activity_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('log_id', sa.String(64), unique=True, nullable=False),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('module', sa.String(64), nullable=False),
        sa.Column('role', sa.String(32), nullable=True),
        sa.Column('logged_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_user_activity_logs_logged_at', 'user_activity_logs', ['logged_at'])


def downgrade() -> None:
    op.drop_table('user_activity_logs')
