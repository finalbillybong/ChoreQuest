# ⚔️ ChoreQuest

> *Turn chores into quests, kids into heroes.*

A gamified family chore management app with full RPG theming. Parents create quests, assign them to kids with per-child schedules, and kids earn XP by completing them. Progress is tracked through streaks, achievements, a leaderboard, a daily spin wheel, and a treasure shop where kids spend earned XP.

Built mobile-first as an installable PWA — bottom tab bar on phones and tablets, sidebar on larger screens. Supports **push notifications** so kids and parents stay in the loop even when the app isn't open.

---

## ✨ Features at a glance

| | |
|---|---|
| 🗡️ **Quest Board** | Daily quest carousel with animated cards, tap to complete or attach photo proof |
| ⭐ **XP & Streaks** | Earn XP per quest, build daily streaks, unlock 14 achievements |
| 🎰 **Daily Spin Wheel** | Animated bonus wheel (1–25 XP) unlocked by finishing all daily quests |
| 🏪 **Treasure Shop** | Parents create rewards, kids redeem with XP — full approval workflow |
| 📋 **Wishlist** | Kids add wishlist items with links & images; parents convert them into rewards |
| 🔄 **Quest Trading** | Siblings propose quest swaps through the calendar, with real-time notifications |
| 🏆 **Leaderboard** | Weekly XP rankings with quest counts and streak display |
| 📅 **Calendar** | Weekly view with auto-generated recurring assignments |
| 🎭 **Custom Avatars** | SVG-based editor: head shape, hair, eyes, mouth, and colour palettes |
| 🔔 **Push Notifications** | Web Push (VAPID) — quest assigned, verified, achievements, trades, and more |
| 📱 **Installable PWA** | Add to home screen on any device for a native app experience |
| 🎉 **Seasonal Events** | Time-limited XP multiplier events that compound when overlapping |
| 🛡️ **Admin Tools** | User management, API keys, invite codes, and full audit log |

---

## 🚀 Getting started

### Run with Docker

```bash
git clone https://github.com/your-org/ChoreQuest.git
cd ChoreQuest
```

Create a `.env` file (or pass env vars directly):

```env
SECRET_KEY=your-secret-key-min-16-chars
TZ=Europe/London
```

Then start:

```bash
docker compose up -d
```

The app runs on port **8122**. The first user to register automatically becomes the admin. After that, registration requires an invite code (generate them from the admin dashboard).

### Expose with Cloudflare Tunnel

ChoreQuest works great behind a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) — no port forwarding needed, free HTTPS, and it enables push notifications and PWA install on all devices.

```bash
# Install cloudflared (if not already installed)
# See: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/

# Create a tunnel
cloudflared tunnel create chorequest

# Route your domain to the tunnel
cloudflared tunnel route dns chorequest chorequest.yourdomain.com

# Run the tunnel pointing at ChoreQuest
cloudflared tunnel --name chorequest --url http://localhost:8122
```

> 💡 **Tip:** When running behind HTTPS (Cloudflare Tunnel, reverse proxy, etc.), set `COOKIE_SECURE=true` in your environment so auth cookies are sent correctly.

### Install as a web app

Once the app is accessible over HTTPS, everyone in the family can install it:

- **iOS Safari** — Tap the share button → *Add to Home Screen*
- **Android Chrome** — Tap the menu → *Install app* (or accept the install banner)
- **Desktop Chrome/Edge** — Click the install icon in the address bar

The app runs in standalone mode — no browser chrome, just like a native app. The service worker caches static assets for fast loading and provides offline fallback pages.

---

## 🔔 Notifications

ChoreQuest has two notification layers that work together:

### In-app notifications (WebSocket)
Real-time updates delivered instantly while the app is open. The bell icon shows an unread count badge, and the dropdown panel lists all recent activity.

### Push notifications (Web Push / VAPID)
Notifications that arrive even when the app is closed — just like a native app. Supported on Android, desktop browsers, and iOS 16.4+ (when installed as a PWA).

**11 notification types:** quest assigned, quest completed, quest verified, achievement unlocked, bonus XP, trade proposed/accepted/denied, streak milestone, reward approved/denied.

#### Setting up push notifications

1. Generate VAPID keys (one-time):
   ```bash
   # Using openssl
   openssl ecparam -name prime256v1 -genkey -noout -out vapid_private.pem
   # Or install a VAPID key generator (e.g. web-push library)
   npx web-push generate-vapid-keys
   ```

2. Add the keys to your environment:
   ```env
   VAPID_PUBLIC_KEY=BExamplePublicKey...
   VAPID_PRIVATE_KEY=your-private-key...
   VAPID_CLAIM_EMAIL=mailto:you@example.com
   ```

3. Users enable push notifications from **Settings → Notifications** in the app.

> 📌 Push notifications require HTTPS. Running behind a Cloudflare Tunnel satisfies this requirement.

---

## 🎮 For kids

