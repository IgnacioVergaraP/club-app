"""Contrato HTTP/validación Sandbox con proveedor simulado, sin llamadas reales."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
from threading import Barrier
import time
import unittest
from unittest.mock import MagicMock, patch

from app import create_app
from services.fintoc_client import FintocClient, PaymentError
from services.fintoc_payment_service import FintocPaymentService
from services.order_service import OrderService


class FintocPaymentsTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.app.config.update(FINTOC_SANDBOX_ENABLED=True,
                               FINTOC_SECRET_KEY="sk_test_unit_fixture",
                               FINTOC_PUBLIC_KEY="pk_test_unit_fixture")
        self.orders = OrderService()
        self.order, _ = self.orders.create_order(
            {"items": [{"product_id": "piscola", "quantity": 1}]}, "unit-order")
        self.provider = MagicMock()
        self.factory = MagicMock(return_value=self.provider)
        self.service = FintocPaymentService(self.app.config, self.orders, self.factory)
        self.app.extensions["fintoc_payments"] = self.service
        self.client = self.app.test_client()
        self.session = {"id": "cs_unitABC", "object": "checkout_session", "mode": "test",
                        "amount": 6000, "currency": "CLP", "flow": "payment", "ui_mode": "embedded",
                        "payment_method_types": ["card"], "metadata": {"order_id": self.order.order_id},
                        "session_token": "sensitive_test_session_token", "status": "created",
                        "payment_resource": None}
        self.provider.create_session.return_value = deepcopy(self.session)
        self.provider.get_session.return_value = deepcopy(self.session)

    def create(self, payload=None):
        return self.client.post("/api/payments/fintoc/checkout-session",
                                json=payload if payload is not None else {"order_id": self.order.order_id})

    def verify(self):
        return self.client.get(f"/api/payments/fintoc/orders/{self.order.order_id}/status")

    def succeeded(self):
        data = deepcopy(self.session)
        data.update(status="finished", payment_resource={"payment_intent": {
            "id": "pi_unitABC", "object": "payment_intent", "amount": 6000,
            "currency": "CLP", "mode": "test", "payment_type": "card", "status": "succeeded"}})
        return data

    def test_public_config_contains_only_test_public_key(self):
        response = self.client.get("/api/payments/fintoc/config")
        self.assertEqual(response.get_json(), {"enabled": True, "public_key": "pk_test_unit_fixture", "mode": "test"})
        self.assertNotIn("sk_test", response.get_data(as_text=True))
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_disabled_or_live_credentials_never_call_provider(self):
        for setting in ({"FINTOC_SANDBOX_ENABLED": False}, {"FINTOC_SECRET_KEY": "sk_live_forbidden"},
                        {"FINTOC_PUBLIC_KEY": "pk_live_forbidden"}, {"FINTOC_SECRET_KEY": ""}):
            with self.subTest(setting=list(setting)):
                with patch.dict(self.app.config, setting):
                    self.assertEqual(self.create().status_code, 503)
                    self.assertFalse(self.client.get("/api/payments/fintoc/config").get_json()["enabled"])
        self.factory.assert_not_called()

    def test_session_uses_authoritative_order_and_returns_only_token(self):
        response = self.create()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json(), {"session_token": self.session["session_token"]})
        payload, key = self.provider.create_session.call_args.args
        self.assertEqual(payload["amount"], 6000)
        self.assertEqual(payload["currency"], "CLP")
        self.assertEqual(payload["payment_method_types"], ["card"])
        self.assertEqual(payload["ui_mode"], "embedded")
        self.assertEqual(payload["expires_at"], self.order.expires_at)
        self.assertEqual(payload["metadata"]["order_id"], self.order.order_id)
        self.assertTrue(key)
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_rejects_manipulated_amounts_states_and_unexpected_fields(self):
        for field in ("amount", "total_clp", "currency", "status", "payment_id", "session_token", "wallet"):
            self.assertEqual(self.create({"order_id": self.order.order_id, field: "tampered"}).status_code, 400)
        for payload in ({}, {"order_id": "invalid"}, {"order_id": []}, []):
            self.assertEqual(self.create(payload).status_code, 400)
        self.provider.create_session.assert_not_called()

    def test_missing_order_expired_cancelled_and_expiring_quote(self):
        self.assertEqual(self.create({"order_id": "00000000-0000-0000-0000-000000000000"}).status_code, 404)
        self.orders._orders[self.order.order_id].status = "cancelled"
        self.assertEqual(self.create().status_code, 409)
        self.orders._orders[self.order.order_id].status = "pending_payment"
        self.orders._orders[self.order.order_id].expires_at = (datetime.now(timezone.utc) + timedelta(minutes=8)).isoformat()
        self.assertEqual(self.create().get_json()["error"], "quote_expiring")
        self.orders._orders[self.order.order_id].expires_at = "2000-01-01T00:00:00Z"
        self.assertEqual(self.create().status_code, 409)
        self.provider.create_session.assert_not_called()

    def test_same_order_reuses_session(self):
        first, second = self.create(), self.create()
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.get_json(), second.get_json())
        self.provider.create_session.assert_called_once()

    def test_timeout_retry_preserves_remote_idempotency_and_payload(self):
        self.provider.create_session.side_effect = [PaymentError("provider_timeout", "Timeout", 504), deepcopy(self.session)]
        self.assertEqual(self.create().status_code, 504)
        self.assertEqual(self.create().status_code, 201)
        first, second = self.provider.create_session.call_args_list
        self.assertEqual(first, second)

    def test_concurrent_requests_do_not_create_multiple_sessions(self):
        barrier = Barrier(8)
        def delayed(payload, key):
            time.sleep(.04)
            return deepcopy(self.session)
        self.provider.create_session.side_effect = delayed
        def request(_):
            with self.app.test_client() as client:
                barrier.wait(timeout=10)
                return client.post("/api/payments/fintoc/checkout-session",
                                   json={"order_id": self.order.order_id}).status_code
        with ThreadPoolExecutor(max_workers=8) as pool:
            statuses = list(pool.map(request, range(8)))
        self.assertEqual(statuses.count(201), 1)
        self.assertTrue(all(status in (200, 201, 409) for status in statuses))
        self.provider.create_session.assert_called_once()

    def test_invalid_provider_session_is_rejected_without_token(self):
        for field, value in (("mode", "live"), ("amount", 1), ("amount", True),
                             ("currency", "USD"), ("metadata", None), ("metadata", {"order_id": "other"}),
                             ("session_token", None), ("id", "../../bad")):
            with self.subTest(field=field):
                data = deepcopy(self.session); data[field] = value
                self.provider.create_session.return_value = data
                response = self.create()
                self.assertEqual(response.status_code, 502)
                self.assertNotIn(self.session["session_token"], response.get_data(as_text=True))

    def test_server_verifies_succeeded_payment_without_changing_order_from_callback(self):
        self.create()
        self.provider.get_session.return_value = self.succeeded()
        response = self.verify()
        self.assertTrue(response.get_json()["verified"])
        self.assertEqual(response.get_json()["status"], "succeeded")
        self.provider.get_session.assert_called_once_with("cs_unitABC")
        self.assertEqual(self.orders.get_order(self.order.order_id).status, "pending_payment")
        self.assertEqual(self.create().status_code, 409)

    def test_callback_data_or_client_status_cannot_verify_a_payment(self):
        response = self.client.get(f"/api/payments/fintoc/orders/{self.order.order_id}/status?status=succeeded")
        self.assertEqual(response.get_json()["verified"], False)
        self.assertEqual(response.get_json()["status"], "not_started")
        self.assertEqual(self.client.post(f"/api/payments/fintoc/orders/{self.order.order_id}/status",
                                         json={"status": "succeeded"}).status_code, 405)
        self.provider.get_session.assert_not_called()

    def test_pending_failed_and_missing_payment_do_not_confirm_success(self):
        self.create()
        self.assertFalse(self.verify().get_json()["verified"])
        for status in ("created", "in_progress", "failed", "pending"):
            data = self.succeeded(); data["payment_resource"]["payment_intent"]["status"] = status
            self.provider.get_session.return_value = data
            self.assertFalse(self.verify().get_json()["verified"])

    def test_payment_mode_amount_currency_type_and_session_must_match(self):
        self.create()
        for field, value in (("mode", "live"), ("amount", 1), ("currency", "USD"), ("payment_type", "bank_transfer")):
            data = self.succeeded(); data["payment_resource"]["payment_intent"][field] = value
            self.provider.get_session.return_value = data
            self.assertEqual(self.verify().status_code, 502)
        data = self.succeeded(); data["id"] = "cs_other"
        self.provider.get_session.return_value = data
        self.assertEqual(self.verify().status_code, 502)

    def test_verification_remains_possible_after_quote_expires(self):
        self.create()
        self.orders._orders[self.order.order_id].expires_at = "2000-01-01T00:00:00Z"
        self.provider.get_session.return_value = self.succeeded()
        self.assertTrue(self.verify().get_json()["verified"])

    def test_http_client_uses_official_api_version_auth_and_timeout(self):
        with patch("services.fintoc_client.http.client.HTTPSConnection") as connection:
            response = connection.return_value.getresponse.return_value
            response.status = 201
            response.read.return_value = json.dumps(self.session).encode()
            client = FintocClient("sk_test_fake_transport")
            client.create_session({"amount": 6000}, "stable-key")
            connection.assert_called_once_with("api.fintoc.com", timeout=10)
            method, path = connection.return_value.request.call_args.args
            headers = connection.return_value.request.call_args.kwargs["headers"]
            self.assertEqual((method, path), ("POST", "/v2/checkout_sessions"))
            self.assertEqual(headers["Fintoc-Version"], "2026-02-01")
            self.assertEqual(headers["Idempotency-Key"], "stable-key")
            connection.return_value.close.assert_called_once()

    def test_transport_errors_do_not_expose_provider_body_or_token(self):
        with patch("services.fintoc_client.http.client.HTTPSConnection") as connection:
            response = connection.return_value.getresponse.return_value
            response.status = 401
            response.read.return_value = b'private-provider-body sk_test_secret session_token'
            with self.assertRaises(PaymentError) as caught:
                FintocClient("sk_test_fake_transport").get_session("cs_unitABC")
            self.assertNotIn("private-provider-body", str(caught.exception))
        with patch("services.fintoc_client.http.client.HTTPSConnection") as connection:
            connection.return_value.request.side_effect = TimeoutError()
            with self.assertRaises(PaymentError) as caught:
                FintocClient("sk_test_fake_transport").get_session("cs_unitABC")
            self.assertEqual(caught.exception.status, 504)
