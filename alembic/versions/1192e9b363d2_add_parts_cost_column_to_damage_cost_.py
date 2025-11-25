"""Add parts_cost column to damage_cost_reference

Revision ID: 1192e9b363d2
Revises: cba0a26afce8
Create Date: 2025-11-22 10:55:53.719798

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1192e9b363d2'
down_revision: Union[str, None] = 'cba0a26afce8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add parts_cost column (nullable first)
    op.add_column('damage_cost_reference', sa.Column('parts_cost', sa.Integer(), nullable=True))
    
    # Calculate and update parts_cost for existing rows
    # Using $100/hour labor rate: parts_cost = base_cost - (labor_hours * 100)
    op.execute("""
        UPDATE damage_cost_reference 
        SET parts_cost = base_cost - (labor_hours * 100)
    """)
    
    # Make column non-nullable
    op.alter_column('damage_cost_reference', 'parts_cost', nullable=False)


def downgrade() -> None:
    op.drop_column('damage_cost_reference', 'parts_cost')

