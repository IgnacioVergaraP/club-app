"""Pruebas del servicio de pedidos."""

import unittest

from services.idempotency_store import idempotency_store
from services.order_service import (
    IdempotencyConflictError,
    OrderService,
)
from utils.validators import ValidationError


class OrderServiceTests(unittest.TestCase):
    def setUp(self):
        idempotency_store.clear()
        self.service = OrderService()

    def test_create_valid_order_calculates_totals(self):
        payload = {
            "items": [
                {"product_id": "piscola", "quantity": 2},
                {"product_id": "gin-tonic", "quantity": 1},
            ]
        }
        order, created = self.service.create_order(payload, "key-aaaa-0001")
        self.assertTrue(created)
        self.assertEqual(order.status, "pending_payment")
        self.assertEqual(order.total_units, 3)
        self.assertEqual(order.subtotal_clp, 6000 * 2 + 8000)
        self.assertEqual(order.total_clp, order.subtotal_clp)
        self.assertEqual(order.service_fee_clp, 0)
        self.assertEqual(order.currency, "CLP")

    def test_reject_unknown_product(self):
        payload = {"items": [{"product_id": "no-existe", "quantity": 1}]}
        with self.assertRaises(ValidationError):
            self.service.create_order(payload, "key-aaaa-0002")

    def test_reject_zero_or_negative_quantity(self):
        for qty in (0, -1, -50):
            payload = {"items": [{"product_id": "piscola", "quantity": qty}]}
            with self.assertRaises(ValidationError):
                self.service.create_order(payload, f"key-aaaa-neg-{qty}")

    def test_reject_decimal_quantity(self):
        payload = {"items": [{"product_id": "piscola", "quantity": 1.5}]}
        with self.assertRaises(ValidationError):
            self.service.create_order(payload, "key-aaaa-dec")

    def test_reject_empty_items(self):
        with self.assertRaises(ValidationError):
            self.service.create_order({"items": []}, "key-aaaa-empty")

    def test_reject_duplicate_product_ids(self):
        payload = {
            "items": [
                {"product_id": "piscola", "quantity": 1},
                {"product_id": "piscola", "quantity": 2},
            ]
        }
        with self.assertRaises(ValidationError):
            self.service.create_order(payload, "key-aaaa-dup")

    def test_reject_price_field_from_frontend(self):
        payload = {
            "items": [
                {"product_id": "piscola", "quantity": 1, "price_clp": 1}
            ]
        }
        with self.assertRaises(ValidationError):
            self.service.create_order(payload, "key-aaaa-price")

    def test_idempotency_same_key_same_content(self):
        payload = {"items": [{"product_id": "piscola", "quantity": 1}]}
        order1, created1 = self.service.create_order(payload, "key-aaaa-idem-1")
        order2, created2 = self.service.create_order(payload, "key-aaaa-idem-1")
        self.assertTrue(created1)
        self.assertFalse(created2)
        self.assertEqual(order1.order_id, order2.order_id)

    def test_idempotency_same_key_different_content(self):
        payload1 = {"items": [{"product_id": "piscola", "quantity": 1}]}
        payload2 = {"items": [{"product_id": "piscola", "quantity": 2}]}
        self.service.create_order(payload1, "key-aaaa-idem-2")
        with self.assertRaises(IdempotencyConflictError):
            self.service.create_order(payload2, "key-aaaa-idem-2")

    def test_idempotency_order_not_found(self):
        self.assertIsNone(self.service.get_order("00000000-0000-0000-0000-000000000000"))


if __name__ == "__main__":
    unittest.main()