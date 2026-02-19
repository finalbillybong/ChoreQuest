# ChoreQuest — Full Application Specification

> **Purpose**: This document is a complete build specification for an AI coder (Claude Code) to rebuild ChoreQuest from scratch. The existing codebase serves as reference only — this is a clean-sheet rewrite.
>
> **What is ChoreQuest?** A gamified family chore management platform with RPG theming. Parents create quests (chores) and rewards, kids earn XP (points) by completing them, and everyone stays motivated with streaks, achievements, leaderboards, and a reward shop.

---

## 1. Design Philosophy & Visual Direction

### Theme: RPG / Pixel Art Game

The entire UI should feel like a retro RPG game interface — think classic JRPG menus meets modern web app usability. This is a family app used primarily by kids aged 6–14, so the game theming is core to engagement, not a skin.

### Visual Guidelines

| Element | Direction |
|---------|-----------|
| **Primary font** | `"Press Start 2P"` (Google Fonts) for headings, nav labels, point displays, achievement titles |
| **Body font** | `"VT323"` (Google Fonts) at 18–20px for readability, or a clean sans-serif like `Inter` if VT323 is too hard to read at body scale — test both |
| **Colour palette** | Deep navy background (`#0f0e17`), vibrant accent colours: gold/yellow (`#f9d71c`) for XP/points, emerald green (`#2de2a6`) for success/completion, crimson (`#ff4444`) for overdue/warnings, soft purple (`#b388ff`) for achievements, sky blue (`#64dfdf`) for info. White or cream (`#fffffe`) text on dark backgrounds |
| **Cards/Panels** | Pixel-art style borders (2–3px solid borders with slight inset shadow to look like game UI panels). Subtle dark gradient backgrounds (`#1a1a2e` → `#16213e`) |
| **Buttons** | Chunky, game-style with visible borders. Hover state should feel tactile (slight scale + colour shift). Primary actions in gold, secondary in blue, destructive in crimson |
| **Icons** | Use Lucide React icons as the base set. Where possible, render key icons (chore categories, achievements) with a pixel-art aesthetic using SVG or small sprites |
| **Animations** | Confetti on chore completion, XP counter that "ticks up" like a score, flame animation on streaks, spin wheel with physics-feeling deceleration, achievement unlock with a banner/toast that slides in like a game notification |
| **Sound** | Optional: tiny 8-bit sound effects on key actions (chore complete, achievement unlock, spin wheel). Must be toggleable in settings. Not required for MVP but a nice touch |
| **Dark mode** | Dark mode is the PRIMARY theme (RPG games are dark). Light mode should be available but secondary. System preference detection on first load |
| **Mobile-first** | Touch targets minimum 44px. Bottom navigation bar on mobile. The kid dashboard should be usable by a 7-year-old on a tablet |

### Terminology Mapping

Throughout the UI, use RPG-flavoured language. The backend/API can use standard terms, but the frontend should display:

| Technical Term | RPG Display Term |
|----------------|-----------------|
| Points | XP |
| Chores | Quests |
| Complete a chore | Complete Quest |
| Rewards store | Reward Shop / Treasure Shop |
| Achievements | Achievements / Badges |
| Streak | Streak (keep as-is, with flame icon) |
| Leaderboard | Leaderboard / Hall of Fame |
| Daily spin | Daily Spin / Bonus Wheel |
| Difficulty: Easy | ⭐ Easy |
| Difficulty: Medium | ⭐⭐ Medium |
| Difficulty: Hard | ⭐⭐⭐ Hard |
| Difficulty: Expert | 💀 Expert |
| Kid dashboard | Quest Board |
| Categories | Quest Types |

---

## 2. Tech Stack

The previous build used FastAPI + React + SQLite + Docker. You may use the same or suggest improvements, but here are the constraints and preferences:

### Requirements

| Concern | Requirement |
|---------|------------|
| **Deployment** | Must run via Docker Compose with a single `docker compose up -d` command |
| **Database** | Single-file database (SQLite) — this is a family app, not enterprise. Data lives in a mounted volume (`./data:/app/data`) for easy backup |
| **Frontend** | React-based SPA. PWA-capable (installable, service worker for offline shell) |
| **Real-time** | WebSocket support for live updates (chore completions, verifications) |
| **Auth** | JWT with httpOnly refresh cookies. No third-party auth providers needed |
| **File storage** | Local filesystem (inside the Docker volume) for photo uploads |
| **Port** | App should serve on port `8122` by default |

### Recommended Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Backend** | Python 3.12+, FastAPI | Async where possible. Use Pydantic v2 for schemas |
| **ORM** | SQLAlchemy 2.0 | Async session support. Alembic for migrations |
| **Database** | SQLite (via aiosqlite) | WAL mode enabled for concurrent reads |
| **Frontend** | React 18+, Vite, Tailwind CSS 4 | Lazy-load routes. Use Tailwind for utility styling, custom CSS for pixel-art borders/game UI elements |
| **Icons** | Lucide React | Consistent icon set throughout |
| **Animations** | Framer Motion | For confetti, XP ticking, achievement toasts, spin wheel |
| **State** | React Context + hooks | No Redux needed. Auth context, theme context, WebSocket context |
| **Real-time** | WebSocket (native, per-user channels) | FastAPI WebSocket endpoint |
| **Auth** | JWT (PyJWT), bcrypt | Access token (15 min) + refresh token (30 day httpOnly cookie) |
| **Build** | Multi-stage Dockerfile | Stage 1: build frontend. Stage 2: Python runtime serving static files + API |
| **Fonts** | Google Fonts: "Press Start 2P", "VT323" | Load via `<link>` or `@import` in CSS |

---

## 3. Authentication & Security

### User Roles

| Role | Description |
|------|------------|
| **Admin** | Full system access. First registered user auto-becomes admin. Can manage all users, settings, API keys, invite codes, and view the audit log |
| **Parent** | Creates and manages quests/rewards. Verifies completions. Awards bonus XP. Manages achievement point values. Can see all kids' activity |
| **Kid** | Views and completes assigned quests. Earns XP. Redeems rewards. Builds avatar. Manages wishlist. Accesses spin wheel |

### Authentication Flows

