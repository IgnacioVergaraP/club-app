"""Pruebas HTTP de pedidos, catálogo, validación e idempotencia."""

import json
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from threading import Barrier
from unittest.mock import patch
from uuid import UUID, uuid4

from app import create_app
from data.product_catalog import PRODUCT_CATALOG
from services.order_service import OrderService


class OrdersRoutesTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()
        self.service = OrderService()
        self.service_patch = patch("routes.orders.order_service", self.service)
        self.service_patch.start()
        self.addCleanup(self.service_patch.stop)
        self.key = str(uuid4())

    def payload(self, quantity=1, product_id="piscola"):
        return {"items": [{"product_id": product_id, "quantity": quantity}]}

    def post(self, payload=None, key=None):
        return self.client.post(
            "/api/orders", json=self.payload() if payload is None else payload,
            headers={"Idempotency-Key": key or self.key},
        )

    def assert_error(self, response, status):
        self.assertEqual(response.status_code, status)
        self.assertTrue(response.is_json)
        body = response.get_json()
        self.assertEqual(body["status_code"], status)
        self.assertIn("error", body)
        self.assertIn("message", body)
        return body

    def test_create_order_calculates_authoritative_totals(self):
        response = self.post({"items": [
            {"product_id": "piscola", "quantity": 2},
            {"product_id": "gin-tonic", "quantity": 1},
        ]})
        self.assertEqual(response.status_code, 201)
        body = response.get_json()
        self.assertEqual(str(UUID(body["order_id"])), body["order_id"])
        self.assertEqual(body["idempotency_key"], self.key)
        self.assertEqual(body["status"], "pending_payment")
        self.assertEqual(body["currency"], "CLP")
        self.assertEqual(body["total_units"], 3)
        self.assertEqual(body["subtotal_clp"], 20000)
        self.assertEqual(body["service_fee_clp"], 0)
        self.assertEqual(body["total_clp"], 20000)
        self.assertEqual(body["items"][0]["unit_price_clp"], 6000)
        self.assertEqual(body["items"][0]["subtotal_clp"], 12000)
        for name in ("subtotal_clp", "service_fee_clp", "total_clp"):
            self.assertIs(type(body[name]), int)
        created = datetime.fromisoformat(body["created_at"].replace("Z", "+00:00"))
        expires = datetime.fromisoformat(body["expires_at"].replace("Z", "+00:00"))
        self.assertEqual((expires - created).total_seconds(), 900)

    def test_key_is_required_and_must_be_uuid(self):
        self.assert_error(self.client.post("/api/orders", json=self.payload()), 400)
        for key in ("not-a-uuid", "a" * 129, "12345678"):
            with self.subTest(key=key):
                self.assert_error(self.post(key=key), 400)

    def test_unknown_product(self):
        self.assert_error(self.post(self.payload(product_id="no-existe")), 400)

    def test_unavailable_product(self):
        # Los ocho productos reales están disponibles: simular indisponibilidad.
        with patch.dict(PRODUCT_CATALOG["piscola"], available=False):
            self.assert_error(self.post(), 400)

    def test_invalid_quantities(self):
        for quantity in (-1, 0, 1.5, True, False, "2", None, 51):
            with self.subTest(quantity=quantity):
                self.assert_error(self.post(self.payload(quantity)), 400)

    def test_empty_and_malformed_items(self):
        for payload in ({}, {"items": []}, {"items": None}, {"items": {}},
                        {"items": [None]}, {"items": [{}]}, {"items": [1]}):
            with self.subTest(payload=payload):
                self.assert_error(self.post(payload), 400)

    def test_invalid_body_and_json(self):
        for data in ("null", "[]", '"text"', '{"items":'):
            with self.subTest(data=data):
                self.assert_error(self.client.post(
                    "/api/orders", data=data, content_type="application/json",
                    headers={"Idempotency-Key": self.key}), 400)

    def test_rejects_client_prices_totals_and_status(self):
        for field in ("price_clp", "unit_price_clp", "subtotal_clp", "total_clp", "status"):
            with self.subTest(field=field):
                payload = self.payload()
                payload[field] = 1
                self.assert_error(self.post(payload), 400)
                payload = self.payload()
                payload["items"][0][field] = 1
                self.assert_error(self.post(payload), 400)

    def test_duplicate_products(self):
        payload = self.payload()
        payload["items"].append({"product_id": "piscola", "quantity": 2})
        self.assert_error(self.post(payload), 400)

    def test_order_unit_limit_and_boundary(self):
        ids = list(PRODUCT_CATALOG)[:5]
        self.assert_error(self.post({"items": [
            {"product_id": pid, "quantity": 50} for pid in ids]}), 400)
        self.assertEqual(self.post({"items": [
            {"product_id": pid, "quantity": 50} for pid in ids[:4]]}).status_code, 201)

    def test_get_existing_and_missing_order(self):
        created = self.post().get_json()
        response = self.client.get(f"/api/orders/{created['order_id']}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), created)
        self.assert_error(self.client.get(f"/api/orders/{uuid4()}"), 404)

    def test_same_key_same_content_returns_original(self):
        first = self.post()
        second = self.post()
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.get_json(), second.get_json())

    def test_item_order_does_not_change_idempotency(self):
        items = [self.payload()["items"][0],
                 {"product_id": "gin-tonic", "quantity": 1}]
        first = self.post({"items": items})
        second = self.post({"items": list(reversed(items))})
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.get_json(), second.get_json())

    def test_same_key_different_content_conflicts(self):
        self.assertEqual(self.post().status_code, 201)
        self.assert_error(self.post(self.payload(2)), 409)

    def test_different_keys_produce_unique_order_ids(self):
        first = self.post().get_json()
        second = self.post(key=str(uuid4())).get_json()
        self.assertNotEqual(first["order_id"], second["order_id"])

    def test_concurrent_retries_create_exactly_one_order(self):
        barrier = Barrier(12)

        def send(_):
            with self.app.test_client() as client:
                barrier.wait(timeout=10)
                response = client.post("/api/orders", json=self.payload(),
                                       headers={"Idempotency-Key": self.key})
                return response.status_code, response.get_json()

        with ThreadPoolExecutor(max_workers=12) as pool:
            results = list(pool.map(send, range(12)))
        self.assertEqual(sum(status == 201 for status, _ in results), 1)
        self.assertEqual(sum(status == 200 for status, _ in results), 11)
        self.assertEqual(len({body["order_id"] for _, body in results}), 1)
        self.assertEqual(len(self.service._orders), 1)

    def test_concurrent_different_content_conflicts(self):
        barrier = Barrier(2)

        def send(quantity):
            with self.app.test_client() as client:
                barrier.wait(timeout=10)
                return client.post("/api/orders", json=self.payload(quantity),
                                   headers={"Idempotency-Key": self.key}).status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = list(pool.map(send, (1, 2)))
        self.assertEqual(sorted(statuses), [201, 409])
        self.assertEqual(len(self.service._orders), 1)

    def test_expired_order_is_not_recreated_on_retry(self):
        created = self.post().get_json()
        self.service._orders[created["order_id"]].expires_at = "2000-01-01T00:00:00Z"
        response = self.client.get(f"/api/orders/{created['order_id']}")
        self.assertEqual(response.get_json()["status"], "expired")
        retry = self.post()
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(retry.get_json()["order_id"], created["order_id"])
        self.assertEqual(retry.get_json()["status"], "expired")

    def test_payload_limit(self):
        data = json.dumps(self.payload()) + " " * (8 * 1024)
        self.assert_error(self.client.post(
            "/api/orders", data=data, content_type="application/json",
            headers={"Idempotency-Key": self.key}), 413)

    def test_stream_without_content_length_is_limited(self):
        from io import BytesIO
        data = (json.dumps(self.payload()) + " " * (8 * 1024)).encode()
        self.assert_error(self.client.open(
            "/api/orders", method="POST", content_type="application/json",
            headers={"Idempotency-Key": self.key}, environ_overrides={
                "wsgi.input": BytesIO(data), "wsgi.input_terminated": True,
                "CONTENT_LENGTH": "",
            }), 413)

    def test_products_catalog(self):
        response = self.client.get("/api/products")
        self.assertEqual(response.status_code, 200)
        products = response.get_json()["products"]
        self.assertEqual(len(products), 8)
        self.assertEqual({p["id"] for p in products}, set(PRODUCT_CATALOG))
        for product in products:
            self.assertIs(type(product["price_clp"]), int)
            self.assertEqual(product, PRODUCT_CATALOG[product["id"]])

    def test_cors_accepts_idempotency_header(self):
        origin = self.app.config["CORS_ORIGINS"][0]
        response = self.client.options("/api/orders", headers={
            "Origin": origin, "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type,Idempotency-Key",
        })
        self.assertEqual(response.headers["Access-Control-Allow-Origin"], origin)
        self.assertIn("Idempotency-Key", response.headers["Access-Control-Allow-Headers"])

    def test_client_cannot_update_status(self):
        order_id = self.post().get_json()["order_id"]
        for method in ("patch", "put", "delete"):
            self.assert_error(getattr(self.client, method)(
                f"/api/orders/{order_id}", json={"status": "paid"}), 405)

    def test_internal_error_is_json_without_details(self):
        with patch.object(self.service, "create_order", side_effect=RuntimeError("private-detail")):
            body = self.assert_error(self.post(), 500)
        self.assertNotIn("private-detail", json.dumps(body))


if __name__ == "__main__":
    unittest.main()
