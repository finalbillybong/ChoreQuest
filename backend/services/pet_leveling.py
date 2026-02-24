"""Pet leveling system — pets gain XP alongside their owner and evolve."""

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
