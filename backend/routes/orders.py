"""
Blueprint de pedidos de demostración.
"""

from flask import Blueprint, current_app, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

from services.order_service import (
    IdempotencyConflictError,
    order_service,
)
from utils.validators import ValidationError, validate_idempotency_key
from services.fintoc_client import PaymentError

orders_bp = Blueprint("orders", __name__)

MAX_BODY_BYTES = 8 * 1024  # 8 KB


@orders_bp.route('/orders/hosted-checkout', methods=['POST'])
def direct_hosted_checkout():
    """Prueba visual Sandbox: pedido y sesión en la misma invocación de Vercel."""
    if (request.content_length or 0) > MAX_BODY_BYTES or len(request.get_data(cache=True)) > MAX_BODY_BYTES:
        raise RequestEntityTooLarge()
    try:
        key = validate_idempotency_key(request.headers.get('Idempotency-Key'))
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict) or set(payload) != {'items', 'expected_total_clp'}:
            raise ValidationError('Envía items y expected_total_clp.')
        expected = payload['expected_total_clp']
        if type(expected) is not int or expected <= 0 or expected > 9007199254740991:
            raise ValidationError('El total mostrado debe ser un entero CLP positivo.')
        payments = current_app.extensions['fintoc_payments']
        # El mismo servicio de pedidos que consulta Fintoc, en esta invocación.
        order, _ = payments.orders.create_order({'items': payload['items']}, key)
        if order.total_clp != expected:
            return jsonify({'error': 'price_changed', 'message':
                            'El total del servidor difiere del mostrado. Revisa el carrito antes de pagar.',
                            'status_code': 409}), 409, {'Cache-Control': 'no-store'}
        url, created = payments.create_session(order.order_id, hosted=True)
        return jsonify({'redirect_url': url, 'mode': 'test'}), 201 if created else 200, {'Cache-Control': 'no-store'}
    except ValidationError as exc:
        return _validation_response(exc)
    except IdempotencyConflictError as exc:
        return jsonify({'error': 'idempotency_conflict', 'message': str(exc), 'status_code': 409}), 409
    except PaymentError as exc:
        return jsonify({'error': exc.code, 'message': exc.message, 'status_code': exc.status}), exc.status, {'Cache-Control': 'no-store'}


@orders_bp.route("/orders", methods=["POST"])
def create_order():
    raw_length = request.content_length or 0
    if raw_length > MAX_BODY_BYTES:
        return (
            jsonify(
                {
                    "error": "payload_too_large",
                    "message": "El cuerpo de la solicitud excede el tamaño máximo.",
                    "status_code": 413,
                }
            ),
            413,
        )

    try:
        idempotency_key = validate_idempotency_key(
            request.headers.get("Idempotency-Key")
        )
    except ValidationError as exc:
        return _validation_response(exc)

    # Comprobar también los bytes reales: Content-Length puede faltar.
    # Flask limita esta lectura a 64 KB a nivel global.
    if len(request.get_data(cache=True)) > MAX_BODY_BYTES:
        raise RequestEntityTooLarge()
    payload = request.get_json(silent=True)

    try:
        order, created = order_service.create_order(payload, idempotency_key)
    except ValidationError as exc:
        return _validation_response(exc)
    except IdempotencyConflictError as exc:
        return (
            jsonify(
                {
                    "error": "idempotency_conflict",
                    "message": str(exc),
                    "status_code": 409,
                }
            ),
            409,
        )

    status_code = 201 if created else 200
    return jsonify(order.to_dict()), status_code


@orders_bp.route("/orders/<order_id>", methods=["GET"])
def get_order(order_id: str):
    order = order_service.get_order(order_id)
    if order is None:
        return (
            jsonify(
                {
                    "error": "not_found",
                    "message": "El pedido solicitado no existe.",
                    "status_code": 404,
                }
            ),
            404,
        )
    return jsonify(order.to_dict()), 200


def _validation_response(exc: ValidationError):
    payload = exc.to_dict()
    payload["status_code"] = 400
    return jsonify(payload), 400
