"""
Modelo de pedido de demostración de Club VOID.

No persiste en base de datos. Se almacena en memoria en el servicio.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List


ORDER_STATUSES = {"pending_payment", "expired", "cancelled"}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


@dataclass
class OrderItem:
    product_id: str
    name: str
    quantity: int
    unit_price_clp: int
    subtotal_clp: int

    def to_dict(self) -> dict:
        return {
            "product_id": self.product_id,
            "name": self.name,
            "quantity": self.quantity,
            "unit_price_clp": self.unit_price_clp,
            "subtotal_clp": self.subtotal_clp,
        }


@dataclass
class Order:
    order_id: str
    idempotency_key: str
    status: str
    items: List[OrderItem]
    total_units: int
    subtotal_clp: int
    service_fee_clp: int
    total_clp: int
    currency: str
    created_at: str
    expires_at: str

    def to_dict(self) -> dict:
        return {
            "order_id": self.order_id,
            "idempotency_key": self.idempotency_key,
            "status": self.status,
            "items": [item.to_dict() for item in self.items],
            "total_units": self.total_units,
            "subtotal_clp": self.subtotal_clp,
            "service_fee_clp": self.service_fee_clp,
            "total_clp": self.total_clp,
            "currency": self.currency,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
        }

    def to_fingerprint(self) -> Dict:
        """Huella del contenido relevante para idempotencia."""
        return {
            "items": [
                {"product_id": item.product_id, "quantity": item.quantity}
                for item in sorted(self.items, key=lambda i: i.product_id)
            ]
        }