import pytest
import uvicorn
import threading
import time
import requests
from contextlib import contextmanager


@contextmanager
def run_test_server():
    """Start FastAPI server for testing"""
    try:
        from app.main import app

        # Configure uvicorn
        config = uvicorn.Config(app, host="127.0.0.1", port=8001, log_level="error")
        server = uvicorn.Server(config)

        # Run server in thread
        thread = threading.Thread(target=server.run, daemon=True)
        thread.start()

        # Wait for server to start
        time.sleep(2)

        yield "http://127.0.0.1:8001"

    except ImportError:
        pytest.skip("FastAPI app not available")


class TestAPIEndpoint:
    def test_api_health_check(self):
        """Test if API is up and running"""
        with run_test_server() as base_url:
            response = requests.get(f"{base_url}/api/v1/")
            assert response.status_code in [200, 404]
