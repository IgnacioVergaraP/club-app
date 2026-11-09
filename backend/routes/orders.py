"""
Blueprint de pedidos de demostración.
"""

from flask import Blueprint, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

from services.order_service import (
    IdempotencyConflictError,
    order_service,
)
from utils.validators import ValidationError, validate_idempotency_key

orders_bp = Blueprint("orders", __name__)

MAX_BODY_BYTES = 8 * 1024  # 8 KB


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
