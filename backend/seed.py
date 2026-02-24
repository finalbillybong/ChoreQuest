import json
from datetime import date
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import (
    ChoreCategory, Achievement, AppSetting, Chore, ChoreAssignment,
    ChoreAssignmentRule, QuestTemplate, User, UserRole, Difficulty, Recurrence,
    AssignmentStatus, AvatarItem, AvatarItemRarity, AvatarUnlockMethod,
)

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
    {"key": "pet_youngling", "title": "Growing Bond", "description": "Raise a pet to Level 2 (Youngling)", "icon": "paw-print", "points_reward": 15, "criteria": {"type": "pet_level_reached", "level": 2}, "sort_order": 15},
    {"key": "pet_loyal", "title": "Loyal Companion", "description": "Raise a pet to Level 4 (Loyal)", "icon": "paw-print", "points_reward": 30, "criteria": {"type": "pet_level_reached", "level": 4}, "sort_order": 16},
    {"key": "pet_mighty", "title": "Mighty Beast", "description": "Raise a pet to Level 6 (Mighty)", "icon": "paw-print", "points_reward": 50, "criteria": {"type": "pet_level_reached", "level": 6}, "sort_order": 17},
    {"key": "pet_legendary", "title": "Legendary Tamer", "description": "Raise a pet to Level 8 (Legendary)", "icon": "paw-print", "points_reward": 100, "criteria": {"type": "pet_level_reached", "level": 8}, "sort_order": 18},
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
        "recurrence": Recurrence.once,
        "icon": "bed",
    },
    {
        "title": "Dishwasher's Oath",
        "description": "The enchanted basin overflows with relics of past feasts. Empty its contents and return each vessel to its rightful place in the kingdom's cupboards.",
        "category": "Kitchen",
        "difficulty": Difficulty.easy,
        "points": 15,
        "recurrence": Recurrence.once,
        "icon": "cooking-pot",
    },
    {
        "title": "The Scholar's Burden",
        "description": "Ancient tomes of knowledge await your attention. Sit at the desk of wisdom, open your scrolls, and complete the lessons set forth by the Academy.",
        "category": "Homework",
        "difficulty": Difficulty.hard,
        "points": 30,
        "recurrence": Recurrence.once,
        "icon": "book-open",
    },
    {
        "title": "Cauldron Duty",
        "description": "The evening feast must be prepared. Assist the Head Chef in chopping ingredients, stirring the cauldron, and setting the grand table for the guild.",
        "category": "Kitchen",
        "difficulty": Difficulty.medium,
        "points": 25,
        "recurrence": Recurrence.once,
        "icon": "cooking-pot",
    },
    {
        "title": "The Folding Ritual",
        "description": "Freshly cleansed garments have emerged from the Washing Shrine. Sort them by allegiance, fold them with precision, and deliver them to each hero's quarters.",
        "category": "Laundry",
        "difficulty": Difficulty.easy,
        "points": 15,
        "recurrence": Recurrence.once,
        "icon": "shirt",
    },
    {
        "title": "Beast Keeper's Round",
        "description": "The loyal creatures of the realm hunger for sustenance and care. Fill their bowls, refresh their water, and tend to their domain.",
        "category": "Pets",
        "difficulty": Difficulty.easy,
        "points": 10,
        "recurrence": Recurrence.once,
        "icon": "paw-print",
    },
    {
        "title": "Garden of the Ancients",
        "description": "The overgrown wilds beyond the castle walls cry out for a champion. Pull the weeds, water the sacred plants, and sweep the stone paths clean.",
        "category": "Garden",
        "difficulty": Difficulty.hard,
        "points": 30,
        "recurrence": Recurrence.once,
        "icon": "flower-2",
    },
    {
        "title": "The Porcelain Throne",
        "description": "A perilous quest awaits in the Bathroom Keep. Scrub the basin, polish the mirrors, and vanquish the grime that clings to every surface.",
        "category": "Bathroom",
        "difficulty": Difficulty.medium,
        "points": 20,
        "recurrence": Recurrence.once,
        "icon": "bath",
    },
    {
        "title": "Sweeping the Great Hall",
        "description": "Dust and debris have invaded the common quarters. Take up your broom and mop, and restore the floors to their former glory.",
        "category": "General",
        "difficulty": Difficulty.easy,
        "points": 10,
        "recurrence": Recurrence.once,
        "icon": "home",
    },
    {
        "title": "Merchant's Errand",
        "description": "The guild requires supplies from the village market. Accompany the Quartermaster on this vital resupply mission beyond the castle gates.",
        "category": "Outdoor",
        "difficulty": Difficulty.medium,
        "points": 20,
        "recurrence": Recurrence.once,
        "icon": "trees",
    },
]

