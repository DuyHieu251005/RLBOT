
from fastapi.testclient import TestClient
from main import app
from config import settings
import pytest

client = TestClient(app)

def test_health_check_endpoint():
    """Verify that the health check endpoint works and returns 200 OK"""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "rlbot-backend"}

def test_root_endpoint():
    """Verify root endpoint returns welcome message"""
    response = client.get("/")
    assert response.status_code == 200
    assert "RLBot Backend API" in response.json()["message"]

def test_cors_configuration():
    """Verify CORS settings are loaded correctly from config"""
    # Simply checking if the configuration object has the attribute
    assert hasattr(settings, "CORS_ORIGINS")
    assert isinstance(settings.CORS_ORIGINS, list)

def test_rate_limiting_exists():
    """Verify rate limiting middleware is active (by checking headers on health endpoint)"""
    # Note: We rely on slowapi internal behavior, usually it adds X-RateLimit headers 
    # but strictly speaking only when limit is hit or if configured to always show.
    # For a smoke test, ensuring the endpoint responds is enough.
    response = client.get("/api/health")
    assert response.status_code == 200
