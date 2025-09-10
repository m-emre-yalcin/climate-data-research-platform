from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserInDB, User
from app.core.security import SecurityUtils
from app.core.exceptions import AuthenticationError


class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def authenticate_user(self, username: str, password: str) -> UserInDB:
        user = self.user_repo.get_user(username)
        if not user or not SecurityUtils.verify_password(
            password, user.hashed_password
        ):
            raise AuthenticationError("Incorrect username or password")
        return user

    def create_access_token(self, username: str) -> str:
        return SecurityUtils.create_access_token(data={"sub": username})

    def get_current_user(self, token: str) -> User:
        username = SecurityUtils.verify_token(token)
        if username is None:
            raise AuthenticationError("Invalid token")

        user = self.user_repo.get_user(username)
        if user is None:
            raise AuthenticationError("User not found")

        return User(username=user.username, role=user.role)
