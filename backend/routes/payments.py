"""Endpoints internos Sandbox. No aceptan estados ni importes del navegador."""
from uuid import UUID

from flask import Blueprint, current_app, jsonify, request

from services.fintoc_client import PaymentError

payments_bp = Blueprint("payments", __name__)


def payment_service():
    return current_app.extensions["fintoc_payments"]


@payments_bp.errorhandler(PaymentError)
def payment_error(error):
    response = jsonify({"error": error.code, "message": error.message, "status_code": error.status})
    response.headers["Cache-Control"] = "no-store"
    return response, error.status


@payments_bp.after_request
def no_cache(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@payments_bp.get("/payments/fintoc/config")
def config():
    return jsonify(payment_service().public_config())


@payments_bp.post("/payments/fintoc/checkout-session")
def checkout_session():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or set(payload) != {"order_id"}:
        raise PaymentError("validation_error", "Envía únicamente order_id. Los importes los determina Flask.", 400)
    order_id = validate_order_id(payload["order_id"])
    token, created = payment_service().create_session(order_id)
    return jsonify({"session_token": token}), 201 if created else 200


@payments_bp.get("/payments/fintoc/orders/<order_id>/status")
def status(order_id):
    return jsonify(payment_service().verify(validate_order_id(order_id)))


@payments_bp.post("/payments/fintoc/hosted-checkout-session")
def hosted_checkout_session():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or set(payload) != {"order_id"}:
        raise PaymentError("validation_error", "Envía únicamente order_id. Los importes los determina Flask.", 400)
    url, created = payment_service().create_session(validate_order_id(payload["order_id"]), hosted=True)
    return jsonify({"redirect_url": url, "mode": "test"}), 201 if created else 200


@payments_bp.get("/payments/fintoc/hosted-orders/<order_id>/status")
def hosted_status(order_id):
    return jsonify(payment_service().verify(validate_order_id(order_id), hosted=True))


def validate_order_id(value):
    try:
        if not isinstance(value, str) or str(UUID(value)) != value:
            raise ValueError
    except (ValueError, TypeError, AttributeError):
        raise PaymentError("validation_error", "order_id debe ser un UUID válido.", 400) from None
    return value