# Built-in quest templates for the template picker
QUEST_TEMPLATES = [
    # Household
    {"title": "The Chamber of Rest", "description": "Venture into your sleeping quarters and restore order to the land. Make the bed, clear the floor, and banish the chaos that lurks within.", "category_name": "Bedroom", "difficulty": Difficulty.medium, "suggested_points": 20, "icon": "bed"},
    {"title": "Sweeping the Great Hall", "description": "Dust and debris have invaded the common quarters. Take up your broom and mop, and restore the floors to their former glory.", "category_name": "General", "difficulty": Difficulty.easy, "suggested_points": 10, "icon": "home"},
    {"title": "Dishwasher's Oath", "description": "The enchanted basin overflows with relics of past feasts. Empty its contents and return each vessel to its rightful place in the kingdom's cupboards.", "category_name": "Kitchen", "difficulty": Difficulty.easy, "suggested_points": 15, "icon": "cooking-pot"},
    {"title": "The Royal Table", "description": "The grand feast awaits but the table lies bare. Set the plates, arrange the goblets, and prepare the dining hall for the evening gathering.", "category_name": "Kitchen", "difficulty": Difficulty.easy, "suggested_points": 10, "icon": "cooking-pot"},
    {"title": "Cauldron Duty", "description": "The evening feast must be prepared. Assist the Head Chef in chopping ingredients, stirring the cauldron, and setting the grand table for the guild.", "category_name": "Kitchen", "difficulty": Difficulty.medium, "suggested_points": 25, "icon": "cooking-pot"},
    {"title": "The Folding Ritual", "description": "Freshly cleansed garments have emerged from the Washing Shrine. Sort them by allegiance, fold them with precision, and deliver them to each hero's quarters.", "category_name": "Laundry", "difficulty": Difficulty.easy, "suggested_points": 15, "icon": "shirt"},
    {"title": "Bin Banishment", "description": "The foul refuse of the castle threatens to overflow. Gather the rubbish sacks, haul them to the outer gates, and dispose of them before they attract dark creatures.", "category_name": "General", "difficulty": Difficulty.easy, "suggested_points": 10, "icon": "home"},
    # Personal Care
    {"title": "The Dawn Ritual", "description": "As the first light breaks over the kingdom, the hero must cleanse their teeth at the Enchanted Basin. Two minutes of brushing keeps the dragon's breath at bay.", "category_name": "Bathroom", "difficulty": Difficulty.easy, "suggested_points": 5, "icon": "bath"},
    {"title": "The Twilight Ritual", "description": "Before sleep claims you, return to the Enchanted Basin. Brush away the day's battles and prepare for the dreams of tomorrow.", "category_name": "Bathroom", "difficulty": Difficulty.easy, "suggested_points": 5, "icon": "bath"},
    {"title": "The Warrior's Cleanse", "description": "Every great hero must bathe. Step into the Waterfall Chamber, scrub away the grime of adventure, and emerge refreshed for the next quest.", "category_name": "Bathroom", "difficulty": Difficulty.easy, "suggested_points": 10, "icon": "bath"},
    {"title": "Armour Up", "description": "A hero never faces the day unprepared. Select your attire from the wardrobe, dress yourself fully, and report to the guild hall ready for action.", "category_name": "Bedroom", "difficulty": Difficulty.easy, "suggested_points": 5, "icon": "bed"},
    {"title": "The Scholar's Pack", "description": "Before the Academy bells toll, gather your scrolls, quills, and enchanted books. Pack your satchel with everything needed for the day's lessons.", "category_name": "General", "difficulty": Difficulty.easy, "suggested_points": 10, "icon": "home"},
    # Pets / Creatures
    {"title": "Beast Keeper's Round", "description": "The loyal creatures of the realm hunger for sustenance and care. Fill their bowls, refresh their water, and tend to their domain.", "category_name": "Pets", "difficulty": Difficulty.easy, "suggested_points": 10, "icon": "paw-print"},
    {"title": "The Hound's March", "description": "Your faithful companion needs to patrol the realm. Leash up, venture forth on the ancient paths, and give your loyal hound the exercise they deserve.", "category_name": "Pets", "difficulty": Difficulty.medium, "suggested_points": 20, "icon": "paw-print"},
    {"title": "Dragon's Den Duty", "description": "The creature's lair has grown untidy. Clean out the bedding, scrub the enclosure, and make sure your beast has a worthy den to return to.", "category_name": "Pets", "difficulty": Difficulty.medium, "suggested_points": 15, "icon": "paw-print"},
    {"title": "The Sacred Water Bowl", "description": "The Crystal Chalice that sustains your companion runs dry. Rinse it clean, refill it with fresh spring water, and ensure they never go thirsty.", "category_name": "Pets", "difficulty": Difficulty.easy, "suggested_points": 5, "icon": "paw-print"},
    # Learning / Homework
    {"title": "The Scholar's Burden", "description": "Ancient tomes of knowledge await your attention. Sit at the desk of wisdom, open your scrolls, and complete the lessons set forth by the Academy.", "category_name": "Homework", "difficulty": Difficulty.hard, "suggested_points": 30, "icon": "book-open"},
    {"title": "Tome Reader's Quest", "description": "The Royal Library holds secrets untold. Find a quiet corner, open a book of your choosing, and read for at least twenty minutes to gain wisdom.", "category_name": "Homework", "difficulty": Difficulty.medium, "suggested_points": 15, "icon": "book-open"},
    {"title": "Bard's Practice", "description": "The guild's bard must hone their craft. Take up your instrument, practice the ancient melodies, and perfect the songs that inspire heroes.", "category_name": "Homework", "difficulty": Difficulty.medium, "suggested_points": 20, "icon": "book-open"},
    {"title": "Spell Studies", "description": "The Academy requires you to memorise this week's enchantments. Review your spelling scrolls and commit each word to memory through practice.", "category_name": "Homework", "difficulty": Difficulty.medium, "suggested_points": 15, "icon": "book-open"},
    # Outdoor / Garden
    {"title": "Garden of the Ancients", "description": "The overgrown wilds beyond the castle walls cry out for a champion. Pull the weeds, water the sacred plants, and sweep the stone paths clean.", "category_name": "Garden", "difficulty": Difficulty.hard, "suggested_points": 30, "icon": "flower-2"},
    {"title": "The Lawn Guardian", "description": "The castle grounds have grown wild and untamed. Fire up the enchanted grass-cutter and tame the sprawling green fields back to order.", "category_name": "Garden", "difficulty": Difficulty.hard, "suggested_points": 30, "icon": "flower-2"},
    {"title": "Merchant's Errand", "description": "The guild requires supplies from the village market. Accompany the Quartermaster on this vital resupply mission beyond the castle gates.", "category_name": "Outdoor", "difficulty": Difficulty.medium, "suggested_points": 20, "icon": "trees"},
    # Bathroom
    {"title": "The Porcelain Throne", "description": "A perilous quest awaits in the Bathroom Keep. Scrub the basin, polish the mirrors, and vanquish the grime that clings to every surface.", "category_name": "Bathroom", "difficulty": Difficulty.medium, "suggested_points": 20, "icon": "bath"},
]


