"""
Punto de entrada de la aplicación Flask para Club VOID.
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import get_config
from routes.health import health_bp
from routes.orders import orders_bp
from routes.products import products_bp
from routes.payments import payments_bp
from services.fintoc_payment_service import FintocPaymentService
from services.order_service import order_service


def create_app(config_name: str = None) -> Flask:
    app = Flask(__name__)

    config_class = get_config(config_name)
    app.config.from_object(config_class)
    app.config.update(
        FINTOC_CHECKOUT_BASE_URL=os.getenv("FINTOC_CHECKOUT_BASE_URL", "http://localhost:4200"),
        FINTOC_SANDBOX_ENABLED=os.getenv("FINTOC_SANDBOX_ENABLED", "false").lower() == "true",
        FINTOC_SECRET_KEY=os.getenv("FINTOC_SECRET_KEY", ""),
        FINTOC_PUBLIC_KEY=os.getenv("FINTOC_PUBLIC_KEY", ""),
    )
    app.extensions["fintoc_payments"] = FintocPaymentService(app.config, order_service)

    app.json.ensure_ascii = False
    app.json.sort_keys = False

    # Limitar tamaño máximo de solicitudes (defensa básica).
    app.config["MAX_CONTENT_LENGTH"] = 64 * 1024

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=False,
    )

    app.register_blueprint(health_bp, url_prefix=app.config["API_PREFIX"])
    app.register_blueprint(products_bp, url_prefix=app.config["API_PREFIX"])
    app.register_blueprint(orders_bp, url_prefix=app.config["API_PREFIX"])
    app.register_blueprint(payments_bp, url_prefix=app.config["API_PREFIX"])

    register_error_handlers(app)

    @app.route("/", methods=["GET"])
    def index():
        return jsonify(
            {
                "name": "Club VOID API",
                "version": app.config["API_VERSION"],
                "status": "running",
            }
        ), 200

    return app


def register_error_handlers(app: Flask) -> None:

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify(
            {"error": "bad_request", "message": "La solicitud es inválida.", "status_code": 400}
        ), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify(
            {"error": "not_found", "message": "El recurso solicitado no existe.", "status_code": 404}
        ), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify(
            {"error": "method_not_allowed", "message": "El método HTTP no está permitido para este recurso.", "status_code": 405}
        ), 405

    @app.errorhandler(413)
    def payload_too_large(error):
        return jsonify(
            {"error": "payload_too_large", "message": "El cuerpo de la solicitud excede el tamaño máximo.", "status_code": 413}
        ), 413

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify(
            {"error": "internal_server_error", "message": "Ocurrió un error interno en el servidor.", "status_code": 500}
        ), 500

    @app.errorhandler(Exception)
    def unhandled_exception(error):
        if isinstance(error, HTTPException):
            return jsonify(
                {"error": error.name.lower().replace(" ", "_"),
                 "message": error.description, "status_code": error.code}
            ), error.code
        app.logger.error("Error interno no manejado en la API.")
        return jsonify(
            {"error": "internal_server_error", "message": "Ocurrió un error interno en el servidor.", "status_code": 500}
        ), 500


app = create_app()


if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "127.0.0.1")
    port = int(os.getenv("FLASK_PORT", "5000"))
    app.run(host=host, port=port, debug=app.config["DEBUG"])
