# Pet XP, Progression & Customisation — Implementation Plan

## Current State

The pet system has a solid foundation but is shallow in practice:
- **6 pet types**: cat, dog, dragon, owl, bunny, phoenix (SVG rendered)
- **8 levels**: Hatchling(0xp) → Legendary(3500xp), but leveling only changes size (1.0→1.28 scale) and adds a glow at lv5+/7+
- **Customisation**: Choose pet type, one flat color, and position (left/right/head)
- **PetLevelBadge**: Shows level number + name + progress bar, but only in compact inline form

The avatar SVG is 32x32 viewBox. Pets are small SVG groups (~6x6 units) positioned via hardcoded transforms.

---

## Plan

### 1. Multi-Part Pet Colouring

**What**: Let users colour individual parts of their pet — body, ears, tail, accents — instead of one flat colour.

**Changes**:

- **`avatar_config` schema** — add new fields alongside existing `pet_color`:
  - `pet_color_body` (falls back to `pet_color`)
  - `pet_color_ears`
  - `pet_color_tail`
  - `pet_color_accent` (whiskers, inner ear, wing tips, flame colour, etc.)

  The existing `pet_color` remains as the primary/default. If part colours aren't set, they inherit from `pet_color` — fully backward-compatible.

- **`pets.jsx`** — each pet component receives a `colors` object instead of a single `color` string. Map the parts:
  | Pet | Body | Ears | Tail | Accent |
  |---|---|---|---|---|
  | Cat | main ellipse | ear polygons | tail path | whiskers |
  | Dog | main ellipse | floppy ears | tail path | tongue/nose |
  | Dragon | body ellipse | spines | tail path | wings, fire |
  | Owl | body ellipse | tufts | wing paths | beak |
  | Bunny | body ellipse | ear ovals | tail puff | inner ear pink, nose |
  | Phoenix | body ellipse | crest | tail flames | flame colour |

- **`AvatarEditor.jsx`** — expand the Pet category section with sub-swatches:
  - Show "Body Colour", "Ears", "Tail", "Accent" colour rows only when a pet is selected
  - Reuse the existing `ColorSwatch` component
  - Add a "Reset to match" button that copies body colour to all parts

### 2. Pet Section in the Avatar Editor

**What**: Make the Pet tab a richer, dedicated section rather than a generic ShapeSelector row.

**Changes to `AvatarEditor.jsx`**:

- Replace the current `case 'pet'` block with a dedicated `PetCustomiser` sub-component containing:
  1. **Pet picker** — keep ShapeSelector for choosing type, but show a small preview SVG of each pet rendered at larger scale so kids can see what they're picking
  2. **Multi-part colouring** (from item 1 above)
  3. **Pet Level & XP info panel** — fetch from `/api/stats/me` and display:
     - Current level name + number with colour-coded badge
     - XP progress bar: `{current_xp} / {next_threshold} XP`
     - "XP to next level" count
  4. **Next Level Preview** — show a side-by-side of current vs next level appearance:
     - Current pet at current scale + glow
     - Next level pet at next scale + glow (greyed/dimmed with "Level {n+1}" label)
     - At max level, show a "MAX" crown badge instead
  5. **Position selector** (keep existing, or replace with tap-to-place — see item 4)

### 3. Pet Level Appearance Progression

**What**: Levels currently only affect scale (barely noticeable) and a subtle glow. Make each level tier visually distinct.

**Proposal** — add per-level visual traits in the SVG rendering:

| Level | Name | Visual Change |
|---|---|---|
| 1 | Hatchling | Base appearance, no extras |
| 2 | Youngling | Slightly larger (current), subtle body outline glow |
| 3 | Companion | Add a small accessory detail (e.g. collar dot for cat/dog, gem on dragon forehead) |
| 4 | Loyal | Eyes get a colored shine highlight matching accent color |
| 5 | Brave | Purple ambient glow (already exists), add tiny sparkle particles |
| 6 | Mighty | Pet outline gets a faint colored stroke, sparkles intensify |
| 7 | Majestic | Gold ambient glow (already exists), add a small crown/halo SVG element above pet |
| 8 | Legendary | Full animated shimmer effect, crown, max size, double sparkle |

**Implementation**:
- Add a `renderPetExtras(petType, level, color)` function in `pets.jsx` that returns additional SVG elements based on level
- `AvatarDisplay.jsx` calls this alongside `renderPet()`
- CSS keyframe animations for sparkles/shimmer (similar to existing `avatar-sparkle`)

### 4. Tap-to-Place Pet Positioning

**Feasibility**: Yes — very doable given the SVG coordinate system.

**How it works**:
- The avatar is a 32x32 SVG viewBox. Currently pets are placed at hardcoded transforms (`translate(23,17)` for right, etc.)
- We can store `pet_x` and `pet_y` as numbers (0-32 range) in `avatar_config`
- In the editor, when position mode is "Custom", the live avatar preview becomes tappable
- On tap/click, we convert the click coordinates to SVG viewBox coordinates and store them
- The pet renders at that position with a small crosshair indicator in edit mode

**Changes**:
- **`avatar_config`** — add `pet_x` (number), `pet_y` (number) fields
- **`PET_POSITION_OPTIONS`** — add `{ id: 'custom', label: 'Custom' }` option
- **`pets.jsx`** — when position is `'custom'`, use `translate(pet_x, pet_y)` instead of the preset offsets. Apply the same flip logic if pet_x < 16 (left half → mirror)
- **`AvatarEditor.jsx`** — when position is 'custom':
  - Overlay the preview avatar with a semi-transparent tap zone
  - Show a pulsing indicator: "Tap where you want your pet!"
  - On click, compute SVG coords: `const rect = svgEl.getBoundingClientRect(); const x = ((e.clientX - rect.left) / rect.width) * 32;`
  - Clamp to valid range and update config
  - Show a small crosshair/dot on the preview at the chosen position
- **`AvatarDisplay.jsx`** — read `pet_x`/`pet_y` from config when position is 'custom', apply `translate(pet_x, pet_y)` with bounds clamping
- **Backend** — no changes needed, `avatar_config` is a JSON blob that accepts arbitrary fields

**Edge cases to handle**:
- Clamp coordinates so pet doesn't render entirely off-screen (e.g. x: 2-28, y: 2-28)
- Dragon/phoenix are larger — shift origin so they center on tap point
- "Head" position stays as a preset (on top of head) since custom placement covers the rest

### 5. Summary of Files Changed

| File | What |
|---|---|
| `frontend/src/components/avatar/pets.jsx` | Multi-part colors, level extras, custom position support |
| `frontend/src/components/AvatarDisplay.jsx` | Render level extras, custom position coords, sparkle animations |
| `frontend/src/components/AvatarEditor.jsx` | New PetCustomiser section with part colours, level info, next-level preview, tap-to-place |
| `frontend/src/components/PetLevelBadge.jsx` | Enhanced with XP-to-next display (may be reused inside editor) |
| `frontend/src/index.css` | Sparkle/shimmer keyframes for pet level effects |
| `backend/services/pet_leveling.py` | Add `all_pet_levels_with_visuals()` helper describing what each level unlocks (optional, for preview) |

No database migration needed — `avatar_config` is a JSON column that accepts new fields transparently.

### 6. Suggested Implementation Order

1. Multi-part pet colours (schema + pets.jsx + editor UI)
2. Dedicated Pet section in AvatarEditor with level/XP info
3. Next-level appearance preview
4. Per-level visual traits (level extras in SVG)
5. Tap-to-place custom positioning
