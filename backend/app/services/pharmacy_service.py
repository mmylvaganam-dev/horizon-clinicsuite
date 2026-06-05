from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import PharmacyProduct, PharmacySale, PharmacySaleItem
from app.db.session import SessionLocal
from app.services.audit_service import log_audit_event


MANAGE_ROLES = {"admin", "staff"}
READ_ROLES = MANAGE_ROLES | {"provider", "viewer"}

PLACEHOLDER_PRODUCTS = [
    {
        "id": "placeholder-paracetamol",
        "organization_id": None,
        "base44_id": None,
        "name": "Paracetamol 500mg",
        "sku": "PCM-500",
        "batch_number": "TEST-BATCH",
        "quantity_on_hand": 100,
        "unit_price": 25.0,
        "status": "active",
        "source": "placeholder",
    }
]


def list_pharmacy_products(rbac_context: dict, query: str = "") -> dict:
    _require_read_role(rbac_context)
    normalized_query = (query or "").strip().lower()

    if SessionLocal is None:
        return {"products": _filter_products(PLACEHOLDER_PRODUCTS, normalized_query), "source": "placeholder"}

    try:
        with SessionLocal() as db:
            statement = select(PharmacyProduct).order_by(PharmacyProduct.name.asc()).limit(200)
            products = db.execute(statement).scalars().all()
            serialized = [serialize_product(product) for product in products]
            return {"products": _filter_products(serialized, normalized_query), "source": "postgresql"}
    except SQLAlchemyError:
        return {"products": _filter_products(PLACEHOLDER_PRODUCTS, normalized_query), "source": "placeholder"}


def create_pharmacy_product(payload: dict, rbac_context: dict) -> dict:
    _require_manage_role(rbac_context)
    product_payload = _normalize_product_payload(payload, rbac_context)

    if SessionLocal is None:
        product = {"id": f"placeholder-product-{uuid4()}", **product_payload, "source": "placeholder"}
        return {"created": True, "product": product, "source": "placeholder"}

    try:
        with SessionLocal() as db:
            product = PharmacyProduct(
                organization_id=_uuid_or_none(product_payload.get("organization_id")),
                base44_id=product_payload.get("base44_id"),
                name=product_payload["name"],
                sku=product_payload.get("sku"),
                batch_number=product_payload.get("batch_number"),
                quantity_on_hand=product_payload["quantity_on_hand"],
                unit_price=product_payload["unit_price"],
                status="active",
                metadata_json={"created_from": "pharmacy_transition_module"},
            )
            db.add(product)
            db.commit()
            db.refresh(product)
            return {"created": True, "product": serialize_product(product), "source": "postgresql"}
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pharmacy product create failed: {exc.__class__.__name__}",
        ) from exc


