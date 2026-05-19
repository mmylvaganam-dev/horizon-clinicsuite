from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from app.db.models import (
    AuditLog,
    DocumentMetadata,
    Invitation,
    Organization,
    ProviderAvailability,
    Role,
    User,
    UserRole,
)


def test_first_entity_models_are_registered():
    assert Base.metadata.tables["organizations"] is Organization.__table__
    assert Base.metadata.tables["roles"] is Role.__table__
    assert Base.metadata.tables["users"] is User.__table__
    assert Base.metadata.tables["user_roles"] is UserRole.__table__
    assert Base.metadata.tables["document_metadata"] is DocumentMetadata.__table__
    assert Base.metadata.tables["audit_logs"] is AuditLog.__table__
    assert Base.metadata.tables["invitations"] is Invitation.__table__
    assert Base.metadata.tables["provider_availability"] is ProviderAvailability.__table__


def test_first_entity_models_use_uuid_primary_keys():
    for model in (
        Organization,
        Role,
        User,
        UserRole,
        DocumentMetadata,
        AuditLog,
        Invitation,
        ProviderAvailability,
    ):
        primary_key_column = model.__table__.primary_key.columns.values()[0]

        assert isinstance(primary_key_column.type, UUID)
        assert primary_key_column.type.as_uuid is True
