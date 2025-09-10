from typing import Optional, Dict
from app.schemas.auth import UserInDB
from app.core.security import SecurityUtils


class UserRepository:
    def __init__(self):
        # Keep user in memory for simplicity
        self._users_db = {
            "researcher": UserInDB(
                username="researcher",
                hashed_password=SecurityUtils.get_password_hash("iiasa_climate123"),
                role="researcher",
            )
        }

    def get_user(self, username: str) -> Optional[UserInDB]:
        return self._users_db.get(username)

    def create_user(self, user: UserInDB) -> UserInDB:
        self._users_db[user.username] = user
        return user
