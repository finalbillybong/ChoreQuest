import sys
from typing import Literal
from pydantic_settings import BaseSettings

WEAK_SECRETS = {"changeme", "secret", "password", "12345678", "1234567890123456"}


class Settings(BaseSettings):
    APP_MODE: Literal["selfhosted", "saas"] = "selfhosted"
    SECRET_KEY: str
    REGISTRATION_ENABLED: bool = False
    DATABASE_URL: str = "sqlite+aiosqlite:////app/data/chores_os.db"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    COOKIE_SECURE: bool = False
    LOGIN_RATE_LIMIT_MAX: int = 10
    PIN_RATE_LIMIT_MAX: int = 5
    REGISTER_RATE_LIMIT_MAX: int = 5
    CORS_ORIGINS: str = ""
    MAX_UPLOAD_SIZE_MB: int = 5
    DAILY_RESET_HOUR: int = 0
    TZ: str = "Europe/London"
    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_CLAIM_EMAIL: str = "mailto:admin@example.com"

    # Firebase (SaaS mode only)
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_CREDENTIALS_JSON: str = ""
    FIREBASE_WEB_API_KEY: str = ""

    # Stripe (SaaS mode only)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_ID: str = ""

    # Subscription gating (SaaS mode only)
    FREE_CHILD_LIMIT: int = 0
    TRIAL_DAYS: int = 7

    model_config = {"env_file": ".env", "extra": "ignore"}


def get_settings() -> Settings:
    settings = Settings()
    if len(settings.SECRET_KEY) < 16:
        print("ERROR: SECRET_KEY must be at least 16 characters")
        sys.exit(1)
    if settings.SECRET_KEY.lower() in WEAK_SECRETS:
        print("ERROR: SECRET_KEY is a known weak value. Choose a strong secret.")
        sys.exit(1)
    if settings.APP_MODE == "saas":
        if not settings.FIREBASE_PROJECT_ID:
            print("ERROR: FIREBASE_PROJECT_ID is required in SaaS mode")
            sys.exit(1)
        for key in ("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"):
            if not getattr(settings, key):
                print(f"ERROR: {key} is required in SaaS mode")
                sys.exit(1)
    return settings


settings = get_settings()
