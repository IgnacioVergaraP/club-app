"""Configuración aislada de .env y de los secretos del equipo."""

import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

from app import create_app


class ConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {}, clear=True)
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.dotenv = patch("dotenv.load_dotenv", return_value=False)
        self.dotenv_mock = self.dotenv.start()
        self.addCleanup(self.dotenv.stop)
        path = Path(__file__).resolve().parents[1] / "config.py"
        spec = importlib.util.spec_from_file_location("isolated_config", path)
        self.config = importlib.util.module_from_spec(spec)
        # Importar sin SECRET_KEY ni .env debe funcionar para todos los tests.
        spec.loader.exec_module(self.config)

    def make_app(self, name):
        with patch("app.get_config", self.config.get_config):
            return create_app(name)

    def test_import_without_env_does_not_validate_production(self):
        self.dotenv_mock.assert_called_once_with()
        self.assertIsNone(self.config.ProductionConfig.SECRET_KEY)

    def test_development_without_secret_key(self):
        self.assertIs(self.config.get_config("development"), self.config.DevelopmentConfig)
        app = self.make_app("development")
        self.assertTrue(app.config["DEBUG"])
        self.assertFalse(app.config["TESTING"])
        self.assertEqual(app.test_client().get("/api/health").status_code, 200)

    def test_testing_without_secret_key(self):
        self.assertIs(self.config.get_config("testing"), self.config.TestingConfig)
        app = self.make_app("testing")
        self.assertTrue(app.config["TESTING"])
        self.assertEqual(app.test_client().get("/api/health").status_code, 200)

    def test_default_environment_is_development(self):
        self.assertIs(self.config.get_config(), self.config.DevelopmentConfig)

    def test_environment_variable_selects_testing(self):
        os.environ["FLASK_ENV"] = "testing"
        self.assertIs(self.config.get_config(), self.config.TestingConfig)

    def test_production_requires_secret_at_selection(self):
        with self.assertRaises(ValueError):
            self.config.get_config("production")
        with self.assertRaises(ValueError):
            self.make_app("production")

    def test_production_rejects_blank_and_development_default(self):
        for secret in ("", "   ", self.config.DEVELOPMENT_SECRET_KEY):
            with self.subTest(secret_type="empty_or_development_default"):
                os.environ["SECRET_KEY"] = secret
                with self.assertRaises(ValueError):
                    self.config.get_config("production")

    def test_production_accepts_explicit_secret_set_after_import(self):
        # Valor ficticio solo de prueba, nunca un secreto real.
        secret = "test-only-" + "0123456789abcdef" * 4
        os.environ["SECRET_KEY"] = secret
        self.assertIs(self.config.get_config("production"), self.config.ProductionConfig)
        app = self.make_app("production")
        self.assertEqual(app.config["SECRET_KEY"], secret)
        self.assertFalse(app.config["DEBUG"])
        self.assertFalse(app.config["TESTING"])
        self.assertEqual(app.test_client().get("/api/health").status_code, 200)

    def test_production_selected_through_environment_requires_secret(self):
        os.environ["FLASK_ENV"] = "production"
        with self.assertRaises(ValueError):
            self.config.get_config()

    def test_production_revalidates_if_secret_is_removed(self):
        os.environ["SECRET_KEY"] = "test-only-explicit-key-0123456789abcdef"
        self.config.get_config("production")
        del os.environ["SECRET_KEY"]
        with self.assertRaises(ValueError):
            self.config.get_config("production")

    def test_unknown_environment_still_rejected(self):
        with self.assertRaises(ValueError):
            self.config.get_config("unknown")


if __name__ == "__main__":
    unittest.main()
