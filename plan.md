# Quest Management Overhaul Plan

## Summary
Split quest creation from quest assignment. Quests become reusable templates. Assignment (which kids, recurrence, photo proof, rotation) is done separately per-kid. Add built-in RPG-themed quest template library. Two-tab Quest Management screen. Guild Master Actions on Quest Detail page.

---

## Phase 1: Data Model Changes

### 1a. New Model: `ChoreAssignmentRule`
Stores per-kid assignment configuration (moves recurrence/photo from Chore to per-kid).

```python
class ChoreAssignmentRule(Base):
    __tablename__ = "chore_assignment_rules"
    id: int (PK)
    chore_id: int (FK → chores.id)
    user_id: int (FK → users.id)  # the kid
    recurrence: Enum(once, daily, weekly, custom)
    custom_days: JSON  # [0,1,2...] for custom
    requires_photo: bool (default False)
    is_active: bool (default True)
    created_at: datetime
    updated_at: datetime

    UniqueConstraint(chore_id, user_id)
```

### 1b. New Model: `QuestTemplate`
Built-in RPG-themed quest templates that ship with the app.

```python
class QuestTemplate(Base):
    __tablename__ = "quest_templates"
    id: int (PK)
    title: str
    description: str
    suggested_points: int
    difficulty: Difficulty enum
    category_name: str  # matches category name
    icon: str
```

### 1c. Chore Model — Backward Compat
Keep `recurrence`, `custom_days`, `requires_photo` on Chore. They become fallback defaults when no `ChoreAssignmentRule` exists. New quests from the redesigned flow won't populate these.

### 1d. Migration in `init_db()`
- `create_all` creates new tables
- For each existing Chore with assignments: create `ChoreAssignmentRule` per kid using Chore's recurrence/photo settings
- Seed `QuestTemplate` with built-in templates

---

## Phase 2: Backend API Changes

### 2a. Quest Templates Endpoint
- `GET /api/chores/templates` — returns all QuestTemplate records

### 2b. Assignment Rules Endpoints
- `GET /api/chores/{id}/rules` — get assignment rules for a chore (parent only)
- `POST /api/chores/{id}/assign` — create assignment rules + initial assignments
  - Body: `{ assignments: [{ user_id, recurrence, custom_days, requires_photo }], rotation?: { enabled, cadence } }`
  - Creates ChoreAssignmentRule per kid
  - Creates today's ChoreAssignment where applicable
  - Optionally creates/updates ChoreRotation
  - Sends notifications to assigned kids
- `PUT /api/chores/rules/{rule_id}` — update a single rule
- `DELETE /api/chores/rules/{rule_id}` — remove a kid's assignment

### 2c. Simplify Chore Creation
- `POST /api/chores` — only accepts: title, description, points, difficulty, category_id, icon
  - No `assigned_user_ids`, `recurrence`, `custom_days`, `requires_photo`

### 2d. Update Auto-Generation
- Calendar `_auto_generate_assignments()` and daily reset: read from `ChoreAssignmentRule` first, fallback to Chore fields
- Each kid gets their own recurrence schedule from their rule

### 2e. Chore Listing
- `GET /api/chores` gains `?view=library|active` query param
  - `library`: all quests (template view)
  - `active`: quests with active assignment rules
- Response includes `assignment_rules` and `assignment_count`

---

## Phase 3: Frontend — Quest Creation ("New Quest Scroll")

### 3a. QuestCreateModal.jsx (new component)
Clean modal with:
- **Template picker**: grid of built-in RPG templates + "From Scratch" option
- **Form fields**: Quest Name, Description, XP, Difficulty, Category
- **"Create Quest" button** — creates the quest, no assignment

### 3b. Built-in Templates
RPG-themed templates for boys & girls across categories:

**Household Quests:**
- The Chamber of Rest — Make bed, tidy room
- Sweeping the Great Hall — Vacuum/sweep floors
- Dishwasher's Oath — Load/unload dishwasher
- The Royal Table — Set/clear dinner table
- Cauldron Duty — Help prepare dinner
- The Folding Ritual — Fold and put away laundry
- Bin Banishment — Take out the bins

