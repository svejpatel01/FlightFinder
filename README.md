# FlightFinder — weekend flight deal watcher

A personal, single-user web app that watches cheap round-trip flights for
upcoming weekends between your origin airports and a wishlist of destinations,
and emails you when a fare drops **below your budget** or **30%+ below its own
recent average**.

- **Next.js 16** (App Router, TypeScript) — onboarding form + API
- **SQLite via Prisma** — file-based, zero external services
- **Duffel API** — flight price search (offer requests only; never creates orders, so it's free)
- **Resend** — outbound digest email
- **node-cron** — runs the scan job on a schedule (default every 6 hours)

Single-user by design: there's one `User` row, created/edited from the
onboarding form. No auth.

---

## Setup

```bash
npm install
cp .env.example .env      # then fill in the values (see below)
npx prisma migrate deploy # create ./prisma/dev.db from migrations
npx prisma generate
npm run dev               # http://localhost:3000
```

Open the form, enter your origins / wishlist / budget / weekend patterns /
alert types / email, and submit. No confirmation email — the next scan picks it
up.

### Environment variables (`.env`)

| Var | Notes |
| --- | --- |
| `DATABASE_URL` | `file:./dev.db` |
| `DUFFEL_API_KEY_TEST` / `DUFFEL_API_KEY_LIVE` | From duffel.com → Settings → Access tokens. **The token must have write access** (`air.offer_requests.create`) — a read-only token returns `403 insufficient_permissions`. See below. |
| `DUFFEL_ENV` | `test` (default) or `live`. Live search is still free. |
| `DUFFEL_MIN_INTERVAL_MS` | Min gap between Duffel calls. Default `1100` (≈55 req/min, under the 60/60s limit). |
| `DUFFEL_MOCK` | Set to `1` to skip Duffel entirely and use deterministic fake prices — useful for exercising the full pipeline without a working token. |
| `RESEND_API_KEY` | From resend.com. |
| `EMAIL_FROM` | Until you verify a domain in Resend, use `FlightFinder <onboarding@resend.dev>` — Resend then only delivers to **your own Resend account email**. |
| `SCAN_CRON` | Cron expression for the scheduler. Default `0 */6 * * *`. |

---

## ⚠️ Duffel token permissions

The offer-request endpoint needs a token with the **`air.offer_requests.create`**
permission. A default / read-only token authenticates fine for `GET` calls but
fails offer requests with:

```
403  This endpoint requires a token with 'air.offer_requests.create' permission.
```

Fix: in the Duffel dashboard, create an access token with **write** / manage
access (or enable that scope on the existing one) and put it in `.env`. Verify
with:

```bash
npm run duffel:test -- JFK LHR 2026-10-16 2026-10-18
```

Until then, run everything with `DUFFEL_MOCK=1` to see the end-to-end flow.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next dev server (onboarding form + API) |
| `npm test` | Unit tests (weekend date generation) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run duffel:test [-- ORIG DEST DEPART RETURN]` | Hit Duffel in isolation and print the cheapest fare |
| `npm run email:test -- you@example.com` | Send a sample digest through Resend |
| `npm run scan` | Run one scan now (writes snapshots, sends email) |
| `npm run scan -- --dry-run` | Scan without writing or emailing — just print what would fire |
| `npm run cron` | Start the scheduler (stays running) |
| `npm run cron -- --run-now` | Scheduler + an immediate first run |
| `npm run db:studio` | Prisma Studio (browse the DB) |

`DUFFEL_MOCK=1 npm run scan -- --dry-run` is the quickest way to see the whole
pipeline.

---

## Scheduling the scan (production)

This build targets a local / self-hosted node process, not Vercel (SQLite
doesn't persist on Vercel serverless). Keep `npm run cron` alive with whatever
you already use:

- **pm2**: `pm2 start npm --name flightfinder-cron -- run cron`
- **systemd**: a unit running `npm run cron` in the project dir with `.env`
- **launchd / plain cron**: skip the long-running process and call
  `npm run scan` directly on a schedule
- **container**: `CMD ["npm", "run", "cron"]`

The scan self-throttles Duffel calls, skips a tick if the previous one is still
running, and sends **one digest email per run** (not one per deal).

---

## How the scan works

For the configured user, each run:

1. Generates weekend `(departDate, returnDate)` pairs for every selected
   pattern across the `weeksAhead` window
   (`FRI_SUN` / `SAT_SUN` / `THU_SUN`). Pure function, unit-tested in
   [`lib/weekends.test.ts`](lib/weekends.test.ts).
2. For every `origin × destination × date-pair`, asks Duffel for the cheapest
   economy round-trip (1 adult) and stores a `PriceSnapshot`.
   Country wishlist entries are expanded to their major airports once and
   cached on the row.
3. Computes a rolling average for that `(origin, dest, weekendPattern)` from
   recent snapshots.
4. Evaluates triggers:
   - **BUDGET** — `price <= budgetUsd`
   - **PRICE_DROP** — `price <= average * 0.7`, only once enough history exists
5. **Dedup** — checks `NotificationLog` for the same
   `user / origin / dest / departDate / returnDate / triggerType`. Re-alerts
   only if there's no prior alert, or the price has dropped a further 10%+
   below the last alerted price.
6. Sends a single digest email listing every new deal, each with route, dates,
   price, which trigger fired, and a Google Flights search link for those exact
   dates.

### "How much history is enough" (tunable in [`lib/scan.ts`](lib/scan.ts))

There's almost no history on the first runs, so the price-drop trigger is
deliberately conservative:

| Constant | Value | Meaning |
| --- | --- | --- |
| `HISTORY_WINDOW_DAYS` | 45 | ignore snapshots older than this |
| `HISTORY_MAX_SNAPSHOTS` | 8 | average over at most the 8 most recent priors |
| `MIN_HISTORY_FOR_DROP` | 3 | need ≥ 3 priors before PRICE_DROP can fire |
| `DROP_RATIO` | 0.7 | "30%+ below average" |
| `RENOTIFY_RATIO` | 0.9 | re-alert an emailed deal only if 10%+ cheaper again |

---

## Data model

`User` (singleton) · `Origin` · `WishlistDestination` (airport or country +
cached resolved airports) · `WeekendPattern` · `PriceSnapshot` (shared price
history) · `NotificationLog` (dedup ledger). Full schema in
[`prisma/schema.prisma`](prisma/schema.prisma).

Dates are stored as `"YYYY-MM-DD"` text (date-only, no timezone ambiguity).
Prices are stored with the currency Duffel returned; it's treated as ~USD and
the currency is shown in the email if it isn't USD.

---

## Notes / stretch ideas

- Per-destination budgets (v1 uses one budget across the whole wishlist).
- FX conversion when Duffel returns a non-USD fare.
- A small "recent deals" page reading from `PriceSnapshot`.
- Move to Postgres if deploying somewhere serverless.
