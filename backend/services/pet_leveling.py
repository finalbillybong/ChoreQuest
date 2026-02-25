"""Pet leveling system — pets gain XP alongside their owner and evolve."""

import json
from sqlalchemy import text


PET_LEVELS = [
    (0,    1, "Hatchling"),
    (50,   2, "Youngling"),
    (150,  3, "Companion"),
    (350,  4, "Loyal"),
    (700,  5, "Brave"),
    (1200, 6, "Mighty"),
    (2000, 7, "Majestic"),
    (3500, 8, "Legendary"),
]


def get_pet_level(pet_xp: int) -> dict:
    """Return pet level info for a given pet XP total."""
    level_info = PET_LEVELS[0]
    for tier in PET_LEVELS:
        if pet_xp >= tier[0]:
            level_info = tier

    current_idx = PET_LEVELS.index(level_info)
    next_tier = PET_LEVELS[current_idx + 1] if current_idx < len(PET_LEVELS) - 1 else None

    return {
        "level": level_info[1],
        "name": level_info[2],
        "xp": pet_xp,
        "xp_threshold": level_info[0],
        "next_threshold": next_tier[0] if next_tier else None,
        "progress": round(
            (pet_xp - level_info[0]) / (next_tier[0] - level_info[0]), 3
        ) if next_tier else 1.0,
    }


def all_pet_levels() -> list[dict]:
    """Return all pet level tiers for display."""
    return [
        {"level": level, "name": name, "xp_threshold": xp}
        for xp, level, name in PET_LEVELS
    ]


# ── Per-pet XP helpers ──

def get_current_pet_xp(config: dict) -> int:
    """Return the XP for the currently equipped pet, migrating legacy data."""
    pet = config.get("pet")
    if not pet or pet == "none":
        return 0
    xp_map = config.get("pet_xp_map", {})
    if pet in xp_map:
        return xp_map[pet]
    # Migrate legacy single pet_xp to the current pet
    return config.get("pet_xp", 0)


def set_current_pet_xp(config: dict, xp: int) -> dict:
    """Set XP for the currently equipped pet. Returns the mutated config."""
    pet = config.get("pet")
    if not pet or pet == "none":
        return config
    xp_map = config.get("pet_xp_map", {})
    xp_map[pet] = xp
    config["pet_xp_map"] = xp_map
    # Keep legacy field in sync for backwards compat with frontend cache
    config["pet_xp"] = xp
    return config


def migrate_pet_xp(config: dict) -> dict:
    """One-time migration: move legacy pet_xp into per-pet pet_xp_map."""
    if "pet_xp_map" in config:
        return config
    legacy_xp = config.get("pet_xp", 0)
    if legacy_xp <= 0:
        config["pet_xp_map"] = {}
        return config
    pet = config.get("pet")
    if pet and pet != "none":
        config["pet_xp_map"] = {pet: legacy_xp}
    else:
        config["pet_xp_map"] = {}
    return config


def award_pet_xp(user, amount: int) -> dict | None:
    """Award XP to the user's equipped pet and mutate avatar_config.

    Returns a dict with old/new level info if the pet levelled up, else None.
    Does nothing if the user has no pet equipped.
    The caller must commit the DB session afterwards.

    NOTE: This only mutates the ORM object in memory. For reliable persistence
    with async SQLite, use award_pet_xp_db() instead which writes via direct SQL.
    """
    config = user.avatar_config or {}
    pet = config.get("pet")
    if not pet or pet == "none" or amount <= 0:
        return None

    config = migrate_pet_xp(config)
    old_xp = get_current_pet_xp(config)
    old_level = get_pet_level(old_xp)["level"]
    new_xp = old_xp + amount
    set_current_pet_xp(config, new_xp)
    user.avatar_config = {**config}  # trigger SQLAlchemy mutation detection

    new_level_info = get_pet_level(new_xp)
    if new_level_info["level"] > old_level:
        return {
            "old_level": old_level,
            "new_level": new_level_info["level"],
            "name": new_level_info["name"],
            "pet": pet,
        }
    return None


async def award_pet_xp_db(db, user, amount: int) -> dict | None:
    """Award XP to the user's equipped pet via direct SQL UPDATE.

    Reliably persists avatar_config changes (SQLAlchemy ORM JSON mutation
    detection is unreliable with async SQLite).
    Returns a dict with old/new level info if the pet levelled up, else None.
    Does NOT commit — the caller must commit.
    """
    config = dict(user.avatar_config or {})
    pet = config.get("pet")
    if not pet or pet == "none" or amount <= 0:
        return None

    config = migrate_pet_xp(config)
    old_xp = get_current_pet_xp(config)
    old_level = get_pet_level(old_xp)["level"]
    new_xp = old_xp + amount
    set_current_pet_xp(config, new_xp)

    await db.execute(
        text("UPDATE users SET avatar_config = :config WHERE id = :uid"),
        {"config": json.dumps(config), "uid": user.id},
    )
    # Keep ORM object in sync so later reads in the same request see updated data
    user.avatar_config = config

    new_level_info = get_pet_level(new_xp)
    if new_level_info["level"] > old_level:
        return {
            "old_level": old_level,
            "new_level": new_level_info["level"],
            "name": new_level_info["name"],
            "pet": pet,
        }
    return None
