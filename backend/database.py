from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    async with engine.begin() as conn:
        # Enable WAL mode
        await conn.exec_driver_sql("PRAGMA journal_mode=WAL")
        from backend.models import (  # noqa: F401
            User, Chore, ChoreAssignment, ChoreCategory, ChoreRotation,
            Reward, RewardRedemption, PointTransaction, Achievement,
            UserAchievement, WishlistItem, SeasonalEvent, Notification,
            SpinResult, ApiKey, AuditLog, AppSetting, InviteCode, RefreshToken,
        )
        await conn.run_sync(Base.metadata.create_all)

        # Lightweight column migrations for SQLite (create_all won't add
        # new columns to existing tables).
        for col, typedef in [
            ("fulfilled_by", "INTEGER REFERENCES users(id)"),
            ("fulfilled_at", "DATETIME"),
        ]:
            try:
                await conn.exec_driver_sql(
                    f"ALTER TABLE reward_redemptions ADD COLUMN {col} {typedef}"
                )
            except Exception:
                pass  # column already exists


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
