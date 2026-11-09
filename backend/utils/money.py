"""
Utilidades monetarias. Todos los importes son enteros en CLP.

Nunca se usa float para dinero.
"""

# Límites para evitar abusos: 50 unidades por producto y 200 por pedido.
MAX_QUANTITY_PER_PRODUCT = 50
MAX_UNITS_PER_ORDER = 200


def to_clp(amount: int) -> int:
    """Valida que un valor sea un entero CLP no negativo."""
    if not isinstance(amount, int) or isinstance(amount, bool):
        raise TypeError("El importe debe ser un entero.")
    if amount < 0:
        raise ValueError("El importe no puede ser negativo.")
    return amount


def compute_subtotal(unit_price_clp: int, quantity: int) -> int:
    return to_clp(unit_price_clp * quantity)
