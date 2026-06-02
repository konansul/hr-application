"""add resume_shares table

Revision ID: b2c4d6e8f1a3
Revises: fa9c519b174f
Create Date: 2026-06-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b2c4d6e8f1a3'
down_revision: Union[str, None] = 'e5b8c1d2f3a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'resume_shares',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('share_id', sa.String(64), nullable=False),
        sa.Column('resume_id', sa.String(64), nullable=False),
        sa.Column('shared_by_user_id', sa.String(64), nullable=False),
        sa.Column('recipient_email', sa.String(255), nullable=False),
        sa.Column('recipient_name', sa.String(255), nullable=True),
        sa.Column('access_token', sa.String(128), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['resume_id'], ['resumes.resume_id']),
        sa.ForeignKeyConstraint(['shared_by_user_id'], ['users.user_id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_resume_shares_share_id',  'resume_shares', ['share_id'],      unique=True)
    op.create_index('ix_resume_shares_resume_id', 'resume_shares', ['resume_id'],     unique=False)
    op.create_index('ix_resume_shares_token',     'resume_shares', ['access_token'],  unique=True)


def downgrade() -> None:
    op.drop_index('ix_resume_shares_token',     table_name='resume_shares')
    op.drop_index('ix_resume_shares_resume_id', table_name='resume_shares')
    op.drop_index('ix_resume_shares_share_id',  table_name='resume_shares')
    op.drop_table('resume_shares')
