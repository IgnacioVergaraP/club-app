"""HTTPS oficial Fintoc v2. Exclusivo Sandbox; sin secretos en logs o errores."""

import http.client
import json
import re
import socket


class PaymentError(Exception):
    def __init__(self, code, message, status=502):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


class FintocClient:
    API_HOST = "api.fintoc.com"
    API_VERSION = "2026-02-01"

    def __init__(self, secret_key):
        if not isinstance(secret_key, str) or not secret_key.startswith("sk_test_"):
            raise PaymentError("sandbox_configuration", "Fintoc requiere una clave secreta de prueba.", 503)
        self._secret_key = secret_key

    def create_session(self, payload, idempotency_key):
        return self._request("POST", "/v2/checkout_sessions", payload, idempotency_key)

    def get_session(self, session_id):
        if not isinstance(session_id, str) or not re.fullmatch(r"cs_[A-Za-z0-9]+", session_id):
            raise PaymentError("provider_response_invalid", "Fintoc devolvió una referencia inválida.")
        return self._request("GET", f"/v2/checkout_sessions/{session_id}")

    def _request(self, method, path, payload=None, idempotency_key=None):
        headers = {"Authorization": self._secret_key, "Accept": "application/json",
                   "Content-Type": "application/json", "Fintoc-Version": self.API_VERSION}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        connection = http.client.HTTPSConnection(self.API_HOST, timeout=10)
        try:
            connection.request(method, path,
                               body=json.dumps(payload) if payload is not None else None,
                               headers=headers)
            response = connection.getresponse()
            raw = response.read(256 * 1024 + 1)
            if response.status < 200 or response.status >= 300:
                # Nunca propagar body, Authorization, session_token o mensajes del proveedor.
                raise PaymentError("provider_unavailable", "Fintoc no pudo completar la solicitud Sandbox. Puedes reintentar de forma segura.")
            if len(raw) > 256 * 1024:
                raise ValueError
            data = json.loads(raw)
            if not isinstance(data, dict):
                raise ValueError
            return data
        except (socket.timeout, TimeoutError):
            raise PaymentError("provider_timeout", "Fintoc demoró demasiado. Reintenta la misma operación.", 504) from None
        except (OSError, http.client.HTTPException, ValueError, UnicodeError):
            raise PaymentError("provider_unavailable", "No se pudo consultar Fintoc Sandbox.") from None
        finally:
            connection.close()
