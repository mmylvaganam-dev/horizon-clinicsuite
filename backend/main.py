from fastapi import FastAPI
from fastapi import Header
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from app.db.session import get_database_status
from app.services import firebase_auth_service
from app.services.admin_org_service import (
    create_organization,
    list_organizations,
    list_roles,
)
from app.services.appointment_request_service import (
    create_appointment_request,
    list_appointment_requests,
    update_appointment_request_status,
)
from app.services.audit_service import list_audit_logs
from app.services.availability_service import (
    create_availability,
    list_availability,
    update_availability,
)
from app.services.document_service import (
    list_document_metadata,
    register_document_metadata,
)
from app.services.invitation_service import (
    accept_invitation,
    create_invitation,
    list_invitations,
)
from app.services.org_member_service import (
    add_org_member,
    list_org_members,
    update_org_member_status,
)
from app.services.profile_service import get_my_profile, update_my_profile
from app.services.protected_profile_service import build_protected_profile_response
from app.services.rbac_service import get_rbac_context, require_any_role
from app.services.storage_service import (
    get_migration_storage_status,
    get_storage_status,
)
from app.services.staging_admin_seed_service import (
    rollback_staging_admin_user,
    seed_staging_admin_user,
)
from app.services.system_health_service import get_system_health_summary


class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    mobile_number: Optional[str] = None
    specialty_or_program: Optional[str] = None
    practice_address: Optional[str] = None


class OrganizationCreateRequest(BaseModel):
    name: str
    slug: Optional[str] = None


class DocumentRegisterRequest(BaseModel):
    file_name: str
    storage_path: str
    download_url: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None


class InvitationCreateRequest(BaseModel):
    invited_email: str
    invited_role: str


class InvitationAcceptRequest(BaseModel):
    token: str


class AvailabilityCreateRequest(BaseModel):
    provider_user_id: Optional[str] = None
    organization_id: Optional[str] = None
    weekday: int
    start_time: str
    end_time: str
    timezone: str = "America/Toronto"
    is_available: bool = True


class AvailabilityUpdateRequest(BaseModel):
    id: str
    provider_user_id: Optional[str] = None
    organization_id: Optional[str] = None
    weekday: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    timezone: Optional[str] = None
    is_available: Optional[bool] = None


class AppointmentRequestCreateRequest(BaseModel):
    organization_id: Optional[str] = None
    patient_name: str
    patient_email: Optional[str] = None
    requested_provider_user_id: Optional[str] = None
    requested_date: str
    requested_time: str
    request_reason: Optional[str] = None


class AppointmentRequestStatusUpdateRequest(BaseModel):
    id: str
    status: str


class OrganizationMemberAddRequest(BaseModel):
    organization_id: Optional[str] = None
    user_id: str
    role: str
    status: str = "active"
    invited_by_user_id: Optional[str] = None


class OrganizationMemberStatusUpdateRequest(BaseModel):
    id: str
    status: str


app = FastAPI(
    title="Horizon Clinical Suite Backend",
    version="0.1.0",
    description="Independent backend API for Horizon Clinical Suite migration away from Base44."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "horizon-clinicsuite-backend"}


@app.get("/db/status")
def database_status():
    return get_database_status()


@app.get("/storage/status")
def storage_status():
    return get_storage_status()


@app.get("/auth/firebase-test")
def firebase_auth_test(authorization: Optional[str] = Header(default=None)):
    return {
        "firebase_auth": "verified",
        "user": firebase_auth_service.get_current_user_from_token(authorization),
    }


@app.get("/auth/protected-me")
def protected_me(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)

    return {
        "auth": "firebase",
        "protected": True,
        "user": {
            "uid": firebase_user.get("uid"),
            "email": firebase_user.get("email"),
            "email_verified": firebase_user.get("email_verified", False),
            "firebase": firebase_user.get("firebase", {}),
        },
    }


