"""add resume_id to cv_improvement_results

Revision ID: c9d3e7f2a1b5
Revises: b2c4d6e8f1a3
Create Date: 2026-06-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c9d3e7f2a1b5'
down_revision: Union[str, None] = 'b2c4d6e8f1a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'cv_improvement_results',
        sa.Column('resume_id', sa.String(64), sa.ForeignKey('resumes.resume_id'), nullable=True),
    )
    op.execute(
        'CREATE INDEX IF NOT EXISTS ix_cv_improvement_results_resume_id '
        'ON cv_improvement_results (resume_id)'
    )


def downgrade() -> None:
    op.drop_index('ix_cv_improvement_results_resume_id', table_name='cv_improvement_results')
    op.drop_column('cv_improvement_results', 'resume_id')
