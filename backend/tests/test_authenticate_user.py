import pytest
import pandas as pd
from pathlib import Path
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

from app.services.auth_service import AuthService
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserInDB
from app.core.exceptions import AuthenticationError


class TestAuthService:
    @pytest.fixture
    def mock_user_repo(self):
        repo = Mock(spec=UserRepository)
        return repo

    @pytest.fixture
    def auth_service(self, mock_user_repo):
        return AuthService(mock_user_repo)

    def test_authenticate_user(self, auth_service, mock_user_repo):
        """Test user authentication with test credentials"""
        test_user = UserInDB(
            username="researcher",
            hashed_password="$2b$12$hashed_password",
            role="researcher",
        )
        mock_user_repo.get_user.return_value = test_user

        with patch(
            "app.core.security.SecurityUtils.verify_password", return_value=True
        ):
            result = auth_service.authenticate_user("researcher", "iiasa_climate123")

            assert result.username == "researcher"
            mock_user_repo.get_user.assert_called_once_with("researcher")

    def test_authenticate_user_invalid_credentials(self, auth_service, mock_user_repo):
        """Test authentication with invalid credentials"""
        mock_user_repo.get_user.return_value = None

        with pytest.raises(AuthenticationError):
            auth_service.authenticate_user("invalid", "invalid")
