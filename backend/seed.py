import json
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import ChoreCategory, Achievement, AppSetting, Chore, User, UserRole, Difficulty, Recurrence

DEFAULT_CATEGORIES = [
    {"name": "Kitchen", "icon": "cooking-pot", "colour": "#ff6b6b"},
    {"name": "Bedroom", "icon": "bed", "colour": "#b388ff"},
    {"name": "Bathroom", "icon": "bath", "colour": "#64dfdf"},
    {"name": "Garden", "icon": "flower-2", "colour": "#2de2a6"},
    {"name": "Pets", "icon": "paw-print", "colour": "#f9d71c"},
    {"name": "Homework", "icon": "book-open", "colour": "#4ecdc4"},
    {"name": "Laundry", "icon": "shirt", "colour": "#ff9ff3"},
    {"name": "General", "icon": "home", "colour": "#a29bfe"},
    {"name": "Outdoor", "icon": "trees", "colour": "#55efc4"},
]

DEFAULT_ACHIEVEMENTS = [
    {"key": "first_steps", "title": "First Steps", "description": "Complete your first quest", "icon": "footprints", "points_reward": 10, "criteria": {"type": "total_completions", "count": 1}, "sort_order": 1},
    {"key": "week_warrior", "title": "Week Warrior", "description": "Complete all assigned quests every day for 7 consecutive days", "icon": "shield", "points_reward": 50, "criteria": {"type": "consecutive_days_all_complete", "days": 7}, "sort_order": 2},
    {"key": "piggy_bank", "title": "Piggy Bank", "description": "Earn 100 total lifetime XP", "icon": "piggy-bank", "points_reward": 10, "criteria": {"type": "total_points_earned", "amount": 100}, "sort_order": 3},
    {"key": "money_bags", "title": "Money Bags", "description": "Earn 500 total lifetime XP", "icon": "banknote", "points_reward": 25, "criteria": {"type": "total_points_earned", "amount": 500}, "sort_order": 4},
    {"key": "point_millionaire", "title": "Point Millionaire", "description": "Earn 1,000 total lifetime XP", "icon": "gem", "points_reward": 50, "criteria": {"type": "total_points_earned", "amount": 1000}, "sort_order": 5},
    {"key": "early_bird", "title": "Early Bird", "description": "Complete a quest before 9:00 AM", "icon": "sunrise", "points_reward": 15, "criteria": {"type": "completion_before_time", "hour": 9}, "sort_order": 6},
    {"key": "helping_hand", "title": "Helping Hand", "description": "Claim and complete a quest that was not assigned to you", "icon": "hand-helping", "points_reward": 20, "criteria": {"type": "unassigned_chore_completed"}, "sort_order": 7},
    {"key": "on_fire", "title": "On Fire", "description": "Maintain a 7-day streak", "icon": "flame", "points_reward": 25, "criteria": {"type": "streak_reached", "days": 7}, "sort_order": 8},
    {"key": "streak_master", "title": "Streak Master", "description": "Maintain a 30-day streak", "icon": "flame-kindling", "points_reward": 75, "criteria": {"type": "streak_reached", "days": 30}, "sort_order": 9},
    {"key": "unstoppable", "title": "Unstoppable", "description": "Maintain a 100-day streak", "icon": "zap", "points_reward": 200, "criteria": {"type": "streak_reached", "days": 100}, "sort_order": 10},
    {"key": "treat_yourself", "title": "Treat Yourself", "description": "Redeem 5 rewards from the Treasure Shop", "icon": "gift", "points_reward": 15, "criteria": {"type": "total_redemptions", "count": 5}, "sort_order": 11},
    {"key": "big_spender", "title": "Big Spender", "description": "Redeem 20 rewards from the Treasure Shop", "icon": "shopping-cart", "points_reward": 50, "criteria": {"type": "total_redemptions", "count": 20}, "sort_order": 12},
    {"key": "speed_demon", "title": "Speed Demon", "description": "Complete all daily assigned quests before noon", "icon": "timer", "points_reward": 20, "criteria": {"type": "all_daily_before_time", "hour": 12}, "sort_order": 13},
    {"key": "all_done", "title": "All Done!", "description": "Complete every assigned quest in a single day", "icon": "check-check", "points_reward": 15, "criteria": {"type": "all_daily_completed"}, "sort_order": 14},
]

DEFAULT_SETTINGS = {
    "daily_reset_hour": "0",
    "leaderboard_enabled": "true",
    "spin_wheel_enabled": "true",
    "chore_trading_enabled": "true",
}