- **Daily quest board** — see today's assigned quests in an animated card carousel, mark them done with a single tap (or attach a photo if proof is required)
- **XP and streaks** — earn XP for each verified quest, build a daily streak by completing all assigned quests. Current streak and longest streak are tracked. Streak resets if a day is missed
- **Daily spin wheel** — animated bonus wheel awarding 1–25 random XP once per day, unlocked only when all daily quests are completed/verified
- **Achievements** — 14 unlockable achievements: First Steps, Week Warrior, On Fire (7-day streak), Streak Master (30-day), Unstoppable (100-day), Piggy Bank / Money Bags / Point Millionaire (100/500/1000 lifetime XP), Early Bird (complete before 9 AM), Speed Demon (all done before noon), All Done!, Helping Hand, Treat Yourself / Big Spender (5/20 redemptions)
- **Treasure Shop** — browse and redeem rewards using earned XP. See pending/approved/fulfilled status in an inventory view
- **Wishlist** — add items with URLs, images, and notes. Parents can see wishlists and convert items into shop rewards
- **Quest trading** — propose quest swaps with siblings through the calendar. Target kid gets a notification and can accept or deny
- **Custom avatar** — SVG-based avatar editor with head shape, hair style, eyes, mouth, plus colour palettes for skin, hair, eyes, and background
- **PIN login** — log in with a 6-digit PIN instead of a password (handy for shared tablets)
- **Leaderboard** — weekly XP rankings showing each kid's weekly XP, lifetime XP, quests completed, and current streak

## 🏰 For parents

- **Quest Library** — browse all created quests in one place, search and filter by category and difficulty. Create new quests from scratch or from 24 built-in RPG-themed templates
- **Quest Assignment** — assign quests to specific kids with per-child settings:
  - Individual recurrence per kid (one-time, daily, weekly, custom days)
  - Per-kid photo proof requirements
  - Optional kid rotation with cadence (daily, weekly, fortnightly, monthly)
- **Active Quests tab** — view only quests that have active assignments, with hero count badges
- **Verification queue** — review and approve/reject completed quests from the parent dashboard, including photo proof viewing
- **Uncomplete / skip** — reverse a verification (deducting awarded XP) or skip a pending quest for the day
- **Bonus XP** — award ad-hoc bonus XP to any kid with a description
- **Rewards management** — create rewards with XP costs, stock limits, icons, and auto-approval thresholds. Approve, deny, or fulfil redemption requests
- **Family overview** — dashboard with kid cards showing today's quest progress, points balance, and current streak
- **Seasonal events** — create time-limited XP multiplier events (multipliers compound if multiple events are active)
- **Category management** — create, edit, and delete quest categories with custom icons and colours
- **Chore rotations** — rotate a quest between kids on a set cadence (daily/weekly/fortnightly/monthly) with manual advance option

## 🛡️ For admins

- **User management** — view all users, change roles (admin/parent/kid), activate/deactivate accounts
- **API keys** — generate scoped API keys with unique prefixes, track last usage, revoke keys
- **Invite codes** — generate registration codes with max uses and expiration dates. First user auto-becomes admin; subsequent users need a code (when public registration is disabled)
- **Audit log** — searchable log of logins, password changes, role changes, point adjustments, and other sensitive actions with timestamps, user IDs, and IP addresses
- **App settings** — configure daily reset hour, toggle leaderboard, spin wheel, and chore trading

---

## ⚙️ Configuration

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | *required* | JWT signing key, minimum 16 characters |
| `TZ` | `Europe/London` | Container timezone |
| `REGISTRATION_ENABLED` | `false` | Allow public registration (no invite code needed) |
| `DATABASE_URL` | `sqlite+aiosqlite:////app/data/chores_os.db` | Database path |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Refresh token lifetime |
| `COOKIE_SECURE` | `false` | Set `true` behind HTTPS |
| `CORS_ORIGINS` | *(empty)* | Comma-separated allowed origins for cross-origin requests |
| `DAILY_RESET_HOUR` | `0` | UTC hour for the daily assignment reset |
| `MAX_UPLOAD_SIZE_MB` | `5` | Photo upload size limit |
| `LOGIN_RATE_LIMIT_MAX` | `10` | Max login attempts per 300s window |
| `PIN_RATE_LIMIT_MAX` | `5` | Max PIN login attempts per 900s window |
| `REGISTER_RATE_LIMIT_MAX` | `5` | Max registration attempts per 3600s window |
| `VAPID_PUBLIC_KEY` | *(empty)* | VAPID public key for web push notifications |
| `VAPID_PRIVATE_KEY` | *(empty)* | VAPID private key for web push notifications |
| `VAPID_CLAIM_EMAIL` | `mailto:admin@example.com` | Contact email included in push requests |

### First run

The database, default categories (9), achievements (14), quest templates (24), and app settings are created on first startup. The first user to register becomes the admin. After that, registration requires an invite code by default — generate them from the admin dashboard.

### Data persistence

