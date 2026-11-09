"""
Configuración de la aplicación Flask para Club VOID.

Define clases de configuración para los entornos Development, Testing
y Production. Los valores sensibles se cargan desde variables de entorno
definidas en el archivo .env (nunca hardcodeadas aquí).
"""

import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env antes de definir las clases
load_dotenv()

DEVELOPMENT_SECRET_KEY = "dev-secret-key-change-in-production"


class BaseConfig:
    """Configuración base compartida por todos los entornos."""

    SECRET_KEY = os.getenv("SECRET_KEY", DEVELOPMENT_SECRET_KEY)
    DEBUG = False
    TESTING = False

    CORS_ORIGINS = [
        origin.strip() for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:4200"
        ).split(",") if origin.strip()
    ]

    API_PREFIX = os.getenv("API_PREFIX", "/api")
    API_VERSION = os.getenv("API_VERSION", "v1")


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    DEBUG = True


class ProductionConfig(BaseConfig):
    DEBUG = False

    # Se carga y valida únicamente al seleccionar este entorno en get_config().
    SECRET_KEY = None


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(config_name: str = None):
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    config_class = config_by_name.get(config_name)
    if config_class is None:
        raise ValueError(
            f"Configuración desconocida: '{config_name}'. "
            f"Valores válidos: {list(config_by_name.keys())}"
        )
    if config_class is ProductionConfig:
        secret_key = os.getenv("SECRET_KEY")
        if (not secret_key or not secret_key.strip()
                or secret_key.strip() == DEVELOPMENT_SECRET_KEY):
            raise ValueError(
                "SECRET_KEY válida es obligatoria en producción; "
                "no se permite la clave predeterminada de desarrollo."
            )
        ProductionConfig.SECRET_KEY = secret_key

    return config_class