@app.get("/auth/protected-profile")
def protected_profile(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    return build_protected_profile_response(firebase_user)


@app.get("/profile/me")
def profile_me(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    return get_my_profile(firebase_user)


@app.patch("/profile/me")
def update_profile_me(
    profile_update: ProfileUpdateRequest,
    authorization: Optional[str] = Header(default=None),
):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    return update_my_profile(
        firebase_user,
        _profile_update_payload(profile_update),
    )


@app.get("/admin/organizations")
def admin_organizations(authorization: Optional[str] = Header(default=None)):
    firebase_auth_service.get_current_user_from_token(authorization)
    return list_organizations()


@app.post("/admin/organizations")
def admin_create_organization(
    organization: OrganizationCreateRequest,
    authorization: Optional[str] = Header(default=None),
):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    audit_context = get_rbac_context(firebase_user)
    return create_organization(_model_payload(organization), audit_context)


@app.get("/admin/roles")
def admin_roles(authorization: Optional[str] = Header(default=None)):
    firebase_auth_service.get_current_user_from_token(authorization)
    return list_roles()


@app.get("/rbac/me")
def rbac_me(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    return get_rbac_context(firebase_user)


@app.get("/rbac/admin-test")
def rbac_admin_test(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(firebase_user, ["admin"])
    return {
        "authorized": True,
        "required_roles": ["admin"],
        **context,
    }


@app.get("/rbac/provider-test")
def rbac_provider_test(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(firebase_user, ["admin", "provider"])
    return {
        "authorized": True,
        "required_roles": ["admin", "provider"],
        **context,
    }


@app.post("/documents/register-upload")
def documents_register_upload(
    document: DocumentRegisterRequest,
    authorization: Optional[str] = Header(default=None),
):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(
        firebase_user,
        ["admin", "provider", "staff"],
        allow_staging_test_user=True,
    )
    return register_document_metadata(_model_payload(document), context)


@app.get("/documents/list")
def documents_list(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    get_rbac_context(firebase_user)
    return list_document_metadata()


@app.get("/audit/logs")
def audit_logs(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    require_any_role(firebase_user, ["admin"])
    return list_audit_logs()


@app.post("/invitations/create")
def invitations_create(
    invitation: InvitationCreateRequest,
    authorization: Optional[str] = Header(default=None),
):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(firebase_user, ["admin"])
    return create_invitation(_model_payload(invitation), context)


@app.get("/invitations/list")
def invitations_list(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    require_any_role(firebase_user, ["admin"])
    return list_invitations()


@app.post("/invitations/accept")
def invitations_accept(
    invitation: InvitationAcceptRequest,
    authorization: Optional[str] = Header(default=None),
):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    return accept_invitation(_model_payload(invitation), firebase_user)


@app.post("/availability/create")
def availability_create(
    availability: AvailabilityCreateRequest,
    authorization: Optional[str] = Header(default=None),
):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(
        firebase_user,
        ["admin", "provider", "staff"],
        allow_staging_test_user=True,
    )
    return create_availability(_model_payload(availability), context)


@app.get("/availability/list")
def availability_list(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(
        firebase_user,
        ["admin", "provider", "staff"],
        allow_staging_test_user=True,
    )
    return list_availability(context)


@app.patch("/availability/update")
def availability_update(
    availability: AvailabilityUpdateRequest,
    authorization: Optional[str] = Header(default=None),
):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(
        firebase_user,
        ["admin", "provider", "staff"],
        allow_staging_test_user=True,
    )
    return update_availability(_model_payload(availability, exclude_unset=True), context)


@app.post("/appointments/request")
def appointments_request(
    appointment_request: AppointmentRequestCreateRequest,
    authorization: Optional[str] = Header(default=None),
):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(
        firebase_user,
        ["admin", "provider", "staff"],
        allow_staging_test_user=True,
    )
    return create_appointment_request(_model_payload(appointment_request), context)


@app.get("/appointments/list")
def appointments_list(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(
        firebase_user,
        ["admin", "provider", "staff", "viewer"],
        allow_staging_test_user=True,
    )
    return list_appointment_requests(context)


@app.patch("/appointments/status")
def appointments_status(
    appointment_request: AppointmentRequestStatusUpdateRequest,
    authorization: Optional[str] = Header(default=None),
):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(
        firebase_user,
        ["admin", "provider", "staff"],
        allow_staging_test_user=True,
    )
    return update_appointment_request_status(_model_payload(appointment_request), context)


@app.get("/org-members/list")
def org_members_list(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(firebase_user, ["admin", "provider", "staff", "viewer"])
    return list_org_members(context)


@app.post("/org-members/add")
def org_members_add(
    member: OrganizationMemberAddRequest,
    authorization: Optional[str] = Header(default=None),
):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(firebase_user, ["admin"])
    return add_org_member(_model_payload(member), context)


@app.patch("/org-members/status")
def org_members_status(
    member: OrganizationMemberStatusUpdateRequest,
    authorization: Optional[str] = Header(default=None),
):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    context = require_any_role(firebase_user, ["admin"])
    return update_org_member_status(_model_payload(member), context)


@app.get("/system/health-summary")
def system_health_summary(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    require_any_role(firebase_user, ["admin"])
    return get_system_health_summary()


@app.post("/management/staging/seed-admin")
def management_staging_seed_admin(
    x_admin_seed_token: Optional[str] = Header(default=None),
):
    return seed_staging_admin_user(x_admin_seed_token)


@app.post("/management/staging/seed-admin/rollback")
def management_staging_seed_admin_rollback(
    x_admin_seed_token: Optional[str] = Header(default=None),
):
    return rollback_staging_admin_user(x_admin_seed_token)


def _profile_update_payload(profile_update: ProfileUpdateRequest) -> dict:
    return _model_payload(profile_update, exclude_unset=True)


def _model_payload(model: BaseModel, exclude_unset: bool = False) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump(exclude_unset=exclude_unset)
    return model.dict(exclude_unset=exclude_unset)


@app.get("/migration/status")
def migration_status():
    return {
        "migration": "in_progress",
        "base44": "active",
        **get_database_status(),
        **get_migration_storage_status(),
    }
