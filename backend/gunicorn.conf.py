"""Una sola instancia y worker mientras los pedidos Sandbox vivan en memoria."""
import os

bind = f"0.0.0.0:{int(os.getenv('PORT', '5000'))}"
workers = 1
worker_class = 'gthread'
threads = 4
timeout = 45
accesslog = None  # Evitar registrar URLs con referencias de pedidos.
errorlog = '-'
