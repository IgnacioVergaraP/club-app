"""
Blueprint de verificación de salud de la API de Club VOID.
"""

from flask import Blueprint, jsonify, current_app

health_bp = Blueprint("health", __name__)


def _environment_name() -> str:
    """Deriva el nombre del entorno a partir de la configuración activa."""
    if current_app.config.get("TESTING"):
        return "testing"
    if current_app.config.get("DEBUG"):
        return "development"
    return "production"


@health_bp.route("/health", methods=["GET"])
def health_check():
    """Endpoint de verificación de salud."""
    return jsonify(
        {
            "status": "ok",
            "service": "club-void-api",
            "version": current_app.config["API_VERSION"],
            "environment": _environment_name(),
        }
    ), 200