**Personal Care:**
- The Morning Ritual — Brush teeth (morning)
- The Evening Ritual — Brush teeth (evening)
- The Warrior's Cleanse — Have a shower/bath
- Armour Up — Get dressed independently
- The Scholar's Pack — Pack school bag

**Pets/Creatures:**
- Beast Keeper's Round — Feed pet
- The Hound's March — Walk the dog
- Dragon's Den Duty — Clean pet area
- The Sacred Water Bowl — Fill pet's water

**Learning/Homework:**
- The Scholar's Burden — Do homework
- Tome Reader's Quest — Read for 20 minutes
- Bard's Practice — Practice instrument
- Spell Studies — Study spelling/revision

**Outdoor/Garden:**
- Garden of the Ancients — Water plants / weed garden
- The Lawn Guardian — Mow the lawn
- Merchant's Errand — Help with shopping trip

**Bathroom:**
- The Porcelain Throne — Clean bathroom

---

## Phase 4: Frontend — Quest Assignment ("Quest Assignment Scroll")

### 4a. QuestAssignModal.jsx (new component)
Opens when tapping an unassigned quest (or "Assign" button on any quest):
- **Quest summary** at top (name, XP, difficulty badge)
- **Kid selector**: avatar chips for each family kid, tap to toggle
- **Per-kid settings** (expandable section per selected kid):
  - Recurrence: once / daily / weekly / custom (dropdown)
  - Custom days: day-of-week toggles (shown if custom)
  - Photo proof: toggle switch
- **Rotation section** (shown when 2+ kids selected):
  - "Enable rotation" toggle
  - Cadence: daily / weekly / fortnightly / monthly
- **"Assign Quest" button**

### 4b. Editing Assignments
Same modal can open for already-assigned quests:
- Pre-filled with current rules
- Can add/remove kids
- Can change per-kid settings
- "Update Assignments" button

---

## Phase 5: Frontend — Quest Management Tabs

### 5a. Chores.jsx Redesign (Parent View)
Two tabs at top of page:

**Tab 1: "Quest Library"**
- All created quests as cards
- Each card shows: name, XP, difficulty stars, category badge
- Badge: "Assigned to X kids" or "Not assigned"
- Tap card → opens QuestAssignModal
- Edit (pencil) → opens QuestCreateModal in edit mode
- Delete (trash) → removes quest
- FAB "+" → opens QuestCreateModal

**Tab 2: "Active Quests"**
- Quests that have active assignment rules
- Grouped or filterable by kid
- Each card shows: quest name, assigned kids (avatars), recurrence, status
- Tap card → navigates to `/chores/{id}` (Quest Detail)
- Filter/search bar

### 5b. Kid View
- Unchanged — kids see their assigned quests with complete/photo flow

---

## Phase 6: Quest Detail + Guild Master Actions

### 6a. ChoreDetail.jsx Updates
- Guild Master Actions (already exists, stays on this page):
  - Verify, Uncomplete, Skip, Remove (Just Today / All Future)
- Add per-kid assignment info display
- Show which kid this assignment is for
- Navigation from Family Overview → `/chores/{id}?kid={kidId}`

### 6b. ParentDashboard (Family Overview)
- Kid cards with today's progress
- Tapping an assigned quest → navigates to ChoreDetail
- Pending verifications section stays

---

## File Changes Summary

**Backend modified:**
- `models.py` — add ChoreAssignmentRule, QuestTemplate
- `schemas.py` — new schemas
- `routers/chores.py` — templates endpoint, assignment rules CRUD, simplify create
- `routers/calendar.py` — update auto-generation to use rules
- `main.py` — update daily reset to use rules
- `database.py` — migration + seed templates

**Frontend new:**
- `src/components/QuestCreateModal.jsx`
- `src/components/QuestAssignModal.jsx`

**Frontend modified:**
- `src/pages/Chores.jsx` — two-tab layout, template picker, simplified create
- `src/pages/ChoreDetail.jsx` — per-kid settings display
- `src/pages/ParentDashboard.jsx` — navigation updates
