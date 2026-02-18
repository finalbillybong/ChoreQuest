import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from backend.config import settings
from backend.database import init_db, async_session
from backend.seed import seed_database
from backend.auth import decode_access_token
from backend.websocket_manager import ws_manager
from backend.models import (
    Chore, ChoreAssignment, ChoreRotation, User, UserRole,
    AssignmentStatus, Recurrence, RefreshToken,
)

STATIC_DIR = Path(__file__).parent.parent / "static"


async def daily_reset_task():
    while True:
        now = datetime.now(timezone.utc)
        target_hour = settings.DAILY_RESET_HOUR
        next_run = now.replace(hour=target_hour, minute=0, second=0, microsecond=0)
        if now >= next_run:
            next_run += timedelta(days=1)
        wait_seconds = (next_run - now).total_seconds()
        await asyncio.sleep(wait_seconds)

        try:
            async with async_session() as db:
                today = date.today()

                # Generate assignments for recurring chores
                result = await db.execute(
                    select(Chore).where(
                        Chore.is_active == True,
                        Chore.recurrence != Recurrence.once,
                    )
                )
                chores = result.scalars().all()

                for chore in chores:
                    should_generate = False
                    if chore.recurrence == Recurrence.daily:
                        should_generate = True
                    elif chore.recurrence == Recurrence.weekly:
                        should_generate = today.weekday() == chore.created_at.weekday()
                    elif chore.recurrence == Recurrence.custom and chore.custom_days:
                        should_generate = today.weekday() in chore.custom_days

                    if should_generate:
                        # Find assigned users from rotations or past assignments
                        rotation_result = await db.execute(
                            select(ChoreRotation).where(ChoreRotation.chore_id == chore.id)
                        )
                        rotation = rotation_result.scalar_one_or_none()

                        if rotation:
                            # Check if rotation should advance
                            should_advance = False
                            if rotation.last_rotated is None:
                                should_advance = True
                            elif rotation.cadence.value == "daily":
                                should_advance = True
                            elif rotation.cadence.value == "weekly":
                                days_since = (datetime.now(timezone.utc) - rotation.last_rotated).days
                                should_advance = days_since >= 7

                            if should_advance and rotation.last_rotated is not None:
                                rotation.current_index = (rotation.current_index + 1) % len(rotation.kid_ids)
                                rotation.last_rotated = datetime.now(timezone.utc)

                            if rotation.last_rotated is None:
                                rotation.last_rotated = datetime.now(timezone.utc)

                            user_ids = [rotation.kid_ids[rotation.current_index]]
                        else:
                            past_result = await db.execute(
                                select(ChoreAssignment.user_id).where(
                                    ChoreAssignment.chore_id == chore.id
                                ).distinct()
                            )
                            user_ids = list(past_result.scalars().all())

                        for uid in user_ids:
                            existing = await db.execute(
                                select(ChoreAssignment).where(
                                    ChoreAssignment.chore_id == chore.id,
                                    ChoreAssignment.user_id == uid,
                                    ChoreAssignment.date == today,
                                )
                            )
                            if existing.scalar_one_or_none() is None:
                                db.add(ChoreAssignment(
                                    chore_id=chore.id, user_id=uid,
                                    date=today, status=AssignmentStatus.pending,
                                ))

                # Cleanup expired refresh tokens
                await db.execute(
                    select(RefreshToken).where(
                        RefreshToken.expires_at < datetime.now(timezone.utc)
                    )
                )

                await db.commit()
        except Exception as e:
            print(f"Daily reset error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with async_session() as db:
        await seed_database(db)
    task = asyncio.create_task(daily_reset_task())
    yield
    task.cancel()


app = FastAPI(title="ChoresOS", lifespan=lifespan)

# CORS - restrictive
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security headers middleware
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: blob:; "
        "connect-src 'self' wss: ws:; "
        "frame-ancestors 'none'"
    )
    if settings.COOKIE_SECURE:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Import and register routers
from backend.routers import (
    auth, chores, rewards, points, stats, calendar,
    notifications, admin, avatar, wishlist, events, spin, rotations, uploads,
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


# Health check
@app.get("/api/health")
async def health():
    return {"status": "ok"}


# WebSocket endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    payload = decode_access_token(token)
    if payload is None or int(payload["sub"]) != user_id:
        await websocket.close(code=4001)
        return

    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)


# Serve frontend static files
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Never serve frontend HTML for unmatched API routes
        if full_path.startswith("api/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