# Template quests with RPG-flavoured descriptions
DEFAULT_QUESTS = [
    {
        "title": "The Chamber of Rest",
        "description": "Venture into your sleeping quarters and restore order to the land. Make the bed, clear the floor, and banish the chaos that lurks within.",
        "category": "Bedroom",
        "difficulty": Difficulty.medium,
        "points": 20,
        "recurrence": Recurrence.daily,
        "icon": "bed",
    },
    {
        "title": "Dishwasher's Oath",
        "description": "The enchanted basin overflows with relics of past feasts. Empty its contents and return each vessel to its rightful place in the kingdom's cupboards.",
        "category": "Kitchen",
        "difficulty": Difficulty.easy,
        "points": 15,
        "recurrence": Recurrence.daily,
        "icon": "cooking-pot",
    },
    {
        "title": "The Scholar's Burden",
        "description": "Ancient tomes of knowledge await your attention. Sit at the desk of wisdom, open your scrolls, and complete the lessons set forth by the Academy.",
        "category": "Homework",
        "difficulty": Difficulty.hard,
        "points": 30,
        "recurrence": Recurrence.daily,
        "icon": "book-open",
    },
    {
        "title": "Cauldron Duty",
        "description": "The evening feast must be prepared. Assist the Head Chef in chopping ingredients, stirring the cauldron, and setting the grand table for the guild.",
        "category": "Kitchen",
        "difficulty": Difficulty.medium,
        "points": 25,
        "recurrence": Recurrence.daily,
        "icon": "cooking-pot",
    },
    {
        "title": "The Folding Ritual",
        "description": "Freshly cleansed garments have emerged from the Washing Shrine. Sort them by allegiance, fold them with precision, and deliver them to each hero's quarters.",
        "category": "Laundry",
        "difficulty": Difficulty.easy,
        "points": 15,
        "recurrence": Recurrence.daily,
        "icon": "shirt",
    },
    {
        "title": "Beast Keeper's Round",
        "description": "The loyal creatures of the realm hunger for sustenance and care. Fill their bowls, refresh their water, and tend to their domain.",
        "category": "Pets",
        "difficulty": Difficulty.easy,
        "points": 10,
        "recurrence": Recurrence.daily,
        "icon": "paw-print",
    },
    {
        "title": "Garden of the Ancients",
        "description": "The overgrown wilds beyond the castle walls cry out for a champion. Pull the weeds, water the sacred plants, and sweep the stone paths clean.",
        "category": "Garden",
        "difficulty": Difficulty.hard,
        "points": 30,
        "recurrence": Recurrence.weekly,
        "icon": "flower-2",
    },
    {
        "title": "The Porcelain Throne",
        "description": "A perilous quest awaits in the Bathroom Keep. Scrub the basin, polish the mirrors, and vanquish the grime that clings to every surface.",
        "category": "Bathroom",
        "difficulty": Difficulty.medium,
        "points": 20,
        "recurrence": Recurrence.weekly,
        "icon": "bath",
    },
    {
        "title": "Sweeping the Great Hall",
        "description": "Dust and debris have invaded the common quarters. Take up your broom and mop, and restore the floors to their former glory.",
        "category": "General",
        "difficulty": Difficulty.easy,
        "points": 10,
        "recurrence": Recurrence.daily,
        "icon": "home",
    },
    {
        "title": "Merchant's Errand",
        "description": "The guild requires supplies from the village market. Accompany the Quartermaster on this vital resupply mission beyond the castle gates.",
        "category": "Outdoor",
        "difficulty": Difficulty.medium,
        "points": 20,
        "recurrence": Recurrence.weekly,
        "icon": "trees",
    },
]


async def seed_database(db: AsyncSession):
    # Seed categories
    result = await db.execute(select(ChoreCategory).limit(1))
    if result.scalar_one_or_none() is None:
        for cat in DEFAULT_CATEGORIES:
            db.add(ChoreCategory(name=cat["name"], icon=cat["icon"], colour=cat["colour"], is_default=True))
        await db.commit()

    # Seed achievements
    result = await db.execute(select(Achievement).limit(1))
    if result.scalar_one_or_none() is None:
        for ach in DEFAULT_ACHIEVEMENTS:
            db.add(Achievement(**ach))
        await db.commit()

    # Seed settings
    for key, value in DEFAULT_SETTINGS.items():
        result = await db.execute(select(AppSetting).where(AppSetting.key == key))
        if result.scalar_one_or_none() is None:
            db.add(AppSetting(key=key, value=json.dumps(value) if not isinstance(value, str) else value))
    await db.commit()

    # Seed template quests (skip any that already exist by title)
    creator_result = await db.execute(
        select(User).where(User.role.in_([UserRole.admin, UserRole.parent])).limit(1)
    )
    creator = creator_result.scalar_one_or_none()
    if creator is not None:
        # Build category name -> id lookup
        cat_result = await db.execute(select(ChoreCategory))
        cat_map = {c.name: c.id for c in cat_result.scalars().all()}

        # Get existing chore titles to avoid duplicates
        existing_result = await db.execute(select(Chore.title))
        existing_titles = {row[0] for row in existing_result.all()}

        added = 0
        for quest in DEFAULT_QUESTS:
            if quest["title"] in existing_titles:
                continue
            cat_id = cat_map.get(quest["category"])
            if cat_id is None:
                continue
            db.add(Chore(
                title=quest["title"],
                description=quest["description"],
                points=quest["points"],
                difficulty=quest["difficulty"],
                icon=quest.get("icon"),
                category_id=cat_id,
                recurrence=quest["recurrence"],
                requires_photo=False,
                created_by=creator.id,
            ))
            added += 1
        if added > 0:
            await db.commit()