def create_pharmacy_sale(payload: dict, rbac_context: dict) -> dict:
    _require_manage_role(rbac_context)
    sale_payload = _normalize_sale_payload(payload, rbac_context)

    if SessionLocal is None:
        sale = _placeholder_sale(sale_payload)
        return {"created": True, "sale": sale, "stock_updated": True, "source": "placeholder"}

    try:
        with SessionLocal() as db:
            items = []
            subtotal = Decimal("0")

            for item_payload in sale_payload["items"]:
                product = None
                product_id = _uuid_or_none(item_payload.get("product_id"))
                if product_id:
                    product = db.get(PharmacyProduct, product_id)
                    if product is None:
                        raise HTTPException(status_code=404, detail="Pharmacy product not found")
                    if product.quantity_on_hand < item_payload["quantity"]:
                        raise HTTPException(status_code=422, detail=f"Insufficient stock for {product.name}")
                    product.quantity_on_hand -= item_payload["quantity"]

                product_name = item_payload.get("product_name") or (product.name if product else "Manual item")
                unit_price = Decimal(str(item_payload.get("unit_price") or (product.unit_price if product else 0)))
                line_total = unit_price * Decimal(item_payload["quantity"])
                subtotal += line_total
                items.append((product, product_name, item_payload["quantity"], unit_price, line_total))

            discount = Decimal(str(sale_payload.get("discount") or 0))
            total = max(Decimal("0"), subtotal - discount)
            sale = PharmacySale(
                organization_id=_uuid_or_none(sale_payload.get("organization_id")),
                sold_by_user_id=_uuid_or_none(sale_payload.get("sold_by_user_id")),
                receipt_number=_receipt_number(),
                customer_name=sale_payload.get("customer_name"),
                payment_method=sale_payload["payment_method"],
                subtotal=subtotal,
                discount=discount,
                total=total,
                status="completed",
                metadata_json={"transition_scope": "live_sri_lanka_pharmacy"},
            )
            db.add(sale)
            db.flush()

            for product, product_name, quantity, unit_price, line_total in items:
                db.add(
                    PharmacySaleItem(
                        sale_id=sale.id,
                        product_id=product.id if product else None,
                        product_name=product_name,
                        quantity=quantity,
                        unit_price=unit_price,
                        line_total=line_total,
                        metadata_json={},
                    )
                )

            db.commit()
            db.refresh(sale)
            serialized_sale = serialize_sale(sale)
            _log_sale(serialized_sale, rbac_context)
            return {
                "created": True,
                "sale": serialized_sale,
                "stock_updated": True,
                "source": "postgresql",
            }
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pharmacy sale create failed: {exc.__class__.__name__}",
        ) from exc


def list_pharmacy_sales(rbac_context: dict) -> dict:
    _require_read_role(rbac_context)

    if SessionLocal is None:
        return {"sales": [_placeholder_sale({"items": []})], "source": "placeholder"}

    try:
        with SessionLocal() as db:
            sales = db.execute(
                select(PharmacySale).order_by(PharmacySale.created_at.desc()).limit(100)
            ).scalars().all()
            return {"sales": [serialize_sale(sale) for sale in sales], "source": "postgresql"}
    except SQLAlchemyError:
        return {"sales": [_placeholder_sale({"items": []})], "source": "placeholder"}


def get_pharmacy_daily_summary(rbac_context: dict) -> dict:
    _require_read_role(rbac_context)
    today = date.today()

    if SessionLocal is None:
        return {
            "date": today.isoformat(),
            "sale_count": 0,
            "total_sales": 0,
            "source": "placeholder",
        }

    try:
        with SessionLocal() as db:
            rows = db.execute(
                select(
                    func.count(PharmacySale.id),
                    func.coalesce(func.sum(PharmacySale.total), 0),
                ).where(func.date(PharmacySale.created_at) == today)
            ).one()
            return {
                "date": today.isoformat(),
                "sale_count": int(rows[0] or 0),
                "total_sales": float(rows[1] or 0),
                "source": "postgresql",
            }
    except SQLAlchemyError:
        return {
            "date": today.isoformat(),
            "sale_count": 0,
            "total_sales": 0,
            "source": "placeholder",
        }


def serialize_product(product: PharmacyProduct) -> dict:
    return {
        "id": str(product.id),
        "organization_id": str(product.organization_id) if product.organization_id else None,
        "base44_id": product.base44_id,
        "name": product.name,
        "sku": product.sku,
        "batch_number": product.batch_number,
        "quantity_on_hand": product.quantity_on_hand,
        "unit_price": float(product.unit_price or 0),
        "status": product.status,
        "source": "postgresql",
    }


def serialize_sale(sale: PharmacySale) -> dict:
    return {
        "id": str(sale.id),
        "organization_id": str(sale.organization_id) if sale.organization_id else None,
        "sold_by_user_id": str(sale.sold_by_user_id) if sale.sold_by_user_id else None,
        "receipt_number": sale.receipt_number,
        "customer_name": sale.customer_name,
        "payment_method": sale.payment_method,
        "subtotal": float(sale.subtotal or 0),
        "discount": float(sale.discount or 0),
        "total": float(sale.total or 0),
        "status": sale.status,
        "created_at": sale.created_at.isoformat() if sale.created_at else None,
        "items": [
            {
                "id": str(item.id),
                "product_id": str(item.product_id) if item.product_id else None,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price or 0),
                "line_total": float(item.line_total or 0),
            }
            for item in sale.items
        ],
        "source": "postgresql",
    }


