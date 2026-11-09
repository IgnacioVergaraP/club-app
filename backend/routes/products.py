"""
Blueprint del catálogo de productos del backend.
"""

from flask import Blueprint, jsonify

from data.product_catalog import list_products

products_bp = Blueprint("products", __name__)


@products_bp.route("/products", methods=["GET"])
def get_products():
    return jsonify({"products": list_products()}), 200