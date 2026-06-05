"""patient transition tables

Revision ID: 20260605_0003
Revises: 20260605_0002
Create Date: 2026-06-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260605_0003"
down_revision: Union[str, None] = "20260605_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "patients_transition",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("base44_id", sa.String(), nullable=True),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_patients_transition_base44_id", "patients_transition", ["base44_id"], unique=True)
    op.create_index("ix_patients_transition_email", "patients_transition", ["email"])
    op.create_index("ix_patients_transition_full_name", "patients_transition", ["full_name"])
    op.create_index("ix_patients_transition_org_name", "patients_transition", ["organization_id", "full_name"])
    op.create_index("ix_patients_transition_org_phone", "patients_transition", ["organization_id", "phone"])
    op.create_index("ix_patients_transition_organization_id", "patients_transition", ["organization_id"])
    op.create_index("ix_patients_transition_phone", "patients_transition", ["phone"])
    op.create_index("ix_patients_transition_status", "patients_transition", ["status"])

    op.create_table(
        "patient_visits_transition",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients_transition.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("provider_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("visit_date", sa.Date(), nullable=False),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_patient_visits_transition_org_date", "patient_visits_transition", ["organization_id", "visit_date"])
    op.create_index("ix_patient_visits_transition_organization_id", "patient_visits_transition", ["organization_id"])
    op.create_index("ix_patient_visits_transition_patient_date", "patient_visits_transition", ["patient_id", "visit_date"])
    op.create_index("ix_patient_visits_transition_patient_id", "patient_visits_transition", ["patient_id"])
    op.create_index("ix_patient_visits_transition_provider_user_id", "patient_visits_transition", ["provider_user_id"])
    op.create_index("ix_patient_visits_transition_status", "patient_visits_transition", ["status"])
    op.create_index("ix_patient_visits_transition_visit_date", "patient_visits_transition", ["visit_date"])


def downgrade() -> None:
    op.drop_table("patient_visits_transition")
    op.drop_table("patients_transition")
