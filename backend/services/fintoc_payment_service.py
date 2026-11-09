"""Sesiones y verificación Sandbox en memoria, limitadas a un proceso.

Una sesión por pedido: reintentos conservan payload y clave incluso tras timeout.
No se interpretan callbacks del navegador como prueba de pago ni se emiten entradas.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import re
from threading import Lock
from uuid import UUID, uuid5
from urllib.parse import urlsplit

from services.fintoc_client import FintocClient, PaymentError


@dataclass
class PaymentAttempt:
    payload: dict
    key: str
    lock: object = field(default_factory=Lock, repr=False)
    session_id: str = None
    session_token: str = field(default=None, repr=False)
    verified: bool = False
    redirect_url: str = field(default=None, repr=False)
    hosted: bool = False


class FintocPaymentService:
    def __init__(self, config, orders, client_factory=FintocClient):
        self.config, self.orders, self.client_factory = config, orders, client_factory
        self._attempts = {}
        self._lock = Lock()

    def _check_config(self, hosted=False):
        secret = self.config.get("FINTOC_SECRET_KEY", "")
        public = self.config.get("FINTOC_PUBLIC_KEY", "")
        if (not self.config.get("FINTOC_SANDBOX_ENABLED") or
                not isinstance(secret, str) or not secret.startswith("sk_test_") or
                (not hosted and (not isinstance(public, str) or not public.startswith("pk_test_") or "..." in public)) or
                "..." in secret):
            raise PaymentError("sandbox_configuration", "Fintoc Sandbox pendiente de configurar con claves de prueba.", 503)
        return secret, public

    def public_config(self):
        try:
            _, public = self._check_config()
            return {"enabled": True, "public_key": public, "mode": "test"}
        except PaymentError:
            return {"enabled": False, "public_key": None, "mode": "test"}

    def _order(self, order_id):
        order = self.orders.get_order(order_id)
        if order is None:
            raise PaymentError("not_found", "El pedido no existe.", 404)
        return order

    def create_session(self, order_id, hosted=False):
        secret, _ = self._check_config(hosted)
        order = self._order(order_id)
        if order.status != "pending_payment" or order.currency != "CLP":
            raise PaymentError("order_not_payable", "El pedido ya no admite un intento de pago. Prepara uno nuevo.", 409)
        with self._lock:
            attempt = self._attempts.get(order_id)
            if attempt is None:
                expires = datetime.fromisoformat(order.expires_at.replace("Z", "+00:00"))
                # Fintoc exige expires_at al menos 10 minutos en el futuro.
                if expires - datetime.now(timezone.utc) < timedelta(minutes=10, seconds=5):
                    raise PaymentError("quote_expiring", "La cotización está por vencer. Vuelve a preparar el pedido.", 409)
                payload = {"flow": "payment", "ui_mode": "embedded", "amount": order.total_clp,
                           "currency": "CLP", "payment_method_types": ["card"],
                           "metadata": {"order_id": order_id}, "expires_at": order.expires_at}
                if hosted:
                    base = self._checkout_base()
                    payload.update(success_url=f"{base}/checkout/resultado?order_id={order_id}&result=returned",
                                   cancel_url=f"{base}/checkout/resultado?order_id={order_id}&result=cancelled")
                    # En la versión fijada, omitir ui_mode selecciona Checkout alojado.
                    del payload["ui_mode"]
                    del payload["payment_method_types"]
                # Derivada del UUID del pedido, sin claves proporcionadas por el navegador.
                key = str(uuid5(UUID(order_id), "club-void-fintoc-sandbox-hosted" if hosted
                                else "club-void-fintoc-sandbox-checkout"))
                attempt = self._attempts[order_id] = PaymentAttempt(payload, key, hosted=hosted)
        self._check_flow(attempt, hosted)
        if not attempt.lock.acquire(blocking=False):
            raise PaymentError("payment_in_progress", "Ya hay una operación para este pedido. Espera y reintenta.", 409)
        try:
            if attempt.verified:
                raise PaymentError("sandbox_already_verified", "Este pedido ya tiene un pago Sandbox verificado.", 409)
            if hosted and attempt.redirect_url:
                return attempt.redirect_url, False
            if attempt.session_token:
                return attempt.session_token, False
            data = self.client_factory(secret).create_session(attempt.payload, attempt.key)
            self._validate_session(data, order, hosted)
            session_id, token = data.get("id"), data.get("session_token")
            if hosted:
                redirect = data.get("redirect_url")
                if not valid_checkout_url(redirect):
                    raise PaymentError("provider_response_invalid", "Fintoc no devolvió un destino de Checkout válido.")
                attempt.session_id, attempt.redirect_url = session_id, redirect
                return redirect, True
            if (not isinstance(session_id, str) or not re.fullmatch(r"cs_[A-Za-z0-9]+", session_id) or
                    not isinstance(token, str) or not token or len(token) > 16000):
                raise PaymentError("provider_response_invalid", "Fintoc no devolvió una sesión Sandbox válida.")
            attempt.session_id, attempt.session_token = session_id, token
            return token, True
        finally:
            attempt.lock.release()

    def _validate_session(self, data, order, hosted=False):
        metadata = data.get("metadata")
        if (data.get("object") != "checkout_session" or data.get("mode") != "test" or
                type(data.get("amount")) is not int or data.get("amount") != order.total_clp or
                data.get("currency") != "CLP" or data.get("flow") != "payment" or
                (not hosted and data.get("payment_method_types") != ["card"]) or
                (hosted and (data.get("ui_mode") not in {None, "hosted"} or not isinstance(data.get("id"), str) or
                             not re.fullmatch(r"cs_[A-Za-z0-9]+", data["id"]))) or
                not isinstance(metadata, dict) or metadata.get("order_id") != order.order_id):
            raise PaymentError("provider_response_invalid", "La sesión de Fintoc no coincide con el pedido Sandbox.")

    def verify(self, order_id, hosted=False):
        secret, _ = self._check_config(hosted)
        order = self._order(order_id)
        with self._lock:
            attempt = self._attempts.get(order_id)
        if attempt is None or not attempt.session_id:
            return {"verified": False, "mode": "test", "status": "not_started", "order_id": order_id}
        self._check_flow(attempt, hosted)
        if not attempt.lock.acquire(blocking=False):
            raise PaymentError("payment_in_progress", "La verificación ya está en curso. Reintenta en unos segundos.", 409)
        try:
            data = self.client_factory(secret).get_session(attempt.session_id)
            self._validate_session(data, order, hosted)
            if data.get("id") != attempt.session_id:
                raise PaymentError("provider_response_invalid", "La sesión consultada no coincide con el intento.")
            resource = data.get("payment_resource") or {}
            intent = resource.get("payment_intent") if isinstance(resource, dict) else None
            verified = False
            status = data.get("status")
            if status not in {"created", "in_progress", "finished", "expired"}:
                raise PaymentError("provider_response_invalid", "Estado de sesión desconocido en Fintoc.")
            if intent is not None:
                if (not isinstance(intent, dict) or intent.get("object") != "payment_intent" or
                        intent.get("mode") != "test" or
                        (not hosted and intent.get("payment_type") != "card") or
                        (hosted and (not isinstance(data.get("payment_method_types"), list) or
                                     not isinstance(intent.get("payment_type"), str) or
                                     intent.get("payment_type") not in data["payment_method_types"])) or
                        type(intent.get("amount")) is not int or intent.get("amount") != order.total_clp or
                        intent.get("currency") != "CLP"):
                    raise PaymentError("provider_response_invalid", "El pago de Fintoc no coincide con el pedido Sandbox.")
                verified = status == "finished" and intent.get("status") == "succeeded"
                status = "succeeded" if verified else ("expired" if status == "expired" else intent.get("status", status))
            attempt.verified = attempt.verified or verified
            # Estado del pago separado de los estados comerciales del pedido de demostración.
            return {"verified": verified, "mode": "test", "status": status, "order_id": order_id}
        finally:
            attempt.lock.release()

    def _check_flow(self, attempt, hosted):
        if attempt.hosted != hosted:
            raise PaymentError("payment_flow_conflict", "Este pedido ya inició otro flujo de pago. Verifica su estado antes de continuar.", 409)

    def _checkout_base(self):
        base = self.config.get("FINTOC_CHECKOUT_BASE_URL", "http://localhost:4200").rstrip("/")
        url = urlsplit(base)
        if (url.scheme not in {"https", "http"} or not url.hostname or url.username or url.password or
                url.path or url.query or url.fragment or
                (url.scheme == "http" and url.hostname not in {"localhost", "127.0.0.1"})):
            raise PaymentError("sandbox_configuration", "Configura FINTOC_CHECKOUT_BASE_URL con el origen del frontend HTTPS o localhost.", 503)
        return base


def valid_checkout_url(value):
    if not isinstance(value, str) or len(value) > 4096 or any(c.isspace() for c in value):
        return False
    try:
        url = urlsplit(value)
        return (url.scheme == "https" and url.hostname in {"pay.fintoc.com", "checkout.fintoc.com", "test.pay.fintoc.com"}
                and url.port in {None, 443} and not url.username and not url.password and not url.fragment)
    except ValueError:
        return False