# fmt: off
# Avatar items: (category, item_id, display_name, rarity, unlock_method, unlock_value, is_default)
_F = AvatarUnlockMethod.free
_S = AvatarUnlockMethod.shop
_X = AvatarUnlockMethod.xp
_K = AvatarUnlockMethod.streak
_Q = AvatarUnlockMethod.quest_drop
_C = AvatarItemRarity.common
_U = AvatarItemRarity.uncommon
_R = AvatarItemRarity.rare
_E = AvatarItemRarity.epic
_L = AvatarItemRarity.legendary

DEFAULT_AVATAR_ITEMS = [
    # ── Head ──
    ("head", "round", "Round", _C, _F, None, True),
    ("head", "oval", "Oval", _C, _F, None, True),
    ("head", "square", "Square", _C, _F, None, True),
    ("head", "diamond", "Diamond", _C, _F, None, True),
    ("head", "heart", "Heart", _C, _F, None, True),
    ("head", "long", "Long", _C, _F, None, True),
    ("head", "triangle", "Triangle", _U, _S, 25, False),
    ("head", "pear", "Pear", _U, _S, 25, False),
    ("head", "wide", "Wide", _U, _S, 25, False),
    # ── Hair ──
    ("hair", "none", "None", _C, _F, None, True),
    ("hair", "short", "Short", _C, _F, None, True),
    ("hair", "long", "Long", _C, _F, None, True),
    ("hair", "spiky", "Spiky", _C, _F, None, True),
    ("hair", "curly", "Curly", _C, _F, None, True),
    ("hair", "mohawk", "Mohawk", _C, _F, None, True),
    ("hair", "buzz", "Buzz", _C, _F, None, True),
    ("hair", "ponytail", "Ponytail", _C, _F, None, True),
    ("hair", "bun", "Bun", _C, _F, None, True),
    ("hair", "pigtails", "Pigtails", _C, _F, None, True),
    ("hair", "afro", "Afro", _C, _F, None, True),
    ("hair", "braids", "Braids", _U, _S, 30, False),
    ("hair", "wavy", "Wavy", _U, _S, 30, False),
    ("hair", "side_part", "Side Part", _U, _S, 30, False),
    ("hair", "fade", "Fade", _U, _S, 30, False),
    ("hair", "dreadlocks", "Dreadlocks", _R, _S, 50, False),
    ("hair", "bob", "Bob", _U, _S, 30, False),
    ("hair", "shoulder", "Shoulder", _U, _S, 30, False),
    ("hair", "undercut", "Undercut", _U, _S, 30, False),
    ("hair", "twin_buns", "Twin Buns", _R, _S, 40, False),
    # ── Eyes ──
    ("eyes", "normal", "Normal", _C, _F, None, True),
    ("eyes", "happy", "Happy", _C, _F, None, True),
    ("eyes", "wide", "Wide", _C, _F, None, True),
    ("eyes", "sleepy", "Sleepy", _C, _F, None, True),
    ("eyes", "wink", "Wink", _C, _F, None, True),
    ("eyes", "angry", "Angry", _C, _F, None, True),
    ("eyes", "dot", "Dot", _C, _F, None, True),
    ("eyes", "star", "Star", _C, _F, None, True),
    ("eyes", "glasses", "Glasses", _U, _S, 40, False),
    ("eyes", "sunglasses", "Sunglasses", _R, _X, 200, False),
    ("eyes", "eye_patch", "Eye Patch", _R, _Q, None, False),
    ("eyes", "crying", "Crying", _U, _S, 30, False),
    ("eyes", "heart_eyes", "Heart Eyes", _R, _K, 7, False),
    ("eyes", "dizzy", "Dizzy", _U, _S, 30, False),
    ("eyes", "closed", "Closed", _U, _S, 30, False),
    # ── Mouth ──
    ("mouth", "smile", "Smile", _C, _F, None, True),
    ("mouth", "grin", "Grin", _C, _F, None, True),
    ("mouth", "neutral", "Neutral", _C, _F, None, True),
    ("mouth", "open", "Open", _C, _F, None, True),
    ("mouth", "tongue", "Tongue", _C, _F, None, True),
    ("mouth", "frown", "Frown", _C, _F, None, True),
    ("mouth", "surprised", "Surprised", _C, _F, None, True),
    ("mouth", "smirk", "Smirk", _C, _F, None, True),
    ("mouth", "braces", "Braces", _U, _S, 30, False),
    ("mouth", "vampire", "Vampire Fangs", _R, _Q, None, False),
    ("mouth", "whistle", "Whistle", _U, _S, 25, False),
    ("mouth", "mask", "Mask", _U, _S, 40, False),
    ("mouth", "beard", "Beard", _R, _S, 50, False),
    ("mouth", "moustache", "Moustache", _R, _S, 40, False),
    # ── Hats ──
    ("hat", "none", "None", _C, _F, None, True),
    ("hat", "crown", "Royal Crown", _E, _X, 500, False),
    ("hat", "wizard", "Wizard Hat", _R, _K, 14, False),
    ("hat", "beanie", "Beanie", _U, _S, 40, False),
    ("hat", "cap", "Cap", _U, _S, 30, False),
    ("hat", "pirate", "Pirate Hat", _R, _Q, None, False),
    ("hat", "headphones", "Headphones", _U, _S, 50, False),
    ("hat", "tiara", "Tiara", _R, _X, 300, False),
    ("hat", "horns", "Horns", _R, _Q, None, False),
    ("hat", "bunny_ears", "Bunny Ears", _U, _S, 40, False),
    ("hat", "cat_ears", "Cat Ears", _U, _S, 40, False),
    ("hat", "halo", "Halo", _E, _K, 30, False),
    ("hat", "viking", "Viking Helmet", _E, _Q, None, False),
    # ── Accessories ──
    ("accessory", "none", "None", _C, _F, None, True),
    ("accessory", "scarf", "Scarf", _U, _S, 30, False),
    ("accessory", "necklace", "Necklace", _U, _S, 40, False),
    ("accessory", "bow_tie", "Bow Tie", _U, _S, 25, False),
    ("accessory", "cape", "Hero's Cape", _E, _X, 400, False),
    ("accessory", "wings", "Angel Wings", _E, _K, 21, False),
    ("accessory", "shield", "Shield", _R, _S, 60, False),
    ("accessory", "sword", "Sword", _L, _Q, None, False),
    # ── Face extras ──
    ("face_extra", "none", "None", _C, _F, None, True),
    ("face_extra", "freckles", "Freckles", _C, _F, None, True),
    ("face_extra", "blush", "Blush", _C, _F, None, True),
    ("face_extra", "face_paint", "Face Paint", _U, _S, 30, False),
    ("face_extra", "scar", "Battle Scar", _R, _Q, None, False),
    ("face_extra", "bandage", "Bandage", _U, _S, 25, False),
    ("face_extra", "stickers", "Stickers", _U, _S, 20, False),
    # ── Outfit patterns ──
    ("outfit_pattern", "none", "None", _C, _F, None, True),
    ("outfit_pattern", "stripes", "Stripes", _C, _F, None, True),
    ("outfit_pattern", "stars", "Stars", _U, _S, 25, False),
    ("outfit_pattern", "camo", "Camo", _U, _S, 30, False),
    ("outfit_pattern", "tie_dye", "Tie Dye", _R, _S, 35, False),
    ("outfit_pattern", "plaid", "Plaid", _U, _S, 25, False),
    # ── Pets ──
    ("pet", "none", "None", _C, _F, None, True),
    ("pet", "cat", "Cat", _R, _S, 80, False),
    ("pet", "dog", "Dog", _R, _S, 80, False),
    ("pet", "dragon", "Dragon", _L, _X, 1000, False),
    ("pet", "owl", "Owl", _R, _K, 14, False),
    ("pet", "bunny", "Bunny", _R, _S, 60, False),
    ("pet", "phoenix", "Phoenix", _L, _Q, None, False),
]
# fmt: on


