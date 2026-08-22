# Todos

A personal weekly task planner: dump tasks into a backlog, then pull them into
individual days as you decide what to work on. Longer-term goals live as
projects, separate from the week-to-week planning loop.

## Architecture

```
Next.js frontend  ─▶  Cloudflare Worker API (Hono)  ─▶  Cloudflare D1 (SQLite)
```

- **frontend/** — Next.js (App Router, TypeScript, Tailwind). Talks to the
  Worker over HTTP; never touches D1 directly.
- **backend/** — Cloudflare Worker (Hono) exposing a REST API, backed by D1.
  Migrations live in `backend/migrations/` and are applied with Wrangler.
- **packages/shared/** — TypeScript types shared between the two (Task,
  Category, Project, etc.) so the frontend and API can't drift apart silently.

This is an npm workspaces monorepo (`frontend`, `backend`, `packages/shared`).

## Requirements

- Node.js 22+ (Wrangler 4 requires it — see `.nvmrc`; run `nvm use` if you use nvm)
- A Cloudflare account for deployment (not required for local development)

## Install

```bash
npm install
```

This installs dependencies for all three workspaces.

## Local development

Run the Worker and the frontend in two terminals.

**1. Create the local D1 database and apply migrations:**

```bash
cd backend
npm run db:migrate:local
```

This creates a local SQLite-backed D1 database under `backend/.wrangler/` and
applies every migration in `backend/migrations/`.

**2. Start the Worker:**

```bash
cd backend
npm run dev
```

Runs at `http://localhost:8787` by default.

**3. Start the frontend:**

```bash
cd frontend
npm run dev
```

Runs at `http://localhost:3000`. It reads `NEXT_PUBLIC_API_URL` from
`frontend/.env.local` (defaults to `http://localhost:8787`; copy
`.env.local.example` if you need to recreate it).

Open `http://localhost:3000`, sign up, and you'll land on the dashboard with
six default categories (School, Work, Workout, Hobbies, Personal, Errands)
already created for you.

## Authentication

Custom, session-token based — no third-party auth provider:

- Passwords are hashed with PBKDF2-SHA256 (100k iterations, per-user salt)
  using the Web Crypto API, which runs natively in the Workers runtime.
- On login/signup the Worker issues an opaque random session token (stored
  in the `sessions` table with a 30-day expiry) and returns it in the
  response body.
- The frontend stores that token in `localStorage` and sends it as
  `Authorization: Bearer <token>` on every request. This (rather than
  cookies) avoids cross-origin `SameSite`/CSRF complexity between the
  Next.js origin and the Worker origin, and works identically on phone and
  desktop.
- Every route that reads or writes user data runs through a `requireAuth`
  middleware that resolves the token to a `user_id`, and every query is
  scoped with `WHERE user_id = ?`.

## Database

D1 (SQLite) with migrations under `backend/migrations/`. Core tables:
`users`, `sessions`, `categories`, `projects`, `tasks`. See
`backend/migrations/0001_initial.sql` for the full schema, indexes, and
foreign keys.

A task's status is one of `backlog | scheduled | completed | cancelled`.
Once a task is scheduled, its week is derived from `scheduled_date`; while
still unscheduled in a week's backlog, it carries an explicit `week_start`
so backlog queries don't need a join table.

To create a new migration:

```bash
cd backend
npx wrangler d1 migrations create todos-db <description>
```

Then apply it locally with `npm run db:migrate:local`, or against the
deployed database with `npm run db:migrate:remote`.

## Testing

Backend tests run against the real Workers runtime (via
`@cloudflare/vitest-pool-workers`), not a mock — including a real D1
instance with migrations applied automatically before each run:

```bash
cd backend
npm test
```

Coverage so far: signup/login/logout, session expiry, default category
seeding, and — critically — that one user can never read another user's
data through the API.

## Deployment

**Backend:**

```bash
cd backend
npx wrangler d1 create todos-db   # first time only; copy the database_id into wrangler.toml
npm run db:migrate:remote
npm run deploy
```

**Frontend:** deploy `frontend/` to any Next.js host (e.g. Vercel), setting
`NEXT_PUBLIC_API_URL` to your deployed Worker's URL.

## Project status

Built in phases, all landed:

1. **Foundation** — auth, schema, base API, base frontend.
2. **Tasks** — full CRUD, categories, priority, due dates.
3. **Weekly planning** — backlog, Today/Week/Backlog views, drag-and-drop
   (`@dnd-kit`) with tap-based fallbacks for mobile.
4. **Projects** — goals with progress tracking, task association.
5. **Polish** — dark mode (light/dark/system, `.dark`-class based so it can
   be toggled independent of OS preference), a mobile bottom nav alongside
   the desktop top nav, task search/filtering, a global toast for mutation
   errors (on top of the existing optimistic-update rollback), a
   configurable week start day and default task duration, and a dismissible
   first-run onboarding banner.

Recurring tasks (originally scoped as an optional Phase 6) are not built —
the schema doesn't block adding them later, but there's no UI or backend
support for recurrence rules yet.

Note: appearance/week-start-day/default-duration preferences are stored in
`localStorage`, per browser — they don't sync across devices the way task
data does (which lives in D1 and follows the account everywhere).
