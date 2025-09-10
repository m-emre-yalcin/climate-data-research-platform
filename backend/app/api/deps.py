from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth_service import AuthService
from app.repositories.user_repository import UserRepository
from app.repositories.data_repository import DataRepository
from app.schemas.auth import User

security = HTTPBearer()


# Dependency injection
def get_user_repository() -> UserRepository:
    return UserRepository()


def get_data_repository() -> DataRepository:
    return DataRepository()


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
) -> AuthService:
    return AuthService(user_repo)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    return auth_service.get_current_user(credentials.credentials)