async def seed_database(db: AsyncSession):
    # Seed categories
    result = await db.execute(select(ChoreCategory).limit(1))
    if result.scalar_one_or_none() is None:
        for cat in DEFAULT_CATEGORIES:
            db.add(ChoreCategory(name=cat["name"], icon=cat["icon"], colour=cat["colour"], is_default=True))
        await db.commit()

    # Seed achievements (add any missing by key)
    existing_keys_result = await db.execute(select(Achievement.key))
    existing_keys = {row[0] for row in existing_keys_result.all()}
    added_achievements = 0
    for ach in DEFAULT_ACHIEVEMENTS:
        if ach["key"] not in existing_keys:
            db.add(Achievement(**ach))
            added_achievements += 1
    if added_achievements > 0:
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

    # Seed built-in quest templates
    result = await db.execute(select(QuestTemplate).limit(1))
    if result.scalar_one_or_none() is None:
        for tpl in QUEST_TEMPLATES:
            db.add(QuestTemplate(
                title=tpl["title"],
                description=tpl.get("description"),
                suggested_points=tpl["suggested_points"],
                difficulty=tpl["difficulty"],
                category_name=tpl["category_name"],
                icon=tpl.get("icon"),
            ))
        await db.commit()

    # Migrate existing chores to assignment rules (one-time migration)
    rule_count = await db.execute(select(func.count()).select_from(ChoreAssignmentRule))
    if rule_count.scalar() == 0:
        today = date.today()
        chores_result = await db.execute(
            select(Chore).where(Chore.is_active == True)
        )
        migrated = 0
        for chore in chores_result.scalars().all():
            # Only create rules from today's pending assignments (not all historical)
            kid_result = await db.execute(
                select(ChoreAssignment.user_id)
                .where(
                    ChoreAssignment.chore_id == chore.id,
                    ChoreAssignment.date == today,
                    ChoreAssignment.status == AssignmentStatus.pending,
                )
                .distinct()
            )
            kid_ids = list(kid_result.scalars().all())
            for kid_id in kid_ids:
                db.add(ChoreAssignmentRule(
                    chore_id=chore.id,
                    user_id=kid_id,
                    recurrence=chore.recurrence,
                    custom_days=chore.custom_days,
                    requires_photo=chore.requires_photo,
                    is_active=True,
                ))
                migrated += 1
        if migrated > 0:
            await db.commit()

    # Seed avatar items catalogue
    avatar_count = await db.execute(select(func.count()).select_from(AvatarItem))
    if avatar_count.scalar() == 0:
        for cat, item_id, name, rarity, method, value, default in DEFAULT_AVATAR_ITEMS:
            db.add(AvatarItem(
                category=cat, item_id=item_id, display_name=name,
                rarity=rarity, unlock_method=method, unlock_value=value,
                is_default=default,
            ))
        await db.commit()

    # One-time cleanup: deactivate stale rules created by migration that were
    # never manually managed through the assign modal.
    cleanup_key = "assignment_rules_cleanup_v1"
    cleanup_check = await db.execute(
        select(AppSetting).where(AppSetting.key == cleanup_key)
    )
    if cleanup_check.scalar_one_or_none() is None:
        active_rules = await db.execute(
            select(ChoreAssignmentRule).where(ChoreAssignmentRule.is_active == True)
        )
        deactivated = 0
        for rule in active_rules.scalars().all():
            # Rules from migration have created_at == updated_at (never touched)
            if rule.created_at == rule.updated_at:
                rule.is_active = False
                deactivated += 1
        db.add(AppSetting(key=cleanup_key, value=f"deactivated {deactivated} stale rules"))
        await db.commit()
