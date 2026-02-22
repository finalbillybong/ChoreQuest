import asyncio
import logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s: %(message)s")
from contextlib import asynccontextmanager
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import delete, select

from backend.config import settings
from backend.database import init_db, async_session
from backend.seed import seed_database
from backend.websocket_manager import ws_manager
from backend.models import RefreshToken, Family, FamilyMember, User
from backend.providers.registry import auth_provider
from backend.services.assignment_generator import generate_daily_assignments
from backend.services.push_hook import install_push_hooks

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent.parent / "static"


async def daily_reset_task():
    """Background task that runs once per day at the configured hour.

    Responsibilities:
    - Generate today's recurring chore assignments (with rotation advancement)
    - Clean up expired refresh tokens
    """
    while True:
        now = datetime.utcnow()
        target_hour = settings.DAILY_RESET_HOUR
        next_run = now.replace(hour=target_hour, minute=0, second=0, microsecond=0)
        if now >= next_run:
            next_run += timedelta(days=1)
        wait_seconds = (next_run - now).total_seconds()
        await asyncio.sleep(wait_seconds)

        try:
            async with async_session() as db:
                today = date.today()

                # Generate assignments per family
                families = (await db.execute(select(Family))).scalars().all()
                for fam in families:
                    await generate_daily_assignments(db, today, family_id=fam.id)

                # Clean up expired refresh tokens
                await db.execute(
                    delete(RefreshToken).where(
                        RefreshToken.expires_at < datetime.utcnow()
                    )
                )

                await db.commit()
        except Exception:
            logger.exception("Daily reset error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    install_push_hooks()
    async with async_session() as db:
        await seed_database(db)
    task = asyncio.create_task(daily_reset_task())
    yield
    task.cancel()


app = FastAPI(title="ChoreQuest", lifespan=lifespan)

# CORS - configurable via CORS_ORIGINS env var (comma-separated), empty = no cross-origin
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' https://apis.google.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: blob:; "
        "connect-src 'self' wss: ws: "
        "https://identitytoolkit.googleapis.com "
        "https://securetoken.googleapis.com "
        "https://*.googleapis.com "
        "https://apis.google.com "
        "https://www.googleapis.com "
        "https://firebase.googleapis.com "
        "https://firebaseinstallations.googleapis.com; "
        "worker-src 'self'; "
        "frame-src 'self' https://*.firebaseapp.com https://*.googleapis.com; "
        "frame-ancestors 'none'"
    )
    if settings.COOKIE_SECURE:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Import and register routers
from backend.routers import (  # noqa: E402
    auth, chores, rewards, points, stats, calendar,
    notifications, admin, avatar, wishlist, events, spin, rotations, uploads, push,
    billing, families,
)

app.include_router(auth.router)
app.include_router(chores.router)
app.include_router(rewards.router)
app.include_router(points.router)
app.include_router(stats.router)
app.include_router(calendar.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(avatar.router)
app.include_router(wishlist.router)
app.include_router(events.router)
app.include_router(spin.router)
app.include_router(rotations.router)
app.include_router(uploads.router)
app.include_router(push.router)
app.include_router(billing.router)
app.include_router(families.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/config")
async def public_config():
    """Public (unauthenticated) endpoint exposing the app mode and any
    client-side config the frontend needs to initialise correctly."""
    cfg: dict = {"app_mode": settings.APP_MODE}
    if settings.APP_MODE == "saas":
        cfg["firebase"] = {
            "apiKey": settings.FIREBASE_WEB_API_KEY,
            "projectId": settings.FIREBASE_PROJECT_ID,
            "authDomain": f"{settings.FIREBASE_PROJECT_ID}.firebaseapp.com",
        }
    return cfg


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    payload = await auth_provider.validate_token(token)
    if payload is None:
        await websocket.close(code=4001)
        return

    family_id = None
    if settings.APP_MODE == "saas":
        firebase_uid = payload.get("uid") or payload.get("sub")
        async with async_session() as db:
            result = await db.execute(
                select(User.id).where(User.firebase_uid == firebase_uid)
            )
            row = result.scalar_one_or_none()
        if row != user_id:
            await websocket.close(code=4001)
            return
        async with async_session() as db:
            fm_result = await db.execute(
                select(FamilyMember.family_id).where(FamilyMember.user_id == user_id).limit(1)
            )
            family_id = fm_result.scalar_one_or_none()
    else:
        if int(payload["sub"]) != user_id:
            await websocket.close(code=4001)
            return

    await ws_manager.connect(websocket, user_id, family_id=family_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)


# Serve frontend static files
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/sw.js")
    async def serve_sw():
        """Serve service worker with no-cache so browsers always fetch the latest."""
        return FileResponse(
            str(STATIC_DIR / "sw.js"),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Service-Worker-Allowed": "/"},
        )

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        file_path = STATIC_DIR / full_path
        if file_path.resolve().is_relative_to(STATIC_DIR.resolve()) and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