**Standard login**: Username + password → returns JWT access token (in response body) + refresh token (httpOnly cookie).

**PIN login**: 6-digit numeric PIN → same token response. Designed for kids on a shared family tablet — quick entry, no keyboard needed. PIN is optional and set separately from password.

**Token refresh**: Client sends refresh cookie to `/api/auth/refresh` → server validates the token, **invalidates the used refresh token**, issues a new access token + new rotated refresh cookie. If a previously-invalidated refresh token is presented (token reuse detection), invalidate ALL refresh tokens for that user as a security precaution — this indicates potential token theft.

**Password/PIN change**: On any credential change, invalidate all existing refresh tokens for that user, forcing re-authentication on all devices.

**Registration**: Username + password + display name + role. After the first user (auto-admin), registration requires an invite code OR `REGISTRATION_ENABLED=true`.

### Security Requirements

| Area | Specification |
|------|--------------|
| **Password hashing** | bcrypt with default work factor |
| **PIN hashing** | bcrypt (same as passwords) |
| **JWT signing** | HS256 with `SECRET_KEY` env var (minimum 16 characters, validated on startup against known weak values) |
| **Access token** | 15-minute expiry, returned in response body. Client stores in memory (not localStorage) |
| **Refresh token** | 30-day expiry, httpOnly + SameSite=Lax cookie. `Secure` flag controlled by `COOKIE_SECURE` env var. **On rotation, the old refresh token MUST be invalidated immediately** (store token family/generation in DB and reject reuse). On password change or PIN change, **invalidate ALL refresh tokens** for that user |
| **Rate limiting** | Sliding window: login 10/5min, PIN 5/15min, registration 5/hour. Return `429` with `Retry-After` header |
| **API keys** | SHA-256 hashed, stored with scoped permissions. For external integrations (e.g. Home Assistant) |
| **CORS** | Since the frontend is served from the same origin as the API, CORS middleware should use a **restrictive same-origin policy** — do NOT set `allow_origins=["*"]`. If CORS middleware is added for development, restrict it to `http://localhost:5173` (Vite dev server) and the production origin only. In production (single container serving both), CORS headers are not needed at all |
| **CSP (Content Security Policy)** | Set a strict CSP header: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' wss: ws:; frame-ancestors 'none'`. The `unsafe-inline` for styles is needed for Tailwind's runtime injection. `img-src blob:` is needed for camera/photo capture preview. `connect-src wss: ws:` allows WebSocket connections |
| **Other security headers** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=()`. Add HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains`) only when `COOKIE_SECURE=true` (i.e. HTTPS is confirmed) |
| **File uploads** | Validate MIME type, enforce size limit (`MAX_UPLOAD_SIZE_MB`), prevent path traversal. Store with UUID filenames |
| **Audit logging** | Log all sensitive operations (login, role changes, point adjustments, settings changes) with timestamp, user ID, action, and details |

---

## 4. Environment Variables

All configuration via environment variables with sensible defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | **required** | JWT signing key. Minimum 16 characters. App should refuse to start if missing or matches known weak values like "changeme" |
| `REGISTRATION_ENABLED` | `false` | Allow public registration without invite code |
| `DATABASE_URL` | `sqlite:////app/data/chores_os.db` | Database connection string |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Refresh token lifetime |
| `COOKIE_SECURE` | `false` | Set `true` when serving over HTTPS |
| `LOGIN_RATE_LIMIT_MAX` | `10` | Max login attempts per 5-minute window |
| `PIN_RATE_LIMIT_MAX` | `5` | Max PIN login attempts per 15-minute window |
| `REGISTER_RATE_LIMIT_MAX` | `5` | Max registrations per hour |
| `MAX_UPLOAD_SIZE_MB` | `5` | Maximum file upload size in megabytes |
| `DAILY_RESET_HOUR` | `0` | Hour (UTC) when daily chore assignments reset/generate |
| `TZ` | `Europe/London` | Container timezone |

---

## 5. Database Models

18 tables total, plus a RefreshToken table for token management. Use SQLAlchemy 2.0 declarative models. All tables should have `id` (integer primary key, auto-increment), `created_at`, and `updated_at` timestamps unless noted otherwise.

### RefreshToken
Required for secure token rotation and reuse detection (see Section 3 auth flows).

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `user_id` | FK → User | |
| `token_hash` | String | SHA-256 hash of the refresh token (never store raw tokens) |
| `is_revoked` | Boolean, default false | Set true on rotation or explicit revocation |
| `expires_at` | DateTime | |
| `created_at` | DateTime | |

On token refresh: look up the presented token by hash. If `is_revoked=true`, this is token reuse — **revoke ALL tokens for that user** (security breach). If valid and not revoked, mark it revoked and issue a new token+row. On logout, password change, or PIN change: revoke all tokens for that user. Run a periodic cleanup to delete expired rows.

### User
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `username` | String(50), unique | |
| `display_name` | String(100) | Shown in UI |
| `password_hash` | String | bcrypt |
| `pin_hash` | String, nullable | Optional 6-digit PIN |
| `role` | Enum: admin, parent, kid | |
| `points_balance` | Integer, default 0 | Current spendable XP |
| `total_points_earned` | Integer, default 0 | Lifetime XP (never decreases) |
| `current_streak` | Integer, default 0 | Current consecutive days |
| `longest_streak` | Integer, default 0 | All-time best |
| `last_streak_date` | Date, nullable | Last date streak was updated |
| `avatar_config` | JSON, nullable | Serialized avatar part selections |
| `is_active` | Boolean, default true | Soft delete |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### Chore
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `title` | String(200) | |
| `description` | Text, nullable | |
| `points` | Integer | XP reward |
| `difficulty` | Enum: easy, medium, hard, expert | |
| `icon` | String(50), nullable | Lucide icon name |
| `category_id` | FK → ChoreCategory | |
| `recurrence` | Enum: once, daily, weekly, custom | |
| `custom_days` | JSON, nullable | Array of day numbers (0=Mon, 6=Sun) for custom recurrence |
| `requires_photo` | Boolean, default false | |
| `is_active` | Boolean, default true | Soft delete |
| `created_by` | FK → User | Parent who created |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### ChoreAssignment
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `chore_id` | FK → Chore | |
| `user_id` | FK → User | Assigned kid |
| `date` | Date | The date this assignment is for |
| `status` | Enum: pending, completed, verified, skipped | |
| `completed_at` | DateTime, nullable | |
| `verified_at` | DateTime, nullable | |
| `verified_by` | FK → User, nullable | Parent who verified |
| `photo_proof_path` | String, nullable | Path to uploaded photo |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

