"""Title / Rank system based on lifetime XP."""

RANK_TIERS = [
    (0,      "Apprentice",  "apprentice"),
    (100,    "Scout",       "scout"),
    (500,    "Adventurer",  "adventurer"),
    (1500,   "Knight",      "knight"),
    (3000,   "Champion",    "champion"),
    (6000,   "Hero",        "hero"),
    (10000,  "Legend",       "legend"),
    (20000,  "Mythic",      "mythic"),
]


def get_rank(total_xp: int) -> dict:
    """Return rank info for a given lifetime XP total."""
    rank = RANK_TIERS[0]
    for tier in RANK_TIERS:
        if total_xp >= tier[0]:
            rank = tier

    current_idx = RANK_TIERS.index(rank)
    next_tier = RANK_TIERS[current_idx + 1] if current_idx < len(RANK_TIERS) - 1 else None

    return {
        "title": rank[1],
        "key": rank[2],
        "xp_threshold": rank[0],
        "next_title": next_tier[1] if next_tier else None,
        "next_threshold": next_tier[0] if next_tier else None,
        "progress": round(
            (total_xp - rank[0]) / (next_tier[0] - rank[0]), 3
        ) if next_tier else 1.0,
    }


def all_ranks() -> list[dict]:
    """Return all rank tiers for display."""
    return [
        {"title": title, "key": key, "xp_threshold": xp}
        for xp, title, key in RANK_TIERS
    ]
