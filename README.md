# FlightFinder — weekend flight deal watcher

A multi-user, invite-only web app that watches cheap round-trip weekend flights
between each user's home airports and a wishlist of destinations, and **emails**
them when a fare drops **below budget** or **well below its recent average**. A
logged-in **dashboard** shows the current cheapest fares per weekend.

- **Next.js 16** (App Router, TypeScript)
- **SQLite via Prisma** — one file, no external DB
- **Passwordless auth** — magic link emailed via Resend (invite-only allowlist)
- **Duffel API** — flight price search (offer requests only; never books, so it's free)
- **Resend** — magic-link + digest email
- **node-cron** — one scan every 6 hours, covering all users

---

## Setup

```bash
npm install
cp .env.example .env        # fill in values (see below)
npx prisma migrate deploy   # create ./prisma/dev.db
npx prisma generate
npm run invite -- seed      # add OWNER_EMAIL to the allowlist
npm run dev                 # http://localhost:3000
```

Then open the app → **Sign in** → enter `OWNER_EMAIL` → click the emailed link
(in dev the link is also returned in the API response) → **Settings** → configure
your watch. Scans run via `npm run cron` (or one-off `npm run scan`).

### Environment (`.env`)

| Var | Notes |
| --- | --- |
| `DATABASE_URL` | `file:./dev.db` |
| `APP_URL` | Public base URL — used to build magic-link + dashboard URLs. Must match the real host in production. |
| `OWNER_EMAIL` | Auto-added to the invite allowlist on startup (`invite -- seed`, or first cron run, or first `/api/auth/request`). |
| `SESSION_TTL_DAYS` | Session cookie lifetime. Default 30. |
| `DUFFEL_API_KEY_TEST` / `_LIVE` | Token needs the **`air.offer_requests.create`** permission (write access) — a read-only token 403s. |
| `DUFFEL_ENV` | `test` (default) or `live`. Live search is still free. |
| `DUFFEL_MIN_INTERVAL_MS` | Min gap between Duffel calls. Default `1100` (≈55/min, under the 60/60s limit). |
| `DUFFEL_MOCK` | `1` → deterministic fake prices, no network. |
| `RESEND_API_KEY` | From resend.com. Also sends the sign-in link. |
| `EMAIL_FROM` | Until you verify a domain in Resend, `FlightFinder <onboarding@resend.dev>` — which **only delivers to your own Resend account address**. |
| `EMAIL_MOCK` | `1` → log digest emails instead of sending. |
| `SCAN_CRON` | Scan schedule. Default `0 */6 * * *`. |

---

## Accounts & invites

Sign-in is **invite-only**. An email can request a sign-in link only if it has an
`Invite` row (or is already a user).

```bash
npm run invite -- list
npm run invite -- add sam@example.com "friend from work"
npm run invite -- remove sam@example.com
npm run invite -- seed        # re-add OWNER_EMAIL
```

Auth is passwordless: request → one-time link (15 min, single-use) → httpOnly
session cookie. No passwords are stored; tokens are stored only as SHA-256
hashes.

---

## The Duffel rate-limit ceiling (important for multi-user)

Duffel allows **60 requests/minute**, shared across *all* users (one API key).
Each scan builds the **global unique** set of `(origin, dest, departDate,
returnDate)` searches — two users watching the same route cost **one** call — but
it still scales with total distinct routes × weekends. Each offer request also
takes 5–15s of wall time.

Guardrails built in: per-user caps (**3 origins, 5 destinations, 3 weekend
patterns**), request throttling, an overlap guard so scans don't stack. Rough
capacity on the free Duffel tier: a handful of active users on a 6-hour cycle.
Many users → a paid Duffel plan or a different data source.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm test` | Unit tests (weekend date generation) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run invite -- <add\|remove\|list\|seed>` | Manage the allowlist |
| `npm run duffel:test [-- ORIG DEST DEPART RETURN]` | Hit Duffel in isolation |
| `npm run email:test -- you@example.com` | Send a sample digest |
| `npm run scan` | One scan now (all users): prices, snapshots, email |
| `npm run scan -- --dry-run` | Scan with no writes / no sends |
| `npm run cron` | Scheduler — stays running, scans every `SCAN_CRON` |
| `npm run cron -- --run-now` | Scheduler + immediate first run |
| `npm run db:studio` | Browse the DB |

`DUFFEL_MOCK=1 EMAIL_MOCK=1 npm run scan` exercises the whole pipeline offline.

---

## How the scan works

Each run (`lib/scan.ts`):

1. Loads every `scanEnabled`, fully-configured user.
2. Builds the **global unique** search set across all users.
3. Runs those searches (throttled), writes one `PriceSnapshot` each. `PriceSnapshot`
   is shared history — the rolling average is per `(origin, dest, weekendPattern)`.
4. Per user: evaluates triggers against the fresh price + rolling average:
   - **BUDGET** — `price ≤ budgetUsd`
   - **PRICE_DROP** — `price ≤ average × 0.7`, once ≥ 3 prior snapshots exist
5. **Dedup** per user, per route+dates, per trigger — re-alerts only if the price
   dropped a further 10% below the last alerted price.
6. Sends **one email digest per user** with anything new. One user's delivery
   failure never aborts the scan.

### Tuning (`lib/scan.ts`)

| Constant | Value | Meaning |
| --- | --- | --- |
| `HISTORY_WINDOW_DAYS` | 45 | ignore snapshots older than this |
| `HISTORY_MAX_SNAPSHOTS` | 8 | average over ≤ 8 most recent priors |
| `MIN_HISTORY_FOR_DROP` | 3 | priors required before PRICE_DROP can fire |
| `DROP_RATIO` | 0.7 | "30%+ below average" |
| `RENOTIFY_RATIO` | 0.9 | re-alert only if 10%+ cheaper again |

---

## Data model (`prisma/schema.prisma`)

`User` (auth + watch prefs) · `Invite` (allowlist) · `LoginToken` (single-use
magic link) · `Session` (cookie) · `Origin` · `WishlistDestination` (airport or
country + cached resolved airports) · `WeekendPattern` · `PriceSnapshot` (shared
price history) · `NotificationLog` (dedup ledger).

Dates are `"YYYY-MM-DD"` text (no timezone ambiguity). Prices carry the currency
Duffel returned, treated as ~USD.

---

## Deploying

Single Node host (not Vercel — SQLite needs a real disk). Run `npm run start`
(web) and `npm run cron` (scanner) under systemd/pm2. Put a reverse proxy
(Caddy) in front for HTTPS. `APP_URL` must be the real public URL or magic links
break. See the deployment runbook you were given for the full GCP walkthrough.

---

## Notes

- **Email to other users** requires a **verified domain in Resend** — the shared
  `onboarding@resend.dev` sender only delivers to your own Resend account
  address, so other users won't get magic links or digests until you set that up
  and change `EMAIL_FROM`.
- **Dev-only quirk:** the Turbopack dev server lazily compiles routes, so the
  *first* authenticated request to a route after an idle gap can 401 — retry
  once. Does not happen with `npm run start`.
- Stretch: per-destination budgets, FX conversion for non-USD fares, an admin UI
  for invites, Postgres for larger scale.