**Unique constraint**: (`chore_id`, `user_id`, `date`) — one assignment per chore per kid per day.

### ChoreCategory
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `name` | String(50) | |
| `icon` | String(50) | Lucide icon name |
| `colour` | String(7) | Hex colour code |
| `is_default` | Boolean | Seed categories are default |
| `created_at` | DateTime | |

**Seed data** (created on first run): Kitchen, Bedroom, Bathroom, Garden, Pets, Homework, Laundry, General, Outdoor — each with an appropriate icon and colour.

### ChoreRotation
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `chore_id` | FK → Chore | |
| `kid_ids` | JSON | Ordered array of user IDs in rotation |
| `cadence` | Enum: daily, weekly | How often to rotate |
| `current_index` | Integer, default 0 | Current position in kid_ids array |
| `last_rotated` | DateTime, nullable | |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### Reward
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `title` | String(200) | |
| `description` | Text, nullable | |
| `point_cost` | Integer | XP price |
| `icon` | String(50), nullable | |
| `stock` | Integer, nullable | `null` = unlimited, otherwise decremented on redemption |
| `auto_approve_threshold` | Integer, nullable | Auto-approve if kid's balance is above this. `null` = always require parent approval |
| `is_active` | Boolean, default true | |
| `created_by` | FK → User | |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### RewardRedemption
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `reward_id` | FK → Reward | |
| `user_id` | FK → User | Kid who redeemed |
| `points_spent` | Integer | Snapshot of cost at time of redemption |
| `status` | Enum: pending, approved, denied | |
| `approved_by` | FK → User, nullable | |
| `approved_at` | DateTime, nullable | |
| `created_at` | DateTime | |

### PointTransaction
Full ledger — every XP change is recorded here. The user's `points_balance` is the running total but this table is the audit trail.

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `user_id` | FK → User | |
| `amount` | Integer | Positive = earn, negative = spend |
| `type` | Enum: chore_complete, reward_redeem, bonus, adjustment, achievement, spin, event_multiplier | |
| `description` | String(500) | Human-readable explanation |
| `reference_id` | Integer, nullable | ID of related chore/reward/etc |
| `created_by` | FK → User, nullable | Who triggered (parent for bonuses, null for system) |
| `created_at` | DateTime | |

### Achievement
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `key` | String(50), unique | Machine-readable key (e.g. `first_steps`, `week_warrior`) |
| `title` | String(100) | Display name |
| `description` | Text | How to earn it |
| `icon` | String(50) | |
| `points_reward` | Integer | Bonus XP on unlock |
| `criteria` | JSON | Machine-readable unlock conditions (see Achievement System section) |
| `sort_order` | Integer | Display ordering |
| `created_at` | DateTime | |

**Seed data** — 14 built-in achievements (see Section 8 for full list and criteria).

### UserAchievement
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `user_id` | FK → User | |
| `achievement_id` | FK → Achievement | |
| `unlocked_at` | DateTime | |

**Unique constraint**: (`user_id`, `achievement_id`).

### WishlistItem
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `user_id` | FK → User | Kid who added it |
| `title` | String(200) | |
| `url` | String(500), nullable | Link to product |
| `image_url` | String(500), nullable | |
| `notes` | Text, nullable | |
| `converted_to_reward_id` | FK → Reward, nullable | Set when parent converts to reward |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### SeasonalEvent
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `title` | String(200) | |
| `description` | Text, nullable | |
| `multiplier` | Float | e.g. 2.0 for double XP |
| `start_date` | DateTime | |
| `end_date` | DateTime | |
| `is_active` | Boolean, default true | |
| `created_by` | FK → User | |
| `created_at` | DateTime | |

Multiple active events stack **multiplicatively** (e.g. two 2x events = 4x).

### Notification
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `user_id` | FK → User | Recipient |
| `type` | Enum: chore_assigned, chore_completed, chore_verified, achievement_unlocked, bonus_points, trade_proposed, trade_accepted, trade_denied, streak_milestone, reward_approved, reward_denied | |
| `title` | String(200) | |
| `message` | Text | |
| `is_read` | Boolean, default false | |
| `reference_type` | String(50), nullable | e.g. "chore", "achievement", "reward" |
| `reference_id` | Integer, nullable | ID of related entity |
| `created_at` | DateTime | |

### SpinResult
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `user_id` | FK → User | |
| `points_won` | Integer | 1–25 |
| `spin_date` | Date | One spin per day |
| `created_at` | DateTime | |

**Unique constraint**: (`user_id`, `spin_date`).

### ApiKey
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `name` | String(100) | Descriptive label |
| `key_hash` | String | SHA-256 hash of the key |
| `key_prefix` | String(8) | First 8 chars for identification |
| `scopes` | JSON | Array of permitted scope strings |
| `created_by` | FK → User | |
| `last_used_at` | DateTime, nullable | |
| `is_active` | Boolean, default true | |
| `created_at` | DateTime | |

### AuditLog
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `user_id` | FK → User, nullable | Who performed the action |
| `action` | String(100) | e.g. `user.login`, `points.adjust`, `settings.update` |
| `details` | JSON, nullable | Contextual data |
| `ip_address` | String(45), nullable | |
| `created_at` | DateTime | |

### AppSetting
| Column | Type | Notes |
|--------|------|-------|
| `key` | String(100), PK | Setting name |
| `value` | Text | JSON-encoded value |
| `updated_at` | DateTime | |

**Seed data**: `daily_reset_hour` = `0`, `leaderboard_enabled` = `true`, `spin_wheel_enabled` = `true`, `chore_trading_enabled` = `true`.

### InviteCode
| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `code` | String(20), unique | The invite code string |
| `role` | Enum: parent, kid | What role the new user gets |
| `max_uses` | Integer, default 1 | |
| `times_used` | Integer, default 0 | |
| `created_by` | FK → User | |
| `expires_at` | DateTime, nullable | |
| `created_at` | DateTime | |

