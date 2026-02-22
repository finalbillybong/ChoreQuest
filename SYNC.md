# Syncing from the open-source ChoreQuest repo

This repo (chorequest-saas) is the SaaS variant. To pull in bug fixes and features from the upstream open-source project:

## One-time setup

1. Add the open-source repo as a remote (use the real URL; example below):

   ```bash
   git remote add upstream https://github.com/OWNER/chorequest.git
   ```

2. Confirm remotes:

   ```bash
   git remote -v
   # origin    https://github.com/finalbillybong/chorequest-saas.git  (your private repo)
   # upstream  https://github.com/OWNER/chorequest.git                 (open-source)
   ```

## Each time you want to pull upstream changes

**Option A – script (easiest)**

```bash
./scripts/sync-from-upstream.sh
```

**Option B – manual**

```bash
git fetch upstream
git merge upstream/main   # or upstream/master — use whatever branch upstream uses
# Resolve any conflicts, then:
git add .
git commit -m "Merge upstream (or describe conflicts fixed)"
git push origin main
```

## What to expect

- **No conflicts**: Upstream changed files we don’t touch. Merge is clean.
- **Conflicts**: Usually in files that exist in both (e.g. `backend/main.py`, `frontend/src/App.jsx`). Fix by choosing our SaaS version where it’s intentional (Firebase, CSP, routes) and upstream’s version for new features/bug fixes, then commit.

## SaaS-only areas (we usually keep our version)

- `backend/providers/auth/firebase.py` – Firebase auth
- `backend/routers/families.py` – create family + join via invite code
- `backend/config.py` – `APP_MODE`, `TRIAL_DAYS`, `FREE_CHILD_LIMIT`, Firebase/Stripe env
- `frontend/src/pages/SaasLogin.jsx`, `Onboarding.jsx` – SaaS login & onboarding
- `frontend/src/hooks/useAuth.jsx` – `createFamily` / `joinFamily`, Firebase login
- `docker-compose.saas.yml`, `.env.saas` – SaaS deploy config

When in doubt, keep the SaaS behaviour for auth/families/billing and take upstream changes for chores, rewards, UI, and other shared features.
