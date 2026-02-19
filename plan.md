# Implementation Plan

## 1. Rename ChoreQuest to ChoreQuest (all layers)

Replace every occurrence of "ChoreQuest" / "choresos" across the entire codebase:

| File | Change |
|------|--------|
| `frontend/index.html` | `<title>ChoreQuest — Quest Board</title>` |
| `frontend/public/manifest.json` | name + short_name |
| `frontend/public/sw.js` | `CACHE_NAME = 'chorequest-v3'` (bump version to bust cache) |
| `frontend/src/components/Layout.jsx` | Two heading strings (desktop sidebar + mobile bar) |
| `frontend/src/hooks/useTheme.jsx` | localStorage key `chorequest-theme` |
| `frontend/src/pages/Login.jsx` | Login page branding text |
| `frontend/package.json` | package name |
| `backend/main.py` | FastAPI title |
| `static/index.html` | `<title>` tag |
| `static/manifest.json` | name + short_name |
| `static/sw.js` | CACHE_NAME |
| `docker-compose.yml` | service name |

---

## 2. Avatar customisation — revamp AvatarDisplay and editor

### 2a. Rebuild `AvatarDisplay.jsx` SVG renderer

The current component already supports SVG rendering with skin/hair/eye/shirt colours and 5 hair styles. Expand it to support the requested customisable parts:

**Part types (all selectable + individually colourable):**

- **Head** (3 shapes): round, oval, square — colour = skin colour
- **Hair** (6 styles): none, short, long, spiky, curly, mohawk — own colour picker
- **Eyes** (4 styles): normal, happy, wide, sleepy — own colour picker
- **Mouth** (4 styles): smile, grin, neutral, open — own colour picker
- **Background**: solid colour picker (replaces the hardcoded `#1a1a2e`)

**Config shape** stored in `user.avatar_config` (JSON):
```json
{
  "head": "round",
  "hair": "spiky",
  "eyes": "wide",
  "mouth": "grin",
  "head_color": "#ffcc99",
  "hair_color": "#4a3728",
  "eye_color": "#333333",
  "mouth_color": "#cc6666",
  "bg_color": "#1a1a2e"
}
```

Changes to `AvatarDisplay.jsx`:
- Add head shape variants (round ellipse, taller oval, rounded rect)
- Add eye style variants (reuse the 4 from the backend catalogue, rendered as SVG)
- Add mouth style variants (smile curve, grin, straight line, open ellipse)
- Read `bg_color` from config for the SVG background
- Read `mouth_color` for the mouth element
- Read `head` shape key to pick the head shape SVG

### 2b. Build `AvatarEditor.jsx` component

A new component rendered on the Profile page. Shows the live avatar preview on the left/top and part selectors + colour pickers below.

**UI layout:**
- Live preview (lg size avatar)
- Tabs or sections: Head, Hair, Eyes, Mouth, Background
- Each section: row of shape thumbnails (tap to select) + colour picker swatch row
- "Save" button calls `PUT /api/avatar` with the config dict

**Colour pickers:** Use a curated palette of 12-16 colours per category (skin tones for head, fantasy colours for hair, etc.) rendered as tappable swatches. No need for a free-form colour picker.

### 2c. Update Profile page

- Add the AvatarEditor component below the current avatar display
- Tapping the avatar or a "Customise" button opens/toggles the editor
- On save, call `PUT /api/avatar`, then `updateUser({ avatar_config: newConfig })` to update React state so the avatar updates everywhere instantly

### 2d. Backend — no model changes needed

- `User.avatar_config` is already a JSON column
- `PUT /api/avatar` already accepts any dict and saves it
- `GET /api/avatar/parts` — update the hardcoded catalogue to match the new part set (head, hair, eyes, mouth only — remove body/legs/shoes/accessories that aren't rendered)

---

## 3. Template quests with RPG-style descriptions

Add a `DEFAULT_QUESTS` list to `backend/seed.py` that seeds template chores on first run. These are pre-made quests with RPG-flavoured titles and descriptions.

**Template quests:**

| Title | Description | Category | Difficulty | Points |
|-------|-------------|----------|------------|--------|
| The Chamber of Rest | Venture into your sleeping quarters and restore order to the land. Make the bed, clear the floor, and banish the chaos that lurks within. | Bedroom | medium | 20 |
| Dishwasher's Oath | The enchanted basin overflows with relics of past feasts. Empty its contents and return each vessel to its rightful place in the kingdom's cupboards. | Kitchen | easy | 15 |
| The Scholar's Burden | Ancient tomes of knowledge await your attention. Sit at the desk of wisdom, open your scrolls, and complete the lessons set forth by the Academy. | Homework | hard | 30 |
| Cauldron Duty | The evening feast must be prepared. Assist the Head Chef in chopping ingredients, stirring the cauldron, and setting the grand table for the guild. | Kitchen | medium | 25 |
| The Folding Ritual | Freshly cleansed garments have emerged from the Washing Shrine. Sort them by allegiance, fold them with precision, and deliver them to each hero's quarters. | Laundry | easy | 15 |
| Beast Keeper's Round | The loyal creatures of the realm hunger for sustenance and care. Fill their bowls, refresh their water, and tend to their domain. | Pets | easy | 10 |
| Garden of the Ancients | The overgrown wilds beyond the castle walls cry out for a champion. Pull the weeds, water the sacred plants, and sweep the stone paths clean. | Garden | hard | 30 |
| The Porcelain Throne | A perilous quest awaits in the Bathroom Keep. Scrub the basin, polish the mirrors, and vanquish the grime that clings to every surface. | Bathroom | medium | 20 |
| Sweeping the Great Hall | Dust and debris have invaded the common quarters. Take up your broom and mop, and restore the floors to their former glory. | General | easy | 10 |
| Merchant's Errand | The guild requires supplies from the village market. Accompany the Quartermaster on this vital resupply mission beyond the castle gates. | Outdoor | medium | 20 |

**Seed logic:**
- Add to `seed_database()` — only seed if the chores table is empty
- Need a "system" user or the first admin user to set as `created_by`
- Assign to category by name lookup
- All set to `recurrence: daily`, `requires_photo: false`
- No `assigned_user_ids` (parents assign later)

---

## Execution order

1. **Rename ChoreQuest -> ChoreQuest** (~12 files, find-and-replace)
2. **Avatar: rebuild AvatarDisplay.jsx** (head shapes, eye styles, mouth styles, bg colour)
3. **Avatar: update backend catalogue** (avatar.py — slim down to head/hair/eyes/mouth)
4. **Avatar: build AvatarEditor.jsx** (new component with shape selectors + colour swatches)
5. **Avatar: integrate editor into Profile.jsx**
6. **Template quests: add DEFAULT_QUESTS to seed.py**
7. **Test & commit**