---

## 6. API Design

All endpoints prefixed with `/api/`. Responses use standard JSON. Errors return `{ "detail": "message" }` with appropriate HTTP status code.

Authentication: Bearer token in `Authorization` header for access token. Refresh token via httpOnly cookie.

### Health — `/api/health`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | Returns `{ "status": "ok" }`. Used by Docker healthcheck. No auth required |

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | None | Register new user. First user = admin. Requires invite code unless `REGISTRATION_ENABLED=true`. Body: `{ username, password, display_name, role, invite_code? }` |
| POST | `/login` | None | Login. Body: `{ username, password }`. Returns: `{ access_token, user }`. Sets refresh cookie |
| POST | `/pin-login` | None | PIN login. Body: `{ username, pin }`. Same response as login |
| POST | `/refresh` | Cookie | Rotate refresh token. Returns new access token + sets new refresh cookie |
| POST | `/logout` | Cookie | Clear refresh cookie |
| GET | `/me` | Bearer | Get current user profile |
| PUT | `/me` | Bearer | Update display name, avatar config |
| POST | `/change-password` | Bearer | Body: `{ current_password, new_password }` |
| POST | `/set-pin` | Bearer | Body: `{ pin }` (6-digit string) |

### Chores — `/api/chores`

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/categories` | Bearer | Any | List all chore categories |
| POST | `/categories` | Bearer | Parent+ | Create custom category. Body: `{ name, icon, colour }` |
| PUT | `/categories/{id}` | Bearer | Parent+ | Update category |
| DELETE | `/categories/{id}` | Bearer | Parent+ | Delete custom category (not defaults) |
| GET | `/` | Bearer | Any | List chores. Parents see all, kids see their assigned. Query params: `?category_id=&difficulty=&active_only=true` |
| POST | `/` | Bearer | Parent+ | Create chore with assignments. Body: `{ title, description?, points, difficulty, icon?, category_id, recurrence, custom_days?, requires_photo, assigned_user_ids[] }` |
| GET | `/{id}` | Bearer | Any | Get chore details including today's assignment status |
| PUT | `/{id}` | Bearer | Parent+ | Update chore. Can update assignments |
| DELETE | `/{id}` | Bearer | Parent+ | Soft-delete (set `is_active=false`). Preserves history |
| POST | `/{id}/complete` | Bearer | Kid | Mark today's assignment complete. Accepts optional photo upload (multipart). Awards XP (with event multipliers). Triggers achievement checks. Sends WebSocket update |
| POST | `/{id}/verify` | Bearer | Parent+ | Verify a completion. Updates assignment status to `verified` |
| POST | `/{id}/uncomplete` | Bearer | Parent+ | Undo a completion. Deducts the awarded XP. Resets assignment to `pending` |
| POST | `/{id}/skip` | Bearer | Parent+ | Skip an assignment for the day (won't count against streak) |

### Rewards — `/api/rewards`

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | Bearer | Any | List active rewards |
| POST | `/` | Bearer | Parent+ | Create reward |
| GET | `/{id}` | Bearer | Any | Get reward details |
| PUT | `/{id}` | Bearer | Parent+ | Update reward |
| DELETE | `/{id}` | Bearer | Parent+ | Soft-delete |
| GET | `/redemptions` | Bearer | Any | List redemptions. Parents see all, kids see their own. Query: `?status=pending` |
| POST | `/{id}/redeem` | Bearer | Kid | Redeem reward. Checks balance, decrements stock, creates pending redemption (or auto-approves based on threshold) |
| POST | `/redemptions/{id}/approve` | Bearer | Parent+ | Approve pending redemption |
| POST | `/redemptions/{id}/deny` | Bearer | Parent+ | Deny redemption. Refund XP to kid |

### Points — `/api/points`

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/{user_id}` | Bearer | Any | Get balance + transaction history. Kids can only view their own. Query: `?limit=50&offset=0` |
| POST | `/{user_id}/bonus` | Bearer | Parent+ | Award bonus XP. Body: `{ amount, description }` |
| POST | `/adjust/{user_id}` | Bearer | Admin | Admin point adjustment (can be negative). Body: `{ amount, description }`. Creates audit log entry |

### Stats — `/api/stats`

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/me` | Bearer | Any | Current user's stats: points, streak, achievements count, completion rate |
| GET | `/family` | Bearer | Parent+ | Overview of all kids: names, points, streaks, today's progress |
| GET | `/{user_id}` | Bearer | Parent+ | Specific user's detailed stats |
| GET | `/history/{user_id}` | Bearer | Any | Completion history (7-day and 30-day). Kids can only view own |
| GET | `/leaderboard` | Bearer | Any | Weekly leaderboard ranked by XP earned this week. Returns top N kids with avatars and XP |
| GET | `/achievements/all` | Bearer | Any | List all achievements with unlock status for current user |
| PUT | `/achievements/{id}` | Bearer | Parent+ | Update achievement point reward value |

### Calendar — `/api/calendar`

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | Bearer | Any | Weekly view. Query: `?week_start=2025-01-13`. Auto-generates `ChoreAssignment` records for recurring chores. Returns assignments grouped by day with status indicators |
| POST | `/trade` | Bearer | Kid | Propose chore trade. Body: `{ assignment_id, target_user_id }`. Creates notification for target kid |
| POST | `/trade/{id}/accept` | Bearer | Kid | Accept trade (reassigns the chore) |
| POST | `/trade/{id}/deny` | Bearer | Kid | Deny trade proposal |

### Notifications — `/api/notifications`

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | Bearer | Any | List notifications. Query: `?unread_only=true&limit=20&offset=0` |
| GET | `/unread-count` | Bearer | Any | Returns `{ count: N }` |
| POST | `/{id}/read` | Bearer | Any | Mark single notification as read |
| POST | `/read-all` | Bearer | Any | Mark all as read |

### Admin — `/api/admin`

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/users` | Bearer | Admin | List all users |
| PUT | `/users/{id}` | Bearer | Admin | Update user role, active status |
| DELETE | `/users/{id}` | Bearer | Admin | Deactivate user |
| GET | `/api-keys` | Bearer | Admin | List API keys (without hashes) |
| POST | `/api-keys` | Bearer | Admin | Create API key. Returns the key once (never shown again) |
| DELETE | `/api-keys/{id}` | Bearer | Admin | Revoke API key |
| GET | `/invite-codes` | Bearer | Admin | List invite codes |
| POST | `/invite-codes` | Bearer | Admin | Create invite code. Body: `{ role, max_uses, expires_at? }` |
| DELETE | `/invite-codes/{id}` | Bearer | Admin | Delete invite code |
| GET | `/audit-log` | Bearer | Admin | Paginated audit log. Query: `?limit=50&offset=0&action=&user_id=` |
| GET | `/settings` | Bearer | Admin | Get all app settings |
| PUT | `/settings` | Bearer | Admin | Update settings. Body: `{ key: value, ... }` |

