"""
Almacén de idempotencia en memoria.

ADVERTENCIA — NO USAR EN PRODUCCIÓN:
- No resiste reinicios del proceso.
- No funciona con múltiples workers o réplicas.
- No tiene persistencia transaccional.
En producción debe sustituirse por una tabla con restricción UNIQUE
sobre idempotency_key y transacciones atómicas.
"""

import threading
from typing import Dict, Optional, Tuple


class IdempotencyStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._by_key: Dict[str, Tuple[dict, str]] = {}

    def get(self, key: str) -> Optional[Tuple[dict, str]]:
        """Devuelve (fingerprint, order_id) si existe la clave."""
        with self._lock:
            return self._by_key.get(key)

    def try_register(self, key: str, fingerprint: dict, order_id: str) -> bool:
        """
        Intenta registrar una clave con su fingerprint y order_id.
        Devuelve True si se registró; False si ya existía.
        """
        with self._lock:
            if key in self._by_key:
                return False
            self._by_key[key] = (fingerprint, order_id)
            return True

    def clear(self) -> None:
        """Solo para tests."""
        with self._lock:
            self._by_key.clear()


idempotency_store = IdempotencyStore()