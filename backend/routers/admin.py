import hashlib
import os
import secrets
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import User, ApiKey, InviteCode, AuditLog, AppSetting
from backend.schemas import (
    UserResponse,
    AdminUserUpdate,
    AdminResetPasswordRequest,
    ApiKeyCreate,
    ApiKeyResponse,
    InviteCodeCreate,
    InviteCodeResponse,
    AuditLogResponse,
    SettingsUpdate,
)
from backend.auth import hash_password
from backend.dependencies import require_admin, require_parent, get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ============================================================
# Users
# ============================================================

# ---------- GET /users ----------
@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List all users."""
    result = await db.execute(select(User).order_by(User.id))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


# ---------- PUT /users/{id} ----------
@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    body: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Update user role and/or active status."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active

    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


# ---------- DELETE /users/{id} ----------
@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Deactivate a user (set is_active=false)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"detail": "User deactivated"}


# ---------- POST /users/{id}/reset-password ----------
@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    body: AdminResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin reset of a user's password."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(body.new_password)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"detail": f"Password reset for {user.username}"}


# ============================================================
# API Keys
# ============================================================

# ---------- GET /api-keys ----------
@router.get("/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List API keys (without hashes)."""
    result = await db.execute(select(ApiKey).order_by(ApiKey.created_at.desc()))
    keys = result.scalars().all()
    return [ApiKeyResponse.model_validate(k) for k in keys]


# ---------- POST /api-keys ----------
@router.post("/api-keys")
async def create_api_key(
    body: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Create a new API key. Returns the raw key once."""
    raw_key = os.urandom(32).hex()
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:8]

    api_key = ApiKey(
        name=body.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        scopes=body.scopes,
        created_by=admin.id,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return {
        "id": api_key.id,
        "name": api_key.name,
        "key": raw_key,
        "key_prefix": key_prefix,
        "scopes": api_key.scopes,
        "created_at": api_key.created_at.isoformat(),
    }


# ---------- DELETE /api-keys/{id} ----------
@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Revoke an API key (set is_active=false)."""
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.is_active = False
    await db.commit()
    return {"detail": "API key revoked"}


# ============================================================
# Invite Codes
# ============================================================

def _generate_invite_code(length: int = 8) -> str:
    # Exclude visually ambiguous characters: 0/O, 1/I/L, 2/Z, 5/S, 8/B
    chars = "ACDEFGHJKMNPQRTUVWXY34679"
    return "".join(secrets.choice(chars) for _ in range(length))


# ---------- GET /invite-codes ----------
@router.get("/invite-codes", response_model=list[InviteCodeResponse])
async def list_invite_codes(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List all invite codes."""
    result = await db.execute(select(InviteCode).order_by(InviteCode.created_at.desc()))
    codes = result.scalars().all()
    return [InviteCodeResponse.model_validate(c) for c in codes]


# ---------- POST /invite-codes ----------
@router.post("/invite-codes", response_model=InviteCodeResponse)
async def create_invite_code(
    body: InviteCodeCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Create a new invite code with a random 8-char alphanumeric string."""
    code = _generate_invite_code()

    # Ensure uniqueness
    while True:
        existing = await db.execute(
            select(InviteCode).where(InviteCode.code == code)
        )
        if existing.scalar_one_or_none() is None:
            break
        code = _generate_invite_code()

    invite = InviteCode(
        code=code,
        role=body.role,
        max_uses=body.max_uses,
        expires_at=body.expires_at,
        created_by=admin.id,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return InviteCodeResponse.model_validate(invite)


# ---------- DELETE /invite-codes/{id} ----------
@router.delete("/invite-codes/{code_id}")
async def delete_invite_code(
    code_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Delete an invite code."""
    result = await db.execute(select(InviteCode).where(InviteCode.id == code_id))
    invite = result.scalar_one_or_none()
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite code not found")

    await db.delete(invite)
    await db.commit()
    return {"detail": "Invite code deleted"}


# ============================================================
# Audit Log
# ============================================================

# ---------- GET /audit-log ----------
@router.get("/audit-log", response_model=list[AuditLogResponse])
async def list_audit_log(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    action: str | None = Query(None),
    user_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Get paginated audit log entries with optional filters."""
    stmt = select(AuditLog)

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if user_id is not None:
        stmt = stmt.where(AuditLog.user_id == user_id)

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(stmt)
    logs = result.scalars().all()
    return [AuditLogResponse.model_validate(log) for log in logs]


# ============================================================
# App Settings
# ============================================================

# ---------- GET /settings ----------
@router.get("/settings")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _parent: User = Depends(require_parent),
):
    """Get all application settings as a key-value dict."""
    result = await db.execute(select(AppSetting))
    settings_list = result.scalars().all()
    return {s.key: s.value for s in settings_list}


# ---------- GET /settings/features ----------
@router.get("/settings/features")
async def get_feature_settings(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get feature toggle settings (accessible by any authenticated user)."""
    feature_keys = ["leaderboard_enabled", "spin_wheel_enabled", "chore_trading_enabled"]
    result = await db.execute(
        select(AppSetting).where(AppSetting.key.in_(feature_keys))
    )
    settings_list = result.scalars().all()
    # Return with defaults for any missing keys
    features = {k: "true" for k in feature_keys}
    for s in settings_list:
        features[s.key] = s.value
    return features


# ---------- PUT /settings ----------
@router.put("/settings")
async def update_settings(
    body: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _parent: User = Depends(require_parent),
):
    """Update application settings. Body: {"settings": {"key": "value"}}."""
    for key, value in body.settings.items():
        result = await db.execute(
            select(AppSetting).where(AppSetting.key == key)
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.value = value
            existing.updated_at = datetime.now(timezone.utc)
        else:
            new_setting = AppSetting(key=key, value=value)
            db.add(new_setting)

    await db.commit()
    return {"detail": "Settings updated"}