### Other Endpoints

| Prefix | Method | Path | Description |
|--------|--------|------|-------------|
| `/api/avatar` | GET | `/parts` | Get available avatar parts (heads, hair, eyes, mouth, body, legs, shoes, accessories) |
| `/api/avatar` | PUT | `/` | Save avatar config for current user |
| `/api/uploads` | POST | `/` | Upload file (photo proof). Returns `{ path, filename }` |
| `/api/uploads` | GET | `/{filename}` | Serve uploaded file |
| `/api/uploads` | DELETE | `/{filename}` | Delete upload (parent+) |
| `/api/wishlist` | GET | `/` | List wishlist items (kids see own, parents see all) |
| `/api/wishlist` | POST | `/` | Add wishlist item |
| `/api/wishlist` | PUT | `/{id}` | Update wishlist item |
| `/api/wishlist` | DELETE | `/{id}` | Remove wishlist item |
| `/api/wishlist` | POST | `/{id}/convert` | Convert to reward (parent). Body: `{ point_cost }` |
| `/api/events` | GET | `/` | List events (include `is_active` based on date range) |
| `/api/events` | POST | `/` | Create event (parent+) |
| `/api/events` | PUT | `/{id}` | Update event |
| `/api/events` | DELETE | `/{id}` | Delete event |
| `/api/spin` | GET | `/availability` | Check if user can spin today + last result |
| `/api/spin` | POST | `/spin` | Execute spin. Returns `{ points_won }` (1–25 random). Only available if all of yesterday's chores were completed |
| `/api/rotations` | GET | `/` | List all rotations |
| `/api/rotations` | POST | `/` | Create rotation. Body: `{ chore_id, kid_ids[], cadence }` |
| `/api/rotations` | PUT | `/{id}` | Update rotation |
| `/api/rotations` | DELETE | `/{id}` | Delete rotation |
| `/api/rotations` | POST | `/{id}/advance` | Manually advance rotation to next kid |

### WebSocket — `/ws/{user_id}`

Authenticated via token query parameter (`/ws/{user_id}?token=<access_token>`). The server validates the JWT before accepting the connection.

**Security note**: Passing tokens as query parameters means they can appear in server access logs and browser history. This is the standard approach for browser-based WebSocket auth (the browser WebSocket API does not support custom headers). Mitigations already in place: access tokens are short-lived (15 minutes), so leaked tokens have a small window of exploitation. **Additional requirement**: ensure the server does NOT log the full WebSocket URL including query parameters — strip or redact the `token` param from any request logging. As an alternative, the implementation MAY use first-message auth instead (connect without token, send token as the first WebSocket message, server validates before accepting further messages) — either approach is acceptable. Sends JSON messages for real-time events:

```json
{
  "type": "chore_completed",
  "data": { "chore_id": 1, "user_id": 3, "display_name": "Emma", "chore_title": "Make Bed" }
}
```

Event types: `chore_completed`, `chore_verified`, `chore_uncompleted`, `chore_deleted`, `achievement_unlocked`, `bonus_points`, `notification`, `points_updated`.

---

## 7. Feature Specifications

### 7.1 Chore Management

**Creating a chore**: Parents fill in title, description (optional), XP value, difficulty level, category, recurrence schedule, photo requirement toggle, and assign to one or more kids.

**Recurrence**: `daily` generates an assignment every day. `weekly` generates one per week on the day the chore was created. `custom` generates on specific days of the week (stored as JSON array, 0=Monday through 6=Sunday). `once` creates a single assignment.

**Assignment generation**: When the calendar endpoint is hit or the daily reset job runs, check for recurring chores and create `ChoreAssignment` records for any dates that don't already have one.

**Completion flow**:
1. Kid taps "Complete Quest" on their dashboard
2. If chore requires photo → camera/file picker opens, photo uploads first
3. Assignment status → `completed`, `completed_at` set
4. XP awarded to kid (base points × active event multipliers)
5. `PointTransaction` created
6. Achievement checks triggered (async)
7. Streak check triggered
8. WebSocket event sent to parents
9. Confetti animation plays on kid's screen

**Verification flow**: If a chore has `requires_photo=true`, the completion goes to the parent's pending verifications queue. Parent sees the photo, then approves (status → `verified`) or rejects (status back to `pending`, XP deducted).

**Soft delete**: Setting `is_active=false` removes the chore from active lists but preserves all historical assignments and point transactions.

### 7.2 Points & Rewards

**Earning XP**: Completing chores, achievement unlocks, bonus points from parents, daily spin wheel. All tracked in `PointTransaction` table.

**Event multipliers**: When seasonal events are active, chore completion XP is multiplied. Multiple active events stack multiplicatively. Example: base 10 XP, two active 2x events = 10 × 2 × 2 = 40 XP. The multiplier bonus is recorded as a separate `PointTransaction` of type `event_multiplier`.

