import logging

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings

logger = logging.getLogger(__name__)

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

_engine_kwargs: dict = {"echo": False}
if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def _add_column_if_missing(conn, table: str, col: str, col_type_sqlite: str, col_type_pg: str | None = None):
    """Lightweight migration: add a column if it doesn't already exist.
    Uses IF NOT EXISTS so we never fail and leave a PostgreSQL transaction aborted."""
    typedef = col_type_sqlite if _is_sqlite else (col_type_pg or col_type_sqlite)
    if _is_sqlite:
        sql = f"ALTER TABLE {table} ADD COLUMN {col} {typedef}"
        try:
            await conn.exec_driver_sql(sql)
            logger.info("Added column %s.%s", table, col)
        except Exception:
            pass  # column already exists; SQLite doesn't abort the txn
    else:
        # PostgreSQL: use IF NOT EXISTS so we don't abort the transaction on "column exists"
        sql = f'ALTER TABLE {table} ADD COLUMN IF NOT EXISTS "{col}" {typedef}'
        await conn.exec_driver_sql(sql)
        logger.info("Added column %s.%s (if missing)", table, col)


async def _migrate_family_id_columns(conn):
    """Add family_id to all family-scoped tables that predate the Family model."""
    family_scoped_tables = [
        "chore_categories", "chores", "chore_assignments", "chore_rotations",
        "chore_exclusions", "chore_assignment_rules", "rewards",
        "reward_redemptions", "point_transactions", "seasonal_events",
        "notifications", "spin_results", "wishlist_items", "invite_codes",
    ]
    for table in family_scoped_tables:
        await _add_column_if_missing(
            conn, table, "family_id", "INTEGER REFERENCES families(id)"
        )


async def _backfill_family_ids(conn):
    """Create a default family (if needed) and backfill family_id on all
    existing rows that don't have one yet."""
    row = (await conn.exec_driver_sql(
        "SELECT id FROM families WHERE name = 'Default Family' LIMIT 1"
    )).first()
    if row:
        family_id = row[0]
    else:
        if _is_sqlite:
            await conn.exec_driver_sql(
                "INSERT INTO families (name, created_at) VALUES ('Default Family', CURRENT_TIMESTAMP)"
            )
            row = (await conn.exec_driver_sql("SELECT last_insert_rowid()")).first()
        else:
            row = (await conn.exec_driver_sql(
                "INSERT INTO families (name, created_at) VALUES ('Default Family', NOW()) RETURNING id"
            )).first()
        family_id = row[0]
        logger.info("Created default family with id=%s", family_id)

    if _is_sqlite:
        await conn.exec_driver_sql(
            """
            INSERT OR IGNORE INTO family_members (family_id, user_id, role)
            SELECT :fid, id, CASE WHEN role = 'kid' THEN 'child' ELSE 'parent' END
            FROM users
            WHERE id NOT IN (SELECT user_id FROM family_members WHERE family_id = :fid)
            """,
            {"fid": family_id},
        )
    else:
        await conn.exec_driver_sql(
            """
            INSERT INTO family_members (family_id, user_id, role, created_at)
            SELECT %(fid)s, id,
                   (CASE WHEN role = 'kid' THEN 'child' ELSE 'parent' END)::familymemberrole,
                   NOW()
            FROM users
            WHERE id NOT IN (SELECT user_id FROM family_members WHERE family_id = %(fid)s)
            ON CONFLICT (family_id, user_id) DO NOTHING
            """,
            {"fid": family_id},
        )

    await conn.exec_driver_sql(
        """
        UPDATE families SET owner_user_id = (
            SELECT user_id FROM family_members
            WHERE family_id = :fid AND role = 'parent'
            ORDER BY user_id LIMIT 1
        ) WHERE id = :fid AND owner_user_id IS NULL
        """,
        {"fid": family_id},
    )

    tables = [
        "chore_categories", "chores", "chore_assignments", "chore_rotations",
        "chore_exclusions", "chore_assignment_rules", "rewards",
        "reward_redemptions", "point_transactions", "seasonal_events",
        "notifications", "spin_results", "wishlist_items", "invite_codes",
    ]
    for table in tables:
        await conn.exec_driver_sql(
            f"UPDATE {table} SET family_id = :fid WHERE family_id IS NULL",
            {"fid": family_id},
        )
    logger.info("Backfilled family_id=%s on all family-scoped tables", family_id)


async def init_db():
    async with engine.begin() as conn:
        if _is_sqlite:
            await conn.exec_driver_sql("PRAGMA journal_mode=WAL")

        from backend.models import (  # noqa: F401
            Family, FamilyMember,
            User, Chore, ChoreAssignment, ChoreCategory, ChoreRotation,
            ChoreExclusion, ChoreAssignmentRule, QuestTemplate,
            Reward, RewardRedemption, PointTransaction,
            Achievement, UserAchievement, WishlistItem, SeasonalEvent,
            Notification, SpinResult, ApiKey, AuditLog, AppSetting,
            InviteCode, RefreshToken, PushSubscription,
            AvatarItem, UserAvatarItem,
        )
        await conn.run_sync(Base.metadata.create_all)

        await _add_column_if_missing(
            conn, "reward_redemptions", "fulfilled_by",
            "INTEGER REFERENCES users(id)",
            "INTEGER REFERENCES users(id)",
        )
        await _add_column_if_missing(
            conn, "reward_redemptions", "fulfilled_at",
            "DATETIME",
            "TIMESTAMP",
        )
        await _add_column_if_missing(
            conn, "users", "firebase_uid",
            "VARCHAR(128) UNIQUE",
            "VARCHAR(128) UNIQUE",
        )

        # Stripe billing columns on families
        await _add_column_if_missing(
            conn, "families", "stripe_customer_id",
            "VARCHAR(255) UNIQUE",
            "VARCHAR(255) UNIQUE",
        )
        await _add_column_if_missing(
            conn, "families", "stripe_subscription_id",
            "VARCHAR(255)",
            "VARCHAR(255)",
        )
        await _add_column_if_missing(
            conn, "families", "subscription_status",
            "VARCHAR(20) DEFAULT 'none'",
            "VARCHAR(20) DEFAULT 'none'",
        )
        await _add_column_if_missing(
            conn, "families", "subscription_current_period_end",
            "DATETIME",
            "TIMESTAMP",
        )
        await _add_column_if_missing(
            conn, "families", "trial_ends_at",
            "DATETIME",
            "TIMESTAMP",
        )

        # Only run self-hosted migrations (default family + backfill).
        # In SaaS mode families are created via onboarding, not auto-assigned.
        if settings.APP_MODE != "saas":
            await _migrate_family_id_columns(conn)
            await _backfill_family_ids(conn)


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
