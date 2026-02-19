from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_db
from backend.models import User, UserRole, RefreshToken, InviteCode, AuditLog
from backend.schemas import (
    RegisterRequest,
    LoginRequest,
    PinLoginRequest,
    ChangePasswordRequest,
    SetPinRequest,
    UpdateProfileRequest,
    UserResponse,
    AuthResponse,
)
from backend.auth import (
    hash_password,
    verify_password,
    hash_pin,
    verify_pin,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_token,
)
from backend.dependencies import get_current_user
from backend.rate_limit import rate_limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, token: str):
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        path="/api/auth",
        secure=settings.COOKIE_SECURE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


def _clear_refresh_cookie(response: Response):
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/api/auth",
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
    )


async def _issue_tokens(
    user: User, db: AsyncSession, response: Response
) -> AuthResponse:
    access_token = create_access_token(user.id, user.role.value)
    raw_refresh, expires_at = create_refresh_token(user.id)

    stored = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw_refresh),
        expires_at=expires_at,
    )
    db.add(stored)
    await db.commit()

    _set_refresh_cookie(response, raw_refresh)

    return AuthResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


# ---------- POST /register ----------
@router.post("/register", response_model=AuthResponse)
async def register(
    body: RegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    rate_limiter.check(f"register:{request.client.host}", 5, 3600)

    # Check if this is the very first user
    count_result = await db.execute(select(func.count()).select_from(User))
    user_count = count_result.scalar()
    is_first_user = user_count == 0

    # Determine role
    if is_first_user:
        role = UserRole.admin
    else:
        role = body.role

    # Check invite code requirement for non-first users
    if not is_first_user and not settings.REGISTRATION_ENABLED:
        if not body.invite_code:
            raise HTTPException(
                status_code=400,
                detail="Invite code required when registration is not open",
            )
        result = await db.execute(
            select(InviteCode).where(InviteCode.code == body.invite_code)
        )
        invite = result.scalar_one_or_none()
        if invite is None:
            raise HTTPException(status_code=400, detail="Invalid invite code")
        if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Invite code has expired")
        if invite.times_used >= invite.max_uses:
            raise HTTPException(status_code=400, detail="Invite code has been fully used")
        # Use the invite code's role if the user is not the first
        role = invite.role
        invite.times_used += 1

    # Check duplicate username
    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Username already taken")

    user = User(
        username=body.username,
        display_name=body.display_name,
        password_hash=hash_password(body.password),
        role=role,
    )
    db.add(user)
    await db.flush()

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="register",
        details={"role": role.value, "first_user": is_first_user},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(user)

    return await _issue_tokens(user, db, response)


# ---------- POST /login ----------
@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    rate_limiter.check(f"login:{request.client.host}", 10, 300)

    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="login",
        details={"method": "password"},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()

    return await _issue_tokens(user, db, response)


# ---------- POST /pin-login ----------
@router.post("/pin-login", response_model=AuthResponse)
async def pin_login(
    body: PinLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    rate_limiter.check(f"pin:{request.client.host}", 5, 900)

    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    if user is None or user.pin_hash is None or not verify_pin(body.pin, user.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid username or PIN")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="login",
        details={"method": "pin"},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()

    return await _issue_tokens(user, db, response)


# ---------- POST /refresh ----------
@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    payload = decode_refresh_token(raw_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = int(payload["sub"])
    token_hash_value = hash_token(raw_token)

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash_value)
    )
    stored = result.scalar_one_or_none()

    if stored is None:
        raise HTTPException(status_code=401, detail="Refresh token not found")

    if stored.is_revoked:
        resp = JSONResponse({"detail": "Refresh token already used"}, status_code=401)
        _clear_refresh_cookie(resp)
        return resp

    # Load user
    user_result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        resp = JSONResponse({"detail": "User not found or inactive"}, status_code=401)
        _clear_refresh_cookie(resp)
        return resp

    # No token rotation — just issue a fresh access token.
    # Re-set the same refresh cookie to extend its max-age so active
    # sessions never silently expire.
    _set_refresh_cookie(response, raw_token)

    access_token = create_access_token(user.id, user.role.value)
    return AuthResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


# ---------- POST /logout ----------
@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token:
        token_hash_value = hash_token(raw_token)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash_value)
        )
        stored = result.scalar_one_or_none()
        if stored and not stored.is_revoked:
            stored.is_revoked = True
            await db.commit()

    _clear_refresh_cookie(response)
    return {"detail": "Logged out"}


# ---------- GET /me ----------
@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


# ---------- PUT /me ----------
@router.put("/me", response_model=UserResponse)
async def update_me(
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.avatar_config is not None:
        user.avatar_config = body.avatar_config

    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


# ---------- POST /change-password ----------
@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.password_hash = hash_password(body.new_password)
    user.updated_at = datetime.now(timezone.utc)

    # Invalidate all refresh tokens
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.is_revoked == False,
        )
    )
    for tok in result.scalars().all():
        tok.is_revoked = True

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="password_change",
        details={},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()

    return {"detail": "Password changed. Please log in again."}


# ---------- POST /set-pin ----------
@router.post("/set-pin")
async def set_pin(
    body: SetPinRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user.pin_hash = hash_pin(body.pin)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"detail": "PIN set successfully"}