**Spending XP**: Redeeming rewards deducts from `points_balance`. Creates `RewardRedemption` with status `pending` (or `approved` if auto-approve threshold is met and the kid's balance exceeds it).

**Bonus XP**: Parents can award arbitrary bonus XP to any kid with a description (e.g. "Great job helping your sister!").

**Admin adjustments**: Admins can add or remove XP with a reason. Creates audit log entry.

### 7.3 Reward Shop

The reward shop displays available rewards with their XP cost, stock status, and a "Redeem" button. Kids see their current balance prominently. The UI should feel like a game shop — items displayed as cards with icons, cost in gold/XP, and stock indicator.

**Stock tracking**: Rewards can have limited stock (integer) or unlimited (`null`). When stock hits 0, the reward shows as "Sold Out" but remains visible.

**Redemption approval**: Configurable per reward. `auto_approve_threshold` defines a balance above which the redemption is instantly approved. If `null`, all redemptions require parent approval.

### 7.4 Streak System

**How streaks work**: A kid's streak increments by 1 each day they complete ALL of their assigned chores for that day. If they miss any chore on a day, the streak resets to 0 the following day.

**Streak display**: An animated flame icon that grows/intensifies with streak length. Small flame at 1–6, medium at 7–29, large/animated at 30+.

**Streak milestones**: Trigger notifications at 7, 14, 30, 50, 100 days.

**Skipped chores**: Chores marked as "skipped" by a parent do NOT count against the streak — they're excluded from the "all chores complete" check for that day.

### 7.5 Achievement System

Achievements are checked automatically after relevant actions (chore completion, reward redemption, etc). When criteria are met and the user doesn't already have the achievement, it unlocks with a notification and bonus XP.

| Key | Title | Criteria | Default XP |
|-----|-------|----------|-----------|
| `first_steps` | First Steps | Complete 1 chore (lifetime) | 10 |
| `week_warrior` | Week Warrior | Complete all assigned chores every day for 7 consecutive days | 50 |
| `piggy_bank` | Piggy Bank | Earn 100 total lifetime XP | 10 |
| `money_bags` | Money Bags | Earn 500 total lifetime XP | 25 |
| `point_millionaire` | Point Millionaire | Earn 1,000 total lifetime XP | 50 |
| `early_bird` | Early Bird | Complete a chore before 9:00 AM (local time) | 15 |
| `helping_hand` | Helping Hand | Claim and complete a chore that was not assigned to you | 20 |
| `on_fire` | On Fire | Maintain a 7-day streak | 25 |
| `streak_master` | Streak Master | Maintain a 30-day streak | 75 |
| `unstoppable` | Unstoppable | Maintain a 100-day streak | 200 |
| `treat_yourself` | Treat Yourself | Redeem 5 rewards (lifetime) | 15 |
| `big_spender` | Big Spender | Redeem 20 rewards (lifetime) | 50 |
| `speed_demon` | Speed Demon | Complete all daily assigned chores before 12:00 PM (noon) | 20 |
| `all_done` | All Done! | Complete every assigned chore in a single day (must have at least 1) | 15 |

**Criteria format** (JSON stored in the `criteria` column):
```json
{ "type": "total_completions", "count": 1 }
{ "type": "consecutive_days_all_complete", "days": 7 }
{ "type": "total_points_earned", "amount": 100 }
{ "type": "completion_before_time", "hour": 9 }
{ "type": "unassigned_chore_completed" }
{ "type": "streak_reached", "days": 7 }
{ "type": "total_redemptions", "count": 5 }
{ "type": "all_daily_before_time", "hour": 12 }
{ "type": "all_daily_completed" }
```

**Parents can customize** the XP reward for each achievement via the Settings page. The criteria themselves are not editable.

### 7.6 Daily Spin Wheel

**Eligibility**: A kid can spin once per day, but ONLY if they completed all of their assigned chores the previous day (yesterday). If they had no chores yesterday, they can also spin.

**Mechanics**: The wheel has segments for values 1 through 25 XP. The backend generates the random value; the frontend animates the wheel to land on it.

**UI**: A colourful, animated wheel with RPG styling. Should feel satisfying to spin — use easing/physics for the deceleration. Show the result with a celebration animation.

### 7.7 Calendar View

**Layout**: A weekly view showing Monday–Sunday columns. Each day shows the assigned chores for all kids (parents) or the current kid.

**Colour coding**:
- Pending: neutral/grey
- Completed: green
- Verified: green with checkmark badge
- Overdue: red (past date + pending)
- Skipped: muted/strikethrough

**Assignment auto-generation**: Hitting the calendar endpoint for a given week should auto-create `ChoreAssignment` records for any recurring chores that don't already have records for those dates.

**Week navigation**: Left/right arrows to navigate weeks. A "This Week" button to jump back to the current week.

**Chore trading**: Kids can propose trading a chore assignment with another kid. The target kid gets a notification and can accept or deny. On accept, the `ChoreAssignment.user_id` is updated.

### 7.8 Chore Rotation

Parents can set up automatic rotation of a chore between kids. For example, "Take out the bins" rotates between Emma, Jack, and Lily weekly.

**How it works**: When the daily reset runs (or assignment generation triggers), check if the rotation's cadence has elapsed since `last_rotated`. If so, advance `current_index` by 1 (wrapping around) and assign the chore to the kid at the new index.

Parents can also manually advance the rotation via the API/UI.

### 7.9 Avatar Builder

An SVG-based character customization system. Kids pick from categories of parts: head shape, hair style, eye style, mouth, body/shirt, legs/pants, shoes, and accessories.

**Parts storage**: Avatar parts are defined as SVG path data, stored on the frontend. The user's selected combination is saved as a JSON config in `User.avatar_config`.

**Display**: Avatars render at various sizes throughout the app — small (32px) in navigation and lists, medium (64px) on leaderboard and calendar, large (128px) on profile page.

**Style**: The avatar parts should match the pixel-art RPG theme. Think simple, blocky character sprites with limited colour palettes per part.

### 7.10 Wishlist

Kids can add items they want to a wishlist — just a title, optional URL, optional image URL, and notes. Parents can browse all kids' wishlists and convert an item into a reward in the Reward Shop, setting the XP cost.

### 7.11 Seasonal Events

Time-limited events that boost XP earning. Parents/admins create events with a title, description, multiplier, and start/end dates.

**Active event display**: When events are active, show a banner or badge across the app (e.g. "🔥 Double XP Weekend — 2x points on all quests!").

Multiple events can be active simultaneously — multipliers stack multiplicatively.

### 7.12 Notifications

In-app notification system. A bell icon in the header shows unread count. Clicking opens a notification panel/page.

**Notification triggers**:
- Chore assigned to kid → notify kid
- Chore completed → notify parents
- Chore verified → notify kid
- Achievement unlocked → notify kid
- Bonus XP awarded → notify kid
- Trade proposed → notify target kid
- Trade accepted/denied → notify proposer
- Streak milestone reached → notify kid
- Reward redemption approved/denied → notify kid

**Mark as read**: Individual or bulk "mark all as read".

### 7.13 Real-Time Updates (WebSocket)

Each user gets a WebSocket channel. The server pushes events so the UI updates without polling or page refresh.

**Key real-time scenarios**:
- Parent is on their dashboard → kid completes a chore → parent's pending verifications list updates instantly
- Kid completes a chore → leaderboard updates for everyone
- Parent verifies a chore → kid's dashboard status updates

**Connection management**: Reconnect on disconnect with exponential backoff. Authenticate via token query parameter on the WebSocket URL.

---

## 8. Frontend Pages & Components

### Pages

| Page | Route | Access | Description |
|------|-------|--------|-------------|
| **Login** | `/login` | Public | Username/password form + PIN entry toggle. RPG-themed login screen (think "Enter the Realm") |
| **Register** | `/register` | Public | Registration form with invite code field |
| **Kid Dashboard** | `/` (kid) | Kid | Today's quests, XP balance (prominent, gold), streak flame, achievement count, spin wheel button. This is the primary kid experience — must be clear, fun, and usable by young children |
| **Parent Dashboard** | `/` (parent) | Parent | Family overview cards (one per kid: name, avatar, XP, streak, today's progress), pending verifications list with photo proof, quick-action buttons |
| **Admin Dashboard** | `/admin` | Admin | User management table, API key management, invite code management, audit log viewer, app settings form |
| **Chores Page** | `/chores` | Parent | Chore list with filters (category, difficulty). Create/edit chore modal with full form including recurrence, assignments, photo requirement |
| **Chore Detail** | `/chores/:id` | Any | Chore info, assignment history, completion button (kid), verification controls (parent) |
| **Rewards Page** | `/rewards` | Any | Reward shop grid. Kids see items with "Redeem" buttons and their balance. Parents see management controls + pending redemptions |
| **Profile** | `/profile` | Any | Display name edit, avatar builder, PIN setup, password change, theme toggle |
| **Calendar** | `/calendar` | Any | Weekly calendar grid with navigation, colour-coded assignments, trade functionality |
| **Leaderboard** | `/leaderboard` | Any | Weekly XP rankings with avatars, animated bars, rank badges (🥇🥈🥉) |
| **Wishlist** | `/wishlist` | Any | Kids: add/edit/remove items. Parents: view all kids' lists, convert items to rewards |
| **Settings** | `/settings` | Parent+ | Achievement point values, app settings (leaderboard toggle, spin wheel toggle, trading toggle, daily reset hour) |

### Key Components

| Component | Description |
|-----------|------------|
| **Layout** | App shell: top bar with logo + notification bell + avatar, bottom nav on mobile (Quest Board, Rewards, Calendar, Leaderboard, Profile). Sidebar on desktop |
| **BottomNav** | Mobile navigation bar with 5 tabs. Icons + labels. Active state highlighted in gold |
| **SpinWheel** | Animated wheel component with physics-based deceleration. Takes `onResult` callback. Prominent "SPIN!" button |
| **ConfettiAnimation** | Triggers on chore completion. Bursts of colourful particles. Auto-cleans after 3 seconds |
| **StreakDisplay** | Flame icon + streak count. Flame scales with streak length. Tooltip showing longest streak |
| **PointCounter** | Animated XP display that "ticks up" from old value to new value when points change |
| **AvatarBuilder** | Category tabs (hair, eyes, etc), part grid to pick from, live preview. Save button |
| **AvatarDisplay** | Renders a user's avatar at a given size from their `avatar_config`. Fallback to initials if no avatar set |
| **BadgeDisplay** | Achievement badge with icon, title, and locked/unlocked state. Locked badges are greyed/silhouetted |
| **PhotoCapture** | Camera + file picker for photo proof. Preview before submit. Compress images client-side before upload |
| **Modal** | Reusable modal with title, body, actions. Handles escape key and backdrop click |
| **ChoreIcon** | Resolves a Lucide icon name string to the actual icon component |
| **ErrorBoundary** | Catches React errors, shows a friendly "something went wrong" with retry button |

---

## 9. PWA Support

The app must be installable on mobile devices as a progressive web app.

| Requirement | Detail |
|-------------|--------|
| **Manifest** | `manifest.json` with app name, icons (192px, 512px), theme colour matching the RPG palette, `display: standalone` |
| **Service worker** | Register a service worker with a **split caching strategy**: **Cache-first** for static assets (JS bundles, CSS, fonts, images, avatar SVGs) — serve from cache, update in background. **Network-first** for API calls (`/api/*`) — always try the network, fall back to a generic offline response if unavailable. **Never cache** auth endpoints (`/api/auth/*`). When offline, show a user-friendly inline message ("You're offline — some features may be unavailable") rather than a browser error page. The service worker should use a versioned cache name so that deploying a new build invalidates the old cache |
| **Touch targets** | Minimum 44×44px for all interactive elements |
| **Viewport** | Proper meta viewport tag. No horizontal scroll. Responsive from 320px to 1440px+ |
| **Icons** | App icons in pixel-art style matching the RPG theme |

---

## 10. Deployment

### Docker Setup

Single `docker-compose.yml`:

```yaml
services:
  chorequest:
    build: .
    ports:
      - "8122:8122"
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - TZ=Europe/London
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8122/api/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

### Dockerfile

Multi-stage build:
1. **Stage 1** — Node: install dependencies, build React frontend (`npm run build`)
2. **Stage 2** — Python: install backend dependencies, copy built frontend into static directory, run FastAPI with Uvicorn

**Non-root execution**: The container should create and run as a non-root user (e.g. `appuser` with UID 1000). The `entrypoint.sh` script should handle permissions on the `/app/data` volume mount — if the data directory isn't writable by `appuser`, fall back to running as root with a logged warning. This auto-fallback ensures it works on systems with restrictive volume mount permissions (e.g. some NAS devices, Unraid) without requiring manual `chown`.

FastAPI serves the built frontend as static files and handles `/api/*` routes. A catch-all route serves `index.html` for client-side routing.

### Startup Behaviour

On first start:
1. Validate `SECRET_KEY` is set and not a known weak value
2. Run database migrations (create tables if they don't exist)
3. Seed default data: chore categories, achievements, app settings
4. First user to register becomes admin

### Data Persistence

All persistent data lives in the mounted `./data` directory: the SQLite database file and the `uploads/` subdirectory for photos. Users back up this single directory to preserve everything.

The container should handle mixed host permissions gracefully — auto-detect and adapt without requiring manual `chown`/`chmod`.

---

## 11. Non-Functional Requirements

| Area | Requirement |
|------|------------|
| **Performance** | Page loads under 2 seconds on 3G. Lazy-load routes. Compress images client-side before upload. Use SQLite WAL mode |
| **Accessibility** | Semantic HTML, ARIA labels on interactive elements, keyboard navigation support, sufficient colour contrast (especially important with the dark RPG theme) |
| **Error handling** | Never show raw errors to users. Friendly error messages with retry options. API client should handle 401 by attempting token refresh before failing |
| **Logging** | Backend logs to stdout (Docker-friendly). Structured logging with request ID correlation |
| **Testing** | Not required for initial build, but code should be structured to be testable (dependency injection, separated concerns) |
| **Browser support** | Latest 2 versions of Chrome, Firefox, Safari, Edge. iOS Safari for PWA |

---

## 12. Project Structure

Suggested directory layout:

```
chorequest/
├── backend/
│   ├── main.py                   # FastAPI app, CORS, static files, startup events
│   ├── config.py                 # Settings from env vars (Pydantic BaseSettings)
│   ├── database.py               # Engine, session, table creation, migrations
│   ├── models.py                 # All SQLAlchemy models
│   ├── schemas.py                # Pydantic request/response schemas
│   ├── auth.py                   # JWT creation/validation, password/PIN hashing
│   ├── dependencies.py           # FastAPI dependencies (get_db, get_current_user, role checks)
│   ├── rate_limit.py             # Sliding-window rate limiter
│   ├── websocket_manager.py      # WebSocket connection manager
│   ├── seed.py                   # Default categories, achievements, settings
│   ├── achievements.py           # Achievement checking logic
│   └── routers/
│       ├── auth.py
│       ├── chores.py
│       ├── rewards.py
│       ├── points.py
│       ├── stats.py
│       ├── calendar.py
│       ├── notifications.py
│       ├── admin.py
│       ├── avatar.py
│       ├── wishlist.py
│       ├── events.py
│       ├── spin.py
│       ├── rotations.py
│       └── uploads.py
├── frontend/
│   ├── public/
│   │   ├── manifest.json
│   │   └── sw.js                 # Service worker
│   ├── src/
│   │   ├── main.jsx              # Entry point
│   │   ├── App.jsx               # Router, lazy loading, role-based routing
│   │   ├── api/
│   │   │   └── client.js         # Fetch wrapper with auth, refresh, error handling
│   │   ├── hooks/
│   │   │   ├── useAuth.jsx       # Auth context provider
│   │   │   ├── useTheme.jsx      # Dark/light mode
│   │   │   ├── useWebSocket.js   # WebSocket connection
│   │   │   └── useNotifications.js
│   │   ├── pages/                # All page components (see Section 8)
│   │   ├── components/           # All shared components (see Section 8)
│   │   └── assets/
│   │       └── avatar/           # SVG avatar parts
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js        # Custom theme with RPG colours
├── Dockerfile
├── docker-compose.yml
├── entrypoint.sh                 # Permission handling, startup
├── requirements.txt              # Python dependencies
└── README.md
```

---

## 13. Seed Data & First-Run Experience

On first application start (empty database), automatically create:

**Chore categories** (9 defaults): Kitchen, Bedroom, Bathroom, Garden, Pets, Homework, Laundry, General, Outdoor — each with a relevant Lucide icon name and distinct colour.

**Achievements** (14 defaults): All achievements listed in Section 7.5 with their criteria JSON and default XP rewards.

**App settings** (4 defaults): `daily_reset_hour=0`, `leaderboard_enabled=true`, `spin_wheel_enabled=true`, `chore_trading_enabled=true`.

**First user flow**: The first person to register gets the `admin` role automatically. The UI should make this clear on the registration page ("You'll be the first user — you'll automatically become the admin").

---

## 14. Implementation Notes for Claude Code

These are specific guidance points for the AI coder:

1. **Build order suggestion**: Start with the database models and seed data → auth system → basic CRUD for chores and rewards → kid dashboard and parent dashboard → then layer in gamification features (streaks, achievements, spin wheel) → then polish features (calendar, trading, rotations, wishlist, events, avatar) → finally PWA + deployment.

2. **Don't over-engineer**: This is a family app running on a single Docker container. SQLite is intentional. No need for Redis, Celery, message queues, or microservices.

3. **Frontend state**: Use React Context for auth, theme, and WebSocket. Component-level state for everything else. No need for a global state library.

4. **The RPG theme is important**: Don't treat it as a cosmetic afterthought. The pixel art fonts, game-style UI panels, XP terminology, achievement badges, and celebration animations are core to the product's appeal. Kids need to WANT to use this app.

5. **Mobile-first**: Build the kid experience for phones/tablets first. The parent/admin dashboards can be more desktop-oriented but must still work on mobile.

6. **Error states matter**: Empty states (no chores yet, no achievements, empty leaderboard) should have friendly, on-theme messaging ("No quests assigned yet — ask a parent to create some!").

7. **Photo upload**: Compress images client-side before uploading (target ~500KB max). Use canvas-based compression. Store with UUID filenames to prevent collisions and path traversal.

8. **WebSocket resilience**: The frontend WebSocket hook should handle disconnections gracefully with exponential backoff reconnection. Don't crash or freeze the UI if the WebSocket connection drops.

9. **Timezone handling**: Store everything in UTC in the database. The `TZ` env var controls the container timezone for display purposes. The frontend should use the browser's local timezone for display.

10. **Daily reset**: Implement as a background task in FastAPI that runs at `DAILY_RESET_HOUR` (UTC). It should generate new chore assignments for the day and advance any rotations that are due.
