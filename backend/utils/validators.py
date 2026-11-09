"""
Validación de solicitudes de pedidos.
"""

from typing import List, Tuple
from uuid import UUID

from data.product_catalog import get_product
from utils.money import MAX_QUANTITY_PER_PRODUCT, MAX_UNITS_PER_ORDER

ALLOWED_ITEM_FIELDS = {"product_id", "quantity"}
ALLOWED_PAYLOAD_FIELDS = {"items"}


class ValidationError(Exception):
    """Error de validación de la solicitud."""

    def __init__(self, message: str, field: str = None):
        super().__init__(message)
        self.message = message
        self.field = field

    def to_dict(self) -> dict:
        payload = {"error": "validation_error", "message": self.message}
        if self.field:
            payload["field"] = self.field
        return payload


def validate_idempotency_key(raw_key: str) -> str:
    if not raw_key or not isinstance(raw_key, str):
        raise ValidationError("El header Idempotency-Key es obligatorio.", "Idempotency-Key")
    stripped = raw_key.strip()
    try:
        parsed = UUID(stripped)
        if str(parsed) != stripped.lower():
            raise ValueError
    except ValueError:
        raise ValidationError("Idempotency-Key debe ser un UUID válido.", "Idempotency-Key")
    return str(parsed)


def validate_payload(payload) -> List[Tuple[str, int]]:
    """
    Valida el payload de POST /api/orders.

    Devuelve una lista de tuplas (product_id, quantity) validadas
    y normalizadas.
    """
    if not isinstance(payload, dict):
        raise ValidationError("El cuerpo debe ser un objeto JSON.")

    unexpected = set(payload.keys()) - ALLOWED_PAYLOAD_FIELDS
    if unexpected:
        raise ValidationError(
            f"Campos no permitidos: {sorted(unexpected)}", "body"
        )

    items = payload.get("items")
    if not isinstance(items, list) or len(items) == 0:
        raise ValidationError("Debes incluir al menos un producto.", "items")

    seen_ids = set()
    total_units = 0
    result: List[Tuple[str, int]] = []

    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValidationError(
                f"El item {index} debe ser un objeto.", f"items[{index}]"
            )
        unexpected = set(item.keys()) - ALLOWED_ITEM_FIELDS
        if unexpected:
            raise ValidationError(
                f"Campos no permitidos en el item {index}: {sorted(unexpected)}",
                f"items[{index}]",
            )

        product_id = item.get("product_id")
        quantity = item.get("quantity")

        if not isinstance(product_id, str) or not product_id.strip():
            raise ValidationError(
                f"product_id inválido en item {index}.", f"items[{index}].product_id"
            )

        if isinstance(quantity, bool) or not isinstance(quantity, int):
            raise ValidationError(
                f"quantity debe ser un entero en item {index}.",
                f"items[{index}].quantity",
            )

        if quantity <= 0:
            raise ValidationError(
                f"quantity debe ser mayor que cero en item {index}.",
                f"items[{index}].quantity",
            )

        if quantity > MAX_QUANTITY_PER_PRODUCT:
            raise ValidationError(
                f"quantity excede el máximo por producto ({MAX_QUANTITY_PER_PRODUCT}).",
                f"items[{index}].quantity",
            )

        if product_id in seen_ids:
            raise ValidationError(
                f"product_id duplicado: {product_id}.", f"items[{index}].product_id"
            )
        seen_ids.add(product_id)

        product = get_product(product_id)
        if product is None:
            raise ValidationError(
                f"Producto inexistente: {product_id}.",
                f"items[{index}].product_id",
            )

        if not product["available"]:
            raise ValidationError(
                f"Producto no disponible: {product_id}.",
                f"items[{index}].product_id",
            )

        total_units += quantity
        result.append((product_id, quantity))

    if total_units > MAX_UNITS_PER_ORDER:
        raise ValidationError(
            f"El pedido excede el máximo de unidades ({MAX_UNITS_PER_ORDER}).",
            "items",
        )

    return result