def _normalize_product_payload(payload: dict, rbac_context: dict) -> dict:
    app_user = rbac_context.get("app_user") or {}
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="Product name is required")
    return {
        "organization_id": payload.get("organization_id") or app_user.get("primary_organization_id"),
        "base44_id": payload.get("base44_id"),
        "name": name,
        "sku": (payload.get("sku") or "").strip() or None,
        "batch_number": (payload.get("batch_number") or "").strip() or None,
        "quantity_on_hand": int(payload.get("quantity_on_hand") or 0),
        "unit_price": Decimal(str(payload.get("unit_price") or 0)),
    }


def _normalize_sale_payload(payload: dict, rbac_context: dict) -> dict:
    app_user = rbac_context.get("app_user") or {}
    items = payload.get("items") or []
    if not items:
        raise HTTPException(status_code=422, detail="At least one sale item is required")
    return {
        "organization_id": payload.get("organization_id") or app_user.get("primary_organization_id"),
        "sold_by_user_id": app_user.get("id"),
        "customer_name": (payload.get("customer_name") or "").strip() or None,
        "payment_method": (payload.get("payment_method") or "cash").strip().lower(),
        "discount": payload.get("discount") or 0,
        "items": [_normalize_sale_item(item) for item in items],
    }


def _normalize_sale_item(item: dict) -> dict:
    quantity = int(item.get("quantity") or 0)
    if quantity <= 0:
        raise HTTPException(status_code=422, detail="Sale item quantity must be greater than zero")
    return {
        "product_id": item.get("product_id"),
        "product_name": (item.get("product_name") or "").strip() or None,
        "quantity": quantity,
        "unit_price": item.get("unit_price"),
    }


def _filter_products(products: list[dict], query: str) -> list[dict]:
    if not query:
        return products
    return [
        product
        for product in products
        if query in " ".join(str(product.get(key) or "") for key in ("name", "sku", "batch_number")).lower()
    ]


def _placeholder_sale(payload: dict) -> dict:
    return {
        "id": f"placeholder-pharmacy-sale-{uuid4()}",
        "receipt_number": "PLACEHOLDER",
        "customer_name": payload.get("customer_name"),
        "payment_method": payload.get("payment_method", "cash"),
        "subtotal": 0,
        "discount": payload.get("discount", 0),
        "total": 0,
        "status": "completed",
        "items": payload.get("items", []),
        "source": "placeholder",
    }


def _receipt_number() -> str:
    return f"HCS-PH-{date.today().strftime('%Y%m%d')}-{str(uuid4())[:8].upper()}"


def _log_sale(sale: dict, rbac_context: dict) -> None:
    app_user = rbac_context.get("app_user") or {}
    log_audit_event(
        action_type="pharmacy_sale_created",
        resource_type="pharmacy_sale",
        resource_id=sale.get("id"),
        organization_id=app_user.get("primary_organization_id"),
        user_id=app_user.get("id"),
        metadata_json={
            "receipt_number": sale.get("receipt_number"),
            "total": sale.get("total"),
            "source": sale.get("source"),
        },
    )


def _require_manage_role(rbac_context: dict) -> None:
    roles = set(rbac_context.get("roles") or [])
    if roles.isdisjoint(MANAGE_ROLES):
        raise HTTPException(status_code=403, detail="User does not have the required role")


def _require_read_role(rbac_context: dict) -> None:
    roles = set(rbac_context.get("roles") or [])
    if roles.isdisjoint(READ_ROLES):
        raise HTTPException(status_code=403, detail="User does not have the required role")


def _uuid_or_none(value: Optional[str]):
    if not value:
        return None
    try:
        return UUID(str(value))
    except ValueError:
        return None
