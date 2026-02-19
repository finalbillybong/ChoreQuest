# QuestOS

A family chore app with RPG-flavoured language. Parents create quests, kids earn XP by completing them, and everyone can track progress through streaks, achievements, and a reward shop.

Built mobile-first — the main interface is a bottom tab bar on phones and tablets. There's a sidebar on larger screens.

## What it does

**For kids:**
- See today's quests and mark them done (with optional photo proof)
- Earn XP for completed quests, build daily streaks, unlock achievements
- Spin a daily bonus wheel for extra XP (if yesterday's quests were all done)
- Buy rewards from the shop with earned XP
- Add things to a wishlist that parents can see and convert into rewards
- Propose quest trades with siblings through the calendar
- Customise an avatar
- Log in with a PIN instead of a password (handy for shared tablets)

**For parents:**
- Create and assign quests with difficulty, categories, and recurrence (daily, weekly, custom days, one-off)
- Review and verify completed quests, including photo proof
- Set up rewards with XP costs, stock limits, and auto-approval thresholds
- Award bonus XP
- Set up chore rotations between kids
- View family stats and streaks

**For admins:**
- Manage users, API keys, and invite codes
- View audit logs
- Configure app settings

## Tech stack

| | |
|---|---|
| Backend | Python / FastAPI (async) |
| Database | SQLite (WAL mode) |
| Frontend | React 18, Vite, Tailwind CSS 4 |
| Fonts | Inter throughout |
| Icons | Lucide React |
| Real-time | WebSocket (per-user channels) |
| Auth | JWT + httpOnly refresh cookies, bcrypt, optional PIN login |
| Deployment | Docker, single container |

## Running it

```bash
docker compose up -d
```

Runs on port **8122**. Set a `SECRET_KEY` env var (16+ characters) — everything else has defaults.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | *required* | JWT signing key, minimum 16 characters |
| `REGISTRATION_ENABLED` | `false` | Allow public registration (no invite code needed) |
| `DATABASE_URL` | `sqlite+aiosqlite:////app/data/chores_os.db` | Database path |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Refresh token lifetime |
| `COOKIE_SECURE` | `false` | Set `true` behind HTTPS |
| `DAILY_RESET_HOUR` | `0` | UTC hour for the daily assignment reset |
| `TZ` | `Europe/London` | Container timezone |
| `MAX_UPLOAD_SIZE_MB` | `5` | Photo upload size limit |

### First run

The database, default categories, achievements, and some template quests are created on first startup. The first user to register becomes the admin. After that, registration requires an invite code by default — generate them from the admin dashboard.

## Project layout

```
backend/
  main.py          # FastAPI app, middleware, startup
  models.py        # SQLAlchemy models
  routers/         # Route modules (auth, chores, rewards, calendar, etc.)
  seed.py          # Default categories, achievements, template quests
frontend/
  src/
    pages/         # Page components (dashboards, chores, rewards, calendar, etc.)
    components/    # Shared components (layout, modals, avatar, spin wheel)
    contexts/      # Auth, theme, WebSocket providers
    hooks/         # useAuth, useTheme, useWebSocket, useNotifications
    api/client.js  # Fetch wrapper with token refresh
data/              # SQLite DB + uploaded photos (mounted as a Docker volume)
```

## Features

- **Dark UI with game language** — quests instead of chores, XP instead of points, Treasure Shop instead of reward store. Dark theme by default, light mode available.
- **PWA** — installable on phones and tablets with a service worker for offline support.
- **Streaks** — complete all assigned quests in a day to keep a streak going. Milestone notifications at 7, 14, 30, 50, and 100 days.
- **14 achievements** — things like first quest completed, 7-day streak, all quests done before noon, 1000 lifetime XP.
- **Daily spin wheel** — animated wheel awarding 1–25 bonus XP once per day.
- **Chore rotations** — parents can rotate a quest between kids on a set cadence.
- **Calendar with trading** — weekly calendar view. Kids can propose quest swaps with siblings.
- **Photo proof** — parents can require a photo when completing specific quests.
- **Notifications** — in-app notification panel with real-time WebSocket delivery.
- **Rate limiting** — login, PIN, and registration endpoints are rate-limited.
- **Audit log** — tracks logins, role changes, and point adjustments.

## API

The backend has around 100 endpoints across 13 route modules. Some key ones:

- `POST /api/auth/register`, `/login`, `/pin-login`, `/refresh`
- `GET/POST /api/chores` + `/{id}/complete`, `/{id}/verify`, `/{id}/skip`
- `GET/POST /api/rewards` + `/{id}/redeem`, `/redemptions/{id}/approve`
- `GET /api/stats/me`, `/family`, `/leaderboard`
- `GET /api/calendar` — weekly assignments (auto-generated)
- `POST /api/calendar/trade` — quest trade proposals
- `GET/POST /api/spin` — daily bonus wheel
- `GET/POST /api/wishlist` — kid wishlists
- `WS /ws/{user_id}` — real-time updates
