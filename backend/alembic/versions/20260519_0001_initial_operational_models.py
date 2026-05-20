"""initial operational models

Revision ID: 20260519_0001
Revises:
Create Date: 2026-05-19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260519_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("base44_id", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_organizations_base44_id", "organizations", ["base44_id"], unique=True)
    op.create_index("ix_organizations_name", "organizations", ["name"])
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)
    op.create_index("ix_organizations_slug_status", "organizations", ["slug", "status"])
    op.create_index("ix_organizations_status", "organizations", ["status"])

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("base44_id", sa.String(), nullable=True),
        sa.Column("firebase_uid", sa.String(), nullable=True),
        sa.Column("auth_provider", sa.String(), nullable=True),
        sa.Column("primary_organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("first_name", sa.String(), nullable=True),
        sa.Column("last_name", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("mobile_number", sa.String(), nullable=True),
        sa.Column("specialty_or_program", sa.String(), nullable=True),
        sa.Column("practice_address", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_auth_provider", "users", ["auth_provider"])
    op.create_index("ix_users_base44_id", "users", ["base44_id"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_email_status", "users", ["email", "status"])
    op.create_index("ix_users_firebase_uid", "users", ["firebase_uid"], unique=True)
    op.create_index("ix_users_first_name", "users", ["first_name"])
    op.create_index("ix_users_last_name", "users", ["last_name"])
    op.create_index("ix_users_name", "users", ["name"])
    op.create_index("ix_users_primary_organization_id", "users", ["primary_organization_id"])
    op.create_index("ix_users_status", "users", ["status"])

    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("base44_id", sa.String(), nullable=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("scope", sa.String(), nullable=False),
        sa.Column("permissions", postgresql.JSONB(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("organization_id", "code", name="uq_roles_org_code"),
    )
    op.create_index("ix_roles_base44_id", "roles", ["base44_id"], unique=True)
    op.create_index("ix_roles_code", "roles", ["code"])
    op.create_index("ix_roles_code_scope", "roles", ["code", "scope"])
    op.create_index("ix_roles_name", "roles", ["name"])
    op.create_index("ix_roles_organization_id", "roles", ["organization_id"])
    op.create_index("ix_roles_scope", "roles", ["scope"])

    op.create_table(
        "user_roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True),
        sa.Column("assigned_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "role_id", "organization_id", name="uq_user_roles_user_role_org"),
    )
    op.create_index("ix_user_roles_assigned_by_user_id", "user_roles", ["assigned_by_user_id"])
    op.create_index("ix_user_roles_organization_id", "user_roles", ["organization_id"])
    op.create_index("ix_user_roles_role_id", "user_roles", ["role_id"])
    op.create_index("ix_user_roles_role_org", "user_roles", ["role_id", "organization_id"])
    op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"])
    op.create_index("ix_user_roles_user_org", "user_roles", ["user_id", "organization_id"])

    op.create_table(
        "organization_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("invited_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_organization_members_invited_by_user_id", "organization_members", ["invited_by_user_id"])
    op.create_index("ix_organization_members_org_status", "organization_members", ["organization_id", "status"])
    op.create_index("ix_organization_members_organization_id", "organization_members", ["organization_id"])
    op.create_index("ix_organization_members_role", "organization_members", ["role"])
    op.create_index("ix_organization_members_role_status", "organization_members", ["role", "status"])
    op.create_index("ix_organization_members_status", "organization_members", ["status"])
    op.create_index("ix_organization_members_user_id", "organization_members", ["user_id"])
    op.create_index("ix_organization_members_user_org", "organization_members", ["user_id", "organization_id"])

    op.create_table(
        "invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("invited_email", sa.String(), nullable=False),
        sa.Column("invited_role", sa.String(), nullable=False),
        sa.Column("invited_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_invitations_email_status", "invitations", ["invited_email", "status"])
    op.create_index("ix_invitations_expires_at", "invitations", ["expires_at"])
    op.create_index("ix_invitations_invited_by_user_id", "invitations", ["invited_by_user_id"])
    op.create_index("ix_invitations_invited_email", "invitations", ["invited_email"])
    op.create_index("ix_invitations_invited_role", "invitations", ["invited_role"])
    op.create_index("ix_invitations_org_status", "invitations", ["organization_id", "status"])
    op.create_index("ix_invitations_organization_id", "invitations", ["organization_id"])
    op.create_index("ix_invitations_role_status", "invitations", ["invited_role", "status"])
    op.create_index("ix_invitations_status", "invitations", ["status"])
    op.create_index("ix_invitations_token", "invitations", ["token"], unique=True)

    op.create_table(
        "document_metadata",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("uploaded_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column("download_url", sa.String(), nullable=True),
        sa.Column("mime_type", sa.String(), nullable=True),
        sa.Column("file_size", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_document_metadata_file_name", "document_metadata", ["file_name"])
    op.create_index("ix_document_metadata_org_created", "document_metadata", ["organization_id", "created_at"])
    op.create_index("ix_document_metadata_organization_id", "document_metadata", ["organization_id"])
    op.create_index("ix_document_metadata_storage_path", "document_metadata", ["storage_path"], unique=True)
    op.create_index("ix_document_metadata_uploaded_by", "document_metadata", ["uploaded_by_user_id"])
    op.create_index("ix_document_metadata_uploaded_by_user_id", "document_metadata", ["uploaded_by_user_id"])

    op.create_table(
        "provider_availability",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("provider_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("timezone", sa.String(), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_provider_availability_is_available", "provider_availability", ["is_available"])
    op.create_index("ix_provider_availability_org_weekday", "provider_availability", ["organization_id", "weekday"])
    op.create_index("ix_provider_availability_organization_id", "provider_availability", ["organization_id"])
    op.create_index("ix_provider_availability_provider_user_id", "provider_availability", ["provider_user_id"])
    op.create_index("ix_provider_availability_provider_weekday", "provider_availability", ["provider_user_id", "weekday"])
    op.create_index("ix_provider_availability_weekday", "provider_availability", ["weekday"])

    op.create_table(
        "appointment_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("patient_name", sa.String(), nullable=False),
        sa.Column("patient_email", sa.String(), nullable=True),
        sa.Column("requested_provider_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("requested_date", sa.Date(), nullable=False),
        sa.Column("requested_time", sa.Time(), nullable=False),
        sa.Column("request_reason", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_appointment_requests_created_by", "appointment_requests", ["created_by_user_id"])
    op.create_index("ix_appointment_requests_created_by_user_id", "appointment_requests", ["created_by_user_id"])
    op.create_index("ix_appointment_requests_org_status", "appointment_requests", ["organization_id", "status"])
    op.create_index("ix_appointment_requests_organization_id", "appointment_requests", ["organization_id"])
    op.create_index("ix_appointment_requests_patient_email", "appointment_requests", ["patient_email"])
    op.create_index("ix_appointment_requests_patient_name", "appointment_requests", ["patient_name"])
    op.create_index("ix_appointment_requests_provider_date", "appointment_requests", ["requested_provider_user_id", "requested_date"])
    op.create_index("ix_appointment_requests_requested_date", "appointment_requests", ["requested_date"])
    op.create_index("ix_appointment_requests_requested_provider_user_id", "appointment_requests", ["requested_provider_user_id"])
    op.create_index("ix_appointment_requests_status", "appointment_requests", ["status"])

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action_type", sa.String(), nullable=False),
        sa.Column("resource_type", sa.String(), nullable=False),
        sa.Column("resource_id", sa.String(), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_audit_logs_action_resource", "audit_logs", ["action_type", "resource_type"])
    op.create_index("ix_audit_logs_action_type", "audit_logs", ["action_type"])
    op.create_index("ix_audit_logs_org_created", "audit_logs", ["organization_id", "created_at"])
    op.create_index("ix_audit_logs_organization_id", "audit_logs", ["organization_id"])
    op.create_index("ix_audit_logs_resource_id", "audit_logs", ["resource_id"])
    op.create_index("ix_audit_logs_resource_type", "audit_logs", ["resource_type"])
    op.create_index("ix_audit_logs_user_created", "audit_logs", ["user_id", "created_at"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("appointment_requests")
    op.drop_table("provider_availability")
    op.drop_table("document_metadata")
    op.drop_table("invitations")
    op.drop_table("organization_members")
    op.drop_table("user_roles")
    op.drop_table("roles")
    op.drop_table("users")
    op.drop_table("organizations")
