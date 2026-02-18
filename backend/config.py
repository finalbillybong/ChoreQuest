import sys
from pydantic_settings import BaseSettings

WEAK_SECRETS = {"changeme", "secret", "password", "12345678", "1234567890123456"}


class Settings(BaseSettings):
    SECRET_KEY: str
    REGISTRATION_ENABLED: bool = False
    DATABASE_URL: str = "sqlite+aiosqlite:////app/data/chores_os.db"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    COOKIE_SECURE: bool = False
    LOGIN_RATE_LIMIT_MAX: int = 10
    PIN_RATE_LIMIT_MAX: int = 5
    REGISTER_RATE_LIMIT_MAX: int = 5
    MAX_UPLOAD_SIZE_MB: int = 5
    DAILY_RESET_HOUR: int = 0
    TZ: str = "Europe/London"

    model_config = {"env_file": ".env", "extra": "ignore"}


def get_settings() -> Settings:
    settings = Settings()
    if len(settings.SECRET_KEY) < 16:
        print("ERROR: SECRET_KEY must be at least 16 characters")
        sys.exit(1)
    if settings.SECRET_KEY.lower() in WEAK_SECRETS:
        print("ERROR: SECRET_KEY is a known weak value. Choose a strong secret.")
        sys.exit(1)
    return settings


settings = get_settings()
