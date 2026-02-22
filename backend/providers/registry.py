"""Provider registry: selects concrete providers based on APP_MODE.

Import ``auth_provider`` and ``billing_provider`` from here anywhere
in the application.  They are initialised once at import time based
on the ``APP_MODE`` setting.
"""

from backend.config import settings
from backend.providers.auth.base import AuthProvider
from backend.providers.billing.base import BillingProvider

auth_provider: AuthProvider
billing_provider: BillingProvider


def _init_providers() -> tuple[AuthProvider, BillingProvider]:
    if settings.APP_MODE == "saas":
        from backend.providers.auth.firebase import FirebaseAuthProvider
        from backend.providers.billing.stripe_billing import StripeBillingProvider
        return FirebaseAuthProvider(), StripeBillingProvider()

    from backend.providers.auth.jwt_local import JWTAuthProvider
    from backend.providers.billing.noop import NoOpBillingProvider
    return JWTAuthProvider(), NoOpBillingProvider()


auth_provider, billing_provider = _init_providers()
