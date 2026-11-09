"""Una invocación hasta el enlace de pago. Proveedor Fintoc simulado."""
from copy import deepcopy
from unittest import TestCase
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app import create_app
from services.fintoc_client import PaymentError
from services.fintoc_payment_service import FintocPaymentService
from services.order_service import OrderService


class DirectCheckoutTests(TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app.config.update(FINTOC_SANDBOX_ENABLED=True, FINTOC_SECRET_KEY='sk_test_fixture',
                               FINTOC_CHECKOUT_BASE_URL='https://frontend.example.com')
        self.provider = MagicMock()
        self.install_service()
        self.client = self.app.test_client()
        self.key = str(uuid4())
        self.payload = {'items': [{'product_id': 'piscola', 'quantity': 2}], 'expected_total_clp': 12000}

    def install_service(self):
        self.orders = OrderService()
        self.service = FintocPaymentService(self.app.config, self.orders, MagicMock(return_value=self.provider))
        self.app.extensions['fintoc_payments'] = self.service
        def respond(payload, key):
            return {'id': 'cs_directtest', 'object': 'checkout_session', 'mode': 'test',
                    'amount': payload['amount'], 'currency': 'CLP', 'flow': 'payment',
                    'metadata': deepcopy(payload['metadata']),
                    'redirect_url': 'https://test.pay.fintoc.com/checkout/cs_directtest'}
        self.provider.create_session.side_effect = respond

    def post(self, payload=None):
        return self.client.post('/api/orders/hosted-checkout', json=self.payload if payload is None else payload,
                                headers={'Idempotency-Key': self.key})

    def test_one_request_creates_authoritative_order_and_hosted_session(self):
        response = self.post()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json(), {'mode': 'test', 'redirect_url': 'https://test.pay.fintoc.com/checkout/cs_directtest'})
        self.assertEqual(response.headers['Cache-Control'], 'no-store')
        payload, _ = self.provider.create_session.call_args.args
        self.assertEqual(payload['amount'], 12000)
        self.assertNotIn('payment_method_types', payload)
        self.assertTrue(payload['success_url'].startswith('https://frontend.example.com/checkout/resultado'))

    def test_same_process_retries_reuse_order_and_session(self):
        self.assertEqual(self.post().status_code, 201)
        self.assertEqual(self.post().status_code, 200)
        self.assertEqual(len(self.orders._orders), 1)
        self.provider.create_session.assert_called_once()

    def test_new_instance_can_reach_fintoc_without_a_prior_order_request(self):
        self.install_service()
        self.assertEqual(self.post().status_code, 201)
        self.assertEqual(len(self.orders._orders), 1)

    def test_price_difference_and_invalid_payload_do_not_call_fintoc(self):
        self.assertEqual(self.post({**self.payload, 'expected_total_clp': 1}).status_code, 409)
        for payload in [{}, [], {**self.payload, 'expected_total_clp': True},
                        {**self.payload, 'status': 'paid'},
                        {**self.payload, 'items': [{'product_id': 'piscola', 'quantity': -1}]}]:
            self.assertEqual(self.post(payload).status_code, 400)
        self.provider.create_session.assert_not_called()

    def test_bad_key_oversized_body_and_changed_payload(self):
        self.assertEqual(self.client.post('/api/orders/hosted-checkout', json=self.payload).status_code, 400)
        response = self.client.post('/api/orders/hosted-checkout', data=' ' * 9000,
                                    content_type='application/json', headers={'Idempotency-Key': self.key})
        self.assertEqual(response.status_code, 413)
        self.assertEqual(self.post().status_code, 201)
        changed = {'items': [{'product_id': 'piscola', 'quantity': 1}], 'expected_total_clp': 6000}
        self.assertEqual(self.post(changed).status_code, 409)

    def test_provider_timeout_is_sanitized_and_retried_with_same_payload(self):
        self.provider.create_session.side_effect = PaymentError('provider_timeout', 'Reintenta.', 504)
        self.assertEqual(self.post().status_code, 504)
        first = self.provider.create_session.call_args
        self.assertEqual(self.post().status_code, 504)
        self.assertEqual(first, self.provider.create_session.call_args)

    def test_live_keys_remain_blocked(self):
        with patch.dict(self.app.config, FINTOC_SECRET_KEY='sk_live_fixture'):
            self.assertEqual(self.post().status_code, 503)
        self.provider.create_session.assert_not_called()
