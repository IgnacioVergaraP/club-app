"""Pruebas del almacén de idempotencia."""

import unittest

from services.idempotency_store import IdempotencyStore


class IdempotencyStoreTests(unittest.TestCase):
    def setUp(self):
        self.store = IdempotencyStore()

    def test_register_then_get(self):
        self.assertTrue(self.store.try_register("k1", {"items": []}, "order-1"))
        self.assertEqual(self.store.get("k1"), ({"items": []}, "order-1"))

    def test_duplicate_register_returns_false(self):
        self.assertTrue(self.store.try_register("k1", {"items": []}, "order-1"))
        self.assertFalse(self.store.try_register("k1", {"items": []}, "order-2"))
        self.assertEqual(self.store.get("k1"), ({"items": []}, "order-1"))

    def test_get_missing_returns_none(self):
        self.assertIsNone(self.store.get("no-existe"))


if __name__ == "__main__":
    unittest.main()