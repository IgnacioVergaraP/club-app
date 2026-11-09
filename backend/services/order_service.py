"""
Servicio de pedidos de demostración.

Responsable de:
- Validar contenido.
- Calcular importes desde el catálogo del backend.
- Crear pedidos temporales con idempotencia.
- Almacenar en memoria.
"""

import uuid
from copy import deepcopy
from threading import RLock
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

from data.product_catalog import get_product
from models.order import Order, OrderItem
from services.idempotency_store import IdempotencyStore, idempotency_store
from utils.money import compute_subtotal
from utils.validators import ValidationError, validate_payload

SERVICE_FEE_CLP = 0
QUOTE_TTL_MINUTES = 15


class IdempotencyConflictError(Exception):
    """La misma clave se usó con contenido distinto."""


class OrderNotFoundError(Exception):
    """Pedido inexistente."""


class OrderService:
    def __init__(self, store=None) -> None:
        self._orders: Dict[str, Order] = {}
        self._store = store if store is not None else IdempotencyStore()
        self._lock = RLock()

    def create_order(self, payload, idempotency_key: str) -> Tuple[Order, bool]:
        """
        Crea o recupera un pedido.

        Devuelve (order, created) donde created indica si fue nuevo.
        Lanza IdempotencyConflictError si la clave ya existe con distinto
        contenido.
        """
        items = validate_payload(payload)
        fingerprint = self._build_fingerprint(items)

        # Una sola sección crítica incluye lectura, creación y publicación.
        # Ningún hilo puede observar una clave cuyo pedido aún no existe.
        with self._lock:
            existing = self._store.get(idempotency_key)
            if existing is not None:
                existing_fingerprint, order_id = existing
                if existing_fingerprint != fingerprint:
                    raise IdempotencyConflictError(
                        "La Idempotency-Key ya fue usada con un contenido distinto."
                    )
                return self.get_order(order_id), False

            order = self._build_order(items, idempotency_key)
            self._orders[order.order_id] = order
            self._store.try_register(idempotency_key, fingerprint, order.order_id)
            return deepcopy(order), True

    def get_order(self, order_id: str) -> Optional[Order]:
        with self._lock:
            order = self._orders.get(order_id)
            if order is None:
                return None
            if (order.status == "pending_payment"
                    and datetime.now(timezone.utc) >= datetime.fromisoformat(
                        order.expires_at.replace("Z", "+00:00"))):
                order.status = "expired"
            return deepcopy(order)

    def _build_fingerprint(self, items) -> dict:
        return {
            "items": sorted(
                [{"product_id": pid, "quantity": qty} for pid, qty in items],
                key=lambda x: x["product_id"],
            )
        }

    def _build_order(self, items, idempotency_key: str) -> Order:
        order_items = []
        subtotal_total = 0
        total_units = 0

        for product_id, quantity in items:
            product = get_product(product_id)
            if product is None:
                # No debería ocurrir: validado antes.
                raise ValidationError(f"Producto inexistente: {product_id}.")

            unit_price = product["price_clp"]
            subtotal = compute_subtotal(unit_price, quantity)
            subtotal_total += subtotal
            total_units += quantity

            order_items.append(
                OrderItem(
                    product_id=product_id,
                    name=product["name"],
                    quantity=quantity,
                    unit_price_clp=unit_price,
                    subtotal_clp=subtotal,
                )
            )

        now = datetime.now(timezone.utc)
        expires = now + timedelta(minutes=QUOTE_TTL_MINUTES)

        return Order(
            order_id=str(uuid.uuid4()),
            idempotency_key=idempotency_key,
            status="pending_payment",
            items=order_items,
            total_units=total_units,
            subtotal_clp=subtotal_total,
            service_fee_clp=SERVICE_FEE_CLP,
            total_clp=subtotal_total + SERVICE_FEE_CLP,
            currency="CLP",
            created_at=now.isoformat(timespec="seconds").replace("+00:00", "Z"),
            expires_at=expires.isoformat(timespec="seconds").replace("+00:00", "Z"),
        )


order_service = OrderService(idempotency_store)
