# Multi-User Auth — Archived (how to restore)

The dashboard was simplified back to a **single-user, no-login app** on 2026-07-03.
The full multi-user version (Supabase email/password auth, allowed-users whitelist,
admin panel, per-user portfolio, refresh rate-limiting) is preserved and can be
restored easily. This file documents how it worked and how to bring it back.

## Where the old code lives

- **Git branch `multi-user-auth`** — points at commit `f44d25c`, the last commit
  that still had the full multi-user system. Everything below exists there in full.
- To see the complete diff of what was removed:
  `git diff main multi-user-auth`

## What multi-user mode consisted of

### Frontend (React / Next.js)
| File | Role |
|------|------|
| `src/lib/supabase.js` | Supabase browser client (anon key) |
| `src/components/AuthProvider.jsx` | Session context, `allowed_users` whitelist check, sign in/out |
| `src/components/AuthGate.jsx` | Blocks the whole app behind login + whitelist |
| `src/components/LoginScreen.jsx` | Email/password login UI |
| `src/components/AccessDenied.jsx` | Shown when a logged-in user isn't whitelisted / expired / disabled |
| `src/components/SplashScreen.jsx` | Branded splash while auth initializes |
| `src/app/admin/users/page.jsx` | Admin UI to manage `allowed_users` |
| `src/app/api/admin/users/route.js` | Admin API (service-role) for user management |
| Wiring in `src/app/layout.jsx` | `<AuthProvider><AuthGate>...</AuthGate></AuthProvider>` |
| Auth usage in `Sidebar.jsx` | user email, Sign Out button, admin nav link |
| Auth usage in `RefreshButton.jsx` | attaches access token, shows per-user quota |
| Auth usage in `usePortfolio.js` | cloud portfolio per `user_id` |
| Auth usage in `src/app/portfolio/page.jsx` | (destructured `user`, was unused) |

### Backend / data
- **Supabase project `swab`** (`swabpldjfmxzalkzfzvq`) — the LIVE project.
  - Table `allowed_users` — whitelist: `email, active, is_admin, expires_at`.
  - Table `trading_positions` — per-user portfolio (`user_id, ticker, entry_price,
    shares, stop_loss, entry_date, notes, status, exit_price, exit_date, is_simulated`).
  - Table `refresh_log` — one row per manual refresh, used for the daily quota.
- **`src/app/api/refresh/route.js`** enforced auth + a `DAILY_QUOTA = 5` per
  non-admin user (admins unlimited), logging each trigger to `refresh_log`.

### Env vars (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, admin route + refresh quota)
- `GITHUB_TOKEN` (workflow dispatch — still used in single-user mode)

### CI
- `.github/workflows/refresh-data.yml` had a "Keep Supabase alive" `curl` step
  (first step) that pinged `allowed_users` twice daily to prevent the free-tier
  7-day auto-pause. Removed in single-user mode (no Supabase = nothing to keep alive).

## How to restore multi-user mode

The important data (whitelist, portfolios) was **never deleted** — it still lives in
the `swab` Supabase project. Restoring is mostly bringing back the frontend code.

1. **Bring back the code** (choose one):
   - Cherry-pick / merge from the archive branch:
     `git checkout multi-user-auth -- src/lib/supabase.js src/components/AuthProvider.jsx src/components/AuthGate.jsx src/components/LoginScreen.jsx src/components/AccessDenied.jsx src/components/SplashScreen.jsx src/app/admin src/app/api/admin`
   - Then re-apply the auth wiring in `layout.jsx`, `Sidebar.jsx`,
     `RefreshButton.jsx`, `usePortfolio.js`, `api/refresh/route.js`
     (compare against `multi-user-auth` for each).
2. **Confirm env vars** exist in Vercel (see list above), especially
   `SUPABASE_SERVICE_ROLE_KEY`.
3. **Re-add the keep-alive step** to `refresh-data.yml` (see the archive branch).
4. **Verify the `swab` project isn't paused** (free tier pauses after 7 days idle;
   without the keep-alive it may pause — just resume it in the Supabase dashboard).
5. Build + deploy. Existing `trading_positions` rows reappear per user on login.

## Note on portfolio data during single-user mode

In single-user mode `usePortfolio` reads/writes **localStorage only**
(`tcc_portfolio`, `tcc_simulated_trades`). Any positions previously saved to the
`trading_positions` cloud table are NOT shown, but are NOT deleted — they remain in
Supabase and become visible again if multi-user mode is restored.
