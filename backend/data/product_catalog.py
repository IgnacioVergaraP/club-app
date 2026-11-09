"""
Catálogo autoritativo de productos de Club VOID (backend).

Estos datos son la única fuente de verdad para calcular importes de pedidos.
El frontend puede enviar product_id y cantidad, pero NUNCA precios.

Mismos IDs, precios y disponibilidad que `mock-products.ts` del frontend.
"""

from typing import Dict, Optional, TypedDict


class ProductRecord(TypedDict):
    id: str
    name: str
    description: str
    price_clp: int
    category: str
    available: bool


# Catálogo inmutable de demostración. En producción se reemplazará por
# consultas a la base de datos.
PRODUCT_CATALOG: Dict[str, ProductRecord] = {
    "piscola": {
        "id": "piscola",
        "name": "Piscola",
        "description": "Pisco con bebida cola y hielo.",
        "price_clp": 6000,
        "category": "pisco",
        "available": True,
    },
    "ron-cola": {
        "id": "ron-cola",
        "name": "Ron Cola",
        "description": "Ron con bebida cola y hielo.",
        "price_clp": 6500,
        "category": "ron",
        "available": True,
    },
    "gin-tonic": {
        "id": "gin-tonic",
        "name": "Gin Tonic",
        "description": "Gin con tónica, limón y hielo.",
        "price_clp": 8000,
        "category": "gin",
        "available": True,
    },
    "vodka-tonica": {
        "id": "vodka-tonica",
        "name": "Vodka Tónica",
        "description": "Vodka con tónica y hielo.",
        "price_clp": 7500,
        "category": "vodka",
        "available": True,
    },
    "mojito": {
        "id": "mojito",
        "name": "Mojito",
        "description": "Ron, menta, limón, azúcar y soda.",
        "price_clp": 8500,
        "category": "cocteles",
        "available": True,
    },
    "pisco-sour": {
        "id": "pisco-sour",
        "name": "Pisco Sour",
        "description": "Pisco, limón, azúcar y clara de huevo.",
        "price_clp": 7000,
        "category": "cocteles",
        "available": True,
    },
    "cuba-libre": {
        "id": "cuba-libre",
        "name": "Cuba Libre",
        "description": "Ron, cola y limón.",
        "price_clp": 6500,
        "category": "cocteles",
        "available": True,
    },
    "agua-mineral": {
        "id": "agua-mineral",
        "name": "Agua mineral",
        "description": "Botella de agua mineral sin gas.",
        "price_clp": 2500,
        "category": "sin-alcohol",
        "available": True,
    },
}


def get_product(product_id: str) -> Optional[ProductRecord]:
    return PRODUCT_CATALOG.get(product_id)


def list_products() -> list:
    """Devuelve el catálogo como lista para serialización JSON."""
    return list(PRODUCT_CATALOG.values())