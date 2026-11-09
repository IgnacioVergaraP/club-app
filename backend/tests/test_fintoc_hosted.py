"""Hosted Checkout Sandbox: proveedor simulado, sin dinero ni solicitudes externas."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from unittest import TestCase
from unittest.mock import MagicMock, patch

from app import create_app
from services.fintoc_client import PaymentError
from services.fintoc_payment_service import FintocPaymentService
from services.order_service import OrderService


class HostedCheckoutTests(TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app.config.update(FINTOC_SANDBOX_ENABLED=True, FINTOC_SECRET_KEY='sk_test_fixture',
                               FINTOC_PUBLIC_KEY='pk_test_fixture', FINTOC_CHECKOUT_BASE_URL='http://localhost:4200')
        self.orders = OrderService()
        self.order, _ = self.orders.create_order({'items':[{'product_id':'piscola','quantity':2}]}, 'hosted-unit')
        self.provider = MagicMock()
        self.service = FintocPaymentService(self.app.config, self.orders, MagicMock(return_value=self.provider))
        self.app.extensions['fintoc_payments'] = self.service
        self.client = self.app.test_client()
        self.session = {'id':'cs_hosted123','object':'checkout_session','mode':'test','status':'created',
                        'amount':12000,'currency':'CLP','flow':'payment','ui_mode':'hosted',
                        'payment_method_types':['bank_transfer','card'], 'metadata':{'order_id':self.order.order_id},
                        'redirect_url':'https://checkout.fintoc.com/payment?checkout_session=cs_hosted123',
                        'payment_resource':None}
        self.provider.create_session.return_value = deepcopy(self.session)
        self.provider.get_session.return_value = deepcopy(self.session)

    def create(self, payload=None):
        return self.client.post('/api/payments/fintoc/hosted-checkout-session',json=payload or {'order_id':self.order.order_id})

    def status(self):
        return self.client.get(f'/api/payments/fintoc/hosted-orders/{self.order.order_id}/status')

    def test_authoritative_amount_trusted_return_urls_and_idempotent_retry(self):
        first, second = self.create(), self.create()
        self.assertEqual((first.status_code,second.status_code),(201,200))
        self.assertEqual(first.get_json(),{'redirect_url':self.session['redirect_url'],'mode':'test'})
        payload, key = self.provider.create_session.call_args.args
        self.assertEqual(payload['amount'],12000)
        self.assertNotIn('ui_mode',payload)
        self.assertNotIn('payment_method_types',payload)
        self.assertIn(f'/checkout/resultado?order_id={self.order.order_id}&result=returned',payload['success_url'])
        self.assertIn('result=cancelled',payload['cancel_url'])
        self.assertEqual(first.headers['Cache-Control'],'no-store')
        self.provider.create_session.assert_called_once()
        self.assertTrue(key)
        self.assertNotIn('session_token',first.get_data(as_text=True))

    def test_pinned_api_hosted_response_without_ui_mode_is_supported(self):
        self.provider.create_session.return_value={**self.session,'ui_mode':None,'redirect_url':'https://test.pay.fintoc.com/checkout/cs_hosted123'}
        self.assertEqual(self.create().status_code,201)

    def test_does_not_accept_browser_amount_or_return_url(self):
        for field in ['amount','currency','status','success_url','cancel_url','redirect_url']:
            self.assertEqual(self.create({'order_id':self.order.order_id,field:'tampered'}).status_code,400)
        self.assertEqual(self.create({'order_id':'bad'}).status_code,400)
        self.provider.create_session.assert_not_called()

    def test_rejects_live_disabled_or_invalid_base_before_provider(self):
        for setting in [{'FINTOC_SECRET_KEY':'sk_live_bad'},{'FINTOC_SANDBOX_ENABLED':False},
                        {'FINTOC_CHECKOUT_BASE_URL':'http://external.example'},
                        {'FINTOC_CHECKOUT_BASE_URL':'https://example.com/path'},
                        {'FINTOC_CHECKOUT_BASE_URL':'https://example.com?x=1'}]:
            with patch.dict(self.app.config,setting):
                self.assertEqual(self.create().status_code,503)
        self.provider.create_session.assert_not_called()

    def test_hosted_requires_only_secret_key_not_express_public_key(self):
        with patch.dict(self.app.config,{'FINTOC_PUBLIC_KEY':''}):
            self.assertEqual(self.create().status_code,201)

    def test_rejects_untrusted_redirect_or_mismatched_session(self):
        for url in ['https://evil.example/pay','javascript:alert(1)','https://checkout.fintoc.com.evil.example',
                    'https://user@pay.fintoc.com/checkout/cs_a','http://pay.fintoc.com/checkout/cs_a']:
            self.provider.create_session.return_value = {**self.session,'redirect_url':url}
            self.assertEqual(self.create().status_code,502)
        for change in [{'mode':'live'},{'amount':1},{'ui_mode':'embedded'},{'metadata':{}},{'id':'bad'}]:
            self.provider.create_session.return_value = {**self.session,**change}
            self.assertEqual(self.create().status_code,502)

    def test_timeout_retry_reuses_payload_and_key(self):
        self.provider.create_session.side_effect = [PaymentError('provider_timeout','Timeout',504),deepcopy(self.session)]
        self.assertEqual(self.create().status_code,504)
        self.assertEqual(self.create().status_code,201)
        first, second = self.provider.create_session.call_args_list
        self.assertEqual(first,second)

    def test_other_payment_flow_is_blocked_for_same_order_in_both_directions(self):
        self.create()
        self.assertEqual(self.client.post('/api/payments/fintoc/checkout-session',json={'order_id':self.order.order_id}).status_code,409)
        self.service._attempts.clear()
        embedded = {**self.session,'ui_mode':'embedded','payment_method_types':['card'],'session_token':'test_token'}
        self.provider.create_session.return_value=embedded
        self.assertEqual(self.client.post('/api/payments/fintoc/checkout-session',json={'order_id':self.order.order_id}).status_code,201)
        self.assertEqual(self.create().status_code,409)

    def test_pending_failed_requires_action_and_succeeded_require_backend_verification(self):
        self.create()
        self.assertFalse(self.status().get_json()['verified'])
        for state in ['requires_action','failed','succeeded']:
            self.provider.get_session.return_value={**self.session,'status':'finished','payment_resource':{'payment_intent':{
                'object':'payment_intent','mode':'test','payment_type':'bank_transfer','amount':12000,'currency':'CLP','status':state}}}
            data=self.status().get_json()
            self.assertEqual(data['verified'],state=='succeeded')
            self.assertEqual(data['status'],state)
        self.assertEqual(self.orders.get_order(self.order.order_id).status,'pending_payment')
        self.assertEqual(self.create().status_code,409)

    def test_wrong_intent_amount_or_session_id_never_verifies(self):
        self.create()
        self.provider.get_session.return_value={**self.session,'id':'cs_other'}
        self.assertEqual(self.status().status_code,502)
        self.provider.get_session.return_value={**self.session,'status':'finished','payment_resource':{'payment_intent':{
            'object':'payment_intent','mode':'test','payment_type':'bank_transfer','amount':1,'currency':'CLP','status':'succeeded'}}}
        self.assertEqual(self.status().status_code,502)

    def test_expiring_or_cancelled_order_cannot_create_payment(self):
        self.orders._orders[self.order.order_id].expires_at=(datetime.now(timezone.utc)+timedelta(minutes=5)).isoformat()
        self.assertEqual(self.create().status_code,409)
        self.orders._orders[self.order.order_id].status='cancelled'
        self.assertEqual(self.create().status_code,409)
        self.provider.create_session.assert_not_called()
