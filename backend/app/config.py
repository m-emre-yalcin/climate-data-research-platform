from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
    ]

    # App
    APP_TITLE: str = "Climate Data Research Platform"
    APP_DESCRIPTION: str = (
        "A platform for processing and visualizing environmental research data"
    )
    APP_VERSION: str = "1.0.0"

    # File Upload
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_CSV_EXTENSIONS: List[str] = [".csv"]
    ALLOWED_RASTER_EXTENSIONS: List[str] = [".nc"]

    class Config:
        env_file = ".env"


settings = Settings()