All persistent data lives in the `./data` directory (mounted as a Docker volume):
- `chores_os.db` — SQLite database (WAL mode)
- `uploads/` — photo proof files

Back up this directory to preserve all app data.

---

## 🧱 Tech stack

| | |
|---|---|
| **Backend** | Python / FastAPI (async) |
| **Database** | SQLite (WAL mode) |
| **ORM** | SQLAlchemy 2.0 (async) |
| **Frontend** | React 18, Vite, Tailwind CSS 4 |
| **Animations** | Framer Motion |
| **Fonts** | Inter |
| **Icons** | Lucide React |
| **Real-time** | WebSocket (per-user channels) |
| **Push** | Web Push with VAPID (pywebpush) |
| **Auth** | JWT access tokens + httpOnly refresh cookies, bcrypt, optional PIN |
| **Deployment** | Docker, single container |

---

## 📁 Project layout

```
backend/
  main.py            # FastAPI app, middleware, startup, daily reset task
  models.py          # SQLAlchemy models (18+ tables)
  schemas.py         # Pydantic request/response schemas
  auth.py            # JWT, password/PIN hashing, token creation
  config.py          # Settings validation from environment
  achievements.py    # Achievement unlock criteria checking
  dependencies.py    # Auth dependency injection (get_current_user, require_parent)
  websocket_manager.py  # WebSocket connection manager
  seed.py            # Default categories, achievements, quest templates, settings
  services/
    push.py          # Web Push subscription management
    push_hook.py     # Push notification dispatch on events
  routers/
    auth.py          # Registration, login, PIN, refresh, profile
    chores.py        # Quest CRUD, categories, templates, assignment rules, completion
    rewards.py       # Reward CRUD, redemptions, approval workflow
    calendar.py      # Weekly calendar, auto-generation, quest trading
    stats.py         # Family stats, leaderboard, achievements, history
    points.py        # Bonus XP, point adjustments
    spin.py          # Daily spin wheel
    rotations.py     # Kid rotation management
    notifications.py # Notification listing, read/unread
    push.py          # Push subscription endpoints, VAPID key
    wishlist.py      # Kid wishlists, convert to reward
    events.py        # Seasonal event CRUD
    avatar.py        # Avatar parts and customisation
    admin.py         # Users, API keys, invite codes, audit log, settings
    uploads.py       # Photo proof upload/retrieval
frontend/
  public/
    manifest.json    # PWA manifest
    sw.js            # Service worker (caching, push, offline)
  src/
    pages/           # Page components
      KidDashboard   # Quest carousel, points, streak, spin wheel access
      ParentDashboard # Family overview, verification queue, bonus XP
      AdminDashboard # Users, API keys, invite codes, audit log tabs
      Chores         # Quest library + active quests (two-tab parent view)
      ChoreDetail    # Quest detail, assignment rules, rotation, guild actions
      Calendar       # Weekly calendar view with quest assignments
      Rewards        # Treasure Shop with redemption workflow
      Inventory      # Redemption history (pending/approved/fulfilled)
      KidQuests      # Per-kid quest view for parents
      Leaderboard    # Weekly XP rankings
      Wishlist       # Kid wishlist management
      Events         # Seasonal event calendar
      Profile        # Avatar editor, stats, streak display
      Settings       # Theme, security, notification preferences
      Login          # Password and PIN login
      Register       # Registration with invite code
    components/      # Shared components
    hooks/           # useAuth, useTheme, useWebSocket, useNotifications, usePushNotifications
    api/client.js    # Fetch wrapper with token refresh
    utils/
      questThemeText.js  # RPG-themed quest title/description transforms
data/                # SQLite DB + uploaded photos (Docker volume)
static/              # Built frontend assets served by FastAPI
```

---

## 🌐 WebSocket events

Real-time updates are pushed to connected clients:

| Event | Trigger |
|-------|---------|
| `data_changed` | Any entity created/updated/deleted (with entity type) |
| `chore_completed` | Kid submits a quest for approval |
| `chore_verified` | Parent approves a quest |
| `achievement_unlocked` | Kid unlocks an achievement |
| `bonus_points` | Parent awards bonus XP |
| `reward_approved` / `denied` / `fulfilled` | Redemption status changes |
| `spin_result` | Daily spin outcome |
| `trade_proposed` / `accepted` / `denied` | Quest trade lifecycle |

---

## 🔒 Security

- **Password login** — username + password with bcrypt hashing
- **PIN login** — 6-digit PIN for quick kid access on shared devices
- **JWT tokens** — short-lived access tokens (15 min default) with httpOnly refresh cookies (30 day default)
- **Token rotation** — refresh tokens are rotated on each use, old tokens revoked
- **Rate limiting** — login (10/5min), PIN (5/15min), registration (5/hour)
- **Security headers** — X-Frame-Options, Content-Security-Policy, Strict-Transport-Security, Permissions-Policy
- **Invite-only registration** — public registration disabled by default, admin generates invite codes with usage limits and expiration
