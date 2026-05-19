from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import DocumentMetadata
from app.db.session import SessionLocal


PLACEHOLDER_DOCUMENTS = [
    {
        "id": "placeholder-document-storage-test",
        "organization_id": None,
        "uploaded_by_user_id": None,
        "file_name": "storage-test.txt",
        "storage_path": "test-uploads/storage-test.txt",
        "download_url": None,
        "mime_type": "text/plain",
        "file_size": 34,
        "created_at": None,
        "source": "placeholder",
    }
]


def register_document_metadata(payload: dict, rbac_context: dict) -> dict:
    app_user = rbac_context.get("app_user") or {}

    if SessionLocal is None:
        return {
            "document": _placeholder_document(payload),
            "registered": True,
            "source": "placeholder",
        }

    try:
        with SessionLocal() as db:
            document = DocumentMetadata(
                organization_id=app_user.get("primary_organization_id"),
                uploaded_by_user_id=app_user.get("id"),
                file_name=payload["file_name"],
                storage_path=payload["storage_path"],
                download_url=payload.get("download_url"),
                mime_type=payload.get("mime_type"),
                file_size=payload.get("file_size"),
            )
            db.add(document)
            db.commit()
            db.refresh(document)
            return {
                "document": serialize_document(document),
                "registered": True,
                "source": "postgresql",
            }
    except SQLAlchemyError:
        return {
            "document": _placeholder_document(payload),
            "registered": True,
            "source": "placeholder",
        }


def list_document_metadata() -> dict:
    if SessionLocal is None:
        return _placeholder_documents_response()

    try:
        with SessionLocal() as db:
            documents = db.execute(
                select(DocumentMetadata).order_by(DocumentMetadata.created_at.desc())
            ).scalars().all()
            return {
                "documents": [serialize_document(document) for document in documents],
                "source": "postgresql",
            }
    except SQLAlchemyError:
        return _placeholder_documents_response()


def serialize_document(document: DocumentMetadata) -> dict:
    return {
        "id": str(document.id),
        "organization_id": str(document.organization_id) if document.organization_id else None,
        "uploaded_by_user_id": (
            str(document.uploaded_by_user_id) if document.uploaded_by_user_id else None
        ),
        "file_name": document.file_name,
        "storage_path": document.storage_path,
        "download_url": document.download_url,
        "mime_type": document.mime_type,
        "file_size": document.file_size,
        "created_at": document.created_at.isoformat() if document.created_at else None,
        "source": "postgresql",
    }


def _placeholder_documents_response() -> dict:
    return {
        "documents": PLACEHOLDER_DOCUMENTS,
        "source": "placeholder",
    }


def _placeholder_document(payload: dict) -> dict:
    return {
        "id": f"placeholder-document-{uuid4()}",
        "organization_id": None,
        "uploaded_by_user_id": None,
        "file_name": payload["file_name"],
        "storage_path": payload["storage_path"],
        "download_url": payload.get("download_url"),
        "mime_type": payload.get("mime_type"),
        "file_size": payload.get("file_size"),
        "created_at": None,
        "source": "placeholder",
    }
