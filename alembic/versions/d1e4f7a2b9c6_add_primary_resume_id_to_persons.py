"""add primary_resume_id to persons

Revision ID: d1e4f7a2b9c6
Revises: c9d3e7f2a1b5
Create Date: 2026-06-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd1e4f7a2b9c6'
down_revision: Union[str, None] = 'c9d3e7f2a1b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'persons',
        sa.Column('primary_resume_id', sa.String(64), nullable=True),
    )
    op.execute(
        'CREATE INDEX IF NOT EXISTS ix_persons_primary_resume_id '
        'ON persons (primary_resume_id)'
    )


def downgrade() -> None:
    op.drop_index('ix_persons_primary_resume_id', table_name='persons')
    op.drop_column('persons', 'primary_resume_id')
