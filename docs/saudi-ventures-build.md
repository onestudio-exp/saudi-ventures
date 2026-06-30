# Saudi Ventures Intelligence — Complete Build File

> Single self-contained doc to stand up the project on **another** repo.
> Hybrid public showcase + lead-gen for the Saudi startup ecosystem (ID8Media).
> App-owned data model & UI on top of the Sentra intelligence engine (Sentra harvester
> for ingestion, Cortex for narratives/alerts). togo (Go) backend + TanStack frontend. · v0.1

---


## 0. Product in one paragraph

A standalone public web platform that maps and presents the Saudi startup
ecosystem. **Outward-facing:** a credibility showcase positioning ID8Media as the
deepest, most up-to-date source on the Saudi market. **Internally:** a lightweight
demand-measurement tool — it captures leads (email + WhatsApp) against specific
features, modules, and Agent personas so the team learns what attracts real
interest. **Guiding principle:** ship simple, measure interest, then invest.

### Goals
- Polished, credible public view of the Saudi ecosystem.
- Capture leads (email + WhatsApp) tied to features/sections/personas.
- Measure relative interest to prioritize the backlog.

### Non-goals (v0.1)
- No email/WhatsApp delivery integration — leads **stored only**.
- No end-user auth/permissions for the public site.
- No automated profile editing — "claim" is a stored request.
- **Depends on the Sentra engine** — the Sentra harvester for news ingestion and Cortex for narratives/alerts (not standalone).

---

## 1. Auth boundary (the rule)

**Public site = no auth. Admin = auth required, so only an admin reads the collected info.**

| Surface | Auth | Notes |
|---|---|---|
| `/` and all public pages (ecosystem, entity profiles, agents) | **none** | open to everyone |
| Lead **submit** (claim / newsletter / agent CTA) | **none** | public can POST a Lead |
| Lead **read / list / manage** | **admin only** | the collected info is admin-gated |
| Entity / Agent **read** | none | needed for the public showcase |
| Entity / Agent **write** | admin only | manage content/agents |
| `/admin`, `/dashboard` | **admin only** | login required |

### Frontend (TanStack Router) — already the pattern in the togo scaffold
- Public routes are children of the **root** route (no guard): `/`, etc.
- Protected routes live under an `_app` route whose `beforeLoad` does:
  ```ts
  const me = await sessionMe();
  if (!me) throw redirect({ to: "/login" });
  return { me };
  ```
  Keep `/admin`, `/admin/$resource` (the Lead table), `/dashboard`, `/profile` under `_app`.
- **Add the public product pages as root children** (no guard): ecosystem `/`,
  `/entities`, `/entities/$slug`, agent sections.

### Backend (Huma REST + GraphQL) — the critical part
The generated CRUD exposes all operations; you must **split them**:
- **Public:** `POST /api/leads` (create), `GET /api/entities*`, `GET /api/agents*`.
- **Admin-only (require auth middleware):** `GET/PATCH/DELETE /api/leads*`, and all
  `entity`/`agent` writes.
- Enforce with the togo auth middleware on the admin route group; do **not** rely on
  the frontend guard alone (anyone can curl the API). A public `GET /api/leads` would
  leak every captured lead — that must be authenticated.

---

## 2. Tech stack

- **Backend:** togo (Go) — chi + **Huma** (REST/OpenAPI 3.1) + **gqlgen** (GraphQL) + **sqlc** (typed queries) + **Atlas** (migrations) + **pgx/Postgres**.
- **Frontend:** **TanStack** Router/Query + **Vite** + **Tailwind v4** + shadcn-style `ui/` primitives, `next-themes`, `sonner`, lucide.
- **AI:** `.claude/` skills + agents + `.mcp.json` (togo MCP).
- **Codegen is source of truth** — never hand-edit `*.gen.go`. Edit
  `togo.resources.yaml` or the Atlas schema, then `togo generate` + `togo migrate`.

---

## 3. Data model (3 resources)

Scaffold with `togo make:resource <Name> <field:type ...>`.

### Entity — ecosystem org profiles
`name, slug, kind, description, logo_url, website, sector, headquarters, founded_year, claimed (bool)` (+ `id, created_at, updated_at`)

### Agent — per-module persona
`name, slug, module, tagline, description, image_url, cta_text, cta_subtext, sort_order (int), active (bool)`

### Lead — unified, source-attributed (PRD §7)
| Field | Required | Notes |
|---|---|---|
| `email` | yes | primary contact |
| `whatsapp` | yes | international format |
| `message` | no | optional intent |
| `source_type` | yes | `claim` \| `newsletter` \| `agent_cta` |
| `source_page` | yes | page/module of origin |
| `source_agent` | conditional | required iff `source_type=agent_cta` |
| `created_at` | yes | server-set |

> ⚠️ Generated schemas may use a `datetime` column type. **Postgres rejects `datetime`** —
> use `timestamptz` (this bit me; see §7). Set the field type accordingly in the
> resource/Atlas schema before migrating to Postgres.

---

## 4. Build milestones (v0.1)

Each is independently shippable; recommended order:

- **M1 — Data & seeds.** Confirm schemas; write `cmd/seed` to load entities (from the
  AVO Board views we own: `avo-board.vercel.app?domain=market|radar&view=ecosystem`)
  + the Agent roster (start with 3–5: News Radar, List of Startups, Investment).
- **M2 — Public ecosystem + entity profiles + "Claim" (PRD §6.1).** Public `/`, `/entities`,
  `/entities/$slug`. "Claim your profile" → Lead with `source_type=claim`. No accounts/edit.
- **M3 — Module Agents + smart lead CTAs (PRD §6.3).** Agent persona header per section;
  **sticky** contextual CTA → low-friction lead form (email + WhatsApp + optional message);
  every submit → Lead `source_type=agent_cta` with `source_agent`. Sections isolated.
- **M4 — Newsletter capture (PRD §6.2).** Subscribe (email + WhatsApp) → Lead
  `source_type=newsletter`. Store-only, confirmation message.
- **M5 — Agent admin settings (PRD §6.3 #5).** Admin CRUD for Agent name/image/CTA copy
  (copy may be AI-generated via Cortex, §6). Auth-gated.
- **M6 — Lead inbox + metrics (PRD §3).** Admin list of Leads filterable by
  `source_type`/`source_agent`/`source_page` + per-Agent counts. Auth-gated.
- **M7 — News ingestion + narratives + alerts (NOW in v0.1).** Ingest Articles via the
  Sentra harvester (Source/CapabilitySource connectors); generate Narratives and
  classify Alerts via Cortex (versioned bilingual Prompts). Public reads (published
  narratives, radar, alerts); Article/Narrative/Alert writes + Source/Prompt are auth-gated.

> **DB is Postgres.** The app runs on Postgres now — sqlc engine `postgresql`, migrate via
> the **project binary** (`go run ./cmd/migrate`), not the brew `togo` binary (SQLite-only;
> see §7 #2). Atlas diff is deferred for now.

**Success metrics:** profile-claim requests, newsletter sign-ups, leads per Agent/module,
source-attribution coverage, optional-message completion rate.

---

## 5. Setup & run

```bash
cp .env.example .env          # set DATABASE_URL (+ Cortex via MCP key, §6)
togo db:up                    # local Postgres (docker)
togo generate                 # sqlc → gqlgen → openapi
go run ./cmd/migrate          # apply schema via the project binary (see §7 gotchas)
togo serve                    # Go API :8080 + TanStack web :3000
```
- API → http://localhost:8080  (GraphQL `/graphql` · REST `/api` · docs `/docs`)
- Web → http://localhost:3000

---

## 6. One Studio product integrations (Cortex via MCP)

The app calls the One Studio fleet for its intelligence layer: **Cortex** (the
OpenAI-compatible LLM gateway) for AI narratives, alert classification, and
Agent CTA copy / entity blurbs. The Sentra harvester supplies news ingestion.

**There are NO hard-coded Cortex/Scout/Fort secrets or URLs.** The real on-disk
`.env` (and `.env.example`) carry only the MCP/AI section — no `CORTEX_URL`,
`CORTEX_TOKEN`, `SCOUT_*`, or `FORT_*`. Cortex is reached through an
**MCP-minted virtual key**, not a committed dev token:

1. `enable_llm` — enable the LLM capability for this venture via the One Studio MCP.
2. `create_llm_key` — mint a scoped virtual key; it returns `CORTEX_BASE_URL`
   and `CORTEX_API_KEY`.
3. The app reads `CORTEX_BASE_URL` + `CORTEX_API_KEY` from the (git-ignored)
   environment at runtime — never commit them.

**Cortex call shape:** `POST {CORTEX_BASE_URL}/v1/chat/completions`, header
`Authorization: Bearer {CORTEX_API_KEY}`, OpenAI-compatible body.

---

## 7. Gotchas I hit (save yourself the time)

1. **exFAT `._*` AppleDouble files break gqlgen.** On a `/Volumes/My Data`-style
   exFAT/network drive, macOS scatters `._*` files; gqlgen globs `*.graphqls` and
   parses `._agent.graphqls` → `Unexpected <Invalid>`. **Fix:** purge before codegen:
   ```bash
   find . -name '._*' -not -path './node_modules/*' -delete
   COPYFILE_DISABLE=1 togo generate
   ```
   They regenerate constantly on that volume — re-purge right before each `generate`/push.
   Same trick for `.git`: `find .git -name '._*' -delete` (fixes "non-monotonic index").
   **Best fix: work on a local-disk path, not the exFAT volume.**

2. **The Homebrew `togo` binary has only the SQLite driver compiled in.**
   `togo migrate` against Postgres fails: `sql: unknown driver "pgx"`. Two options:
   - **Postgres (recommended):** register the pgx `database/sql` driver in the app —
     add a one-line file (pgx/v5 is already a dep):
     ```go
     // internal/app/db_drivers.go
     package app
     import _ "github.com/jackc/pgx/v5/stdlib"
     ```
     then `go mod tidy` and migrate with the project's own binary:
     ```bash
     DB_DRIVER=pgx DATABASE_URL='postgres://postgres:postgres@localhost:5432/<db>?sslmode=disable' \
       go run ./cmd/migrate
     ```
   - **SQLite:** fine, but **keep the DB file on local disk**, not exFAT — exFAT
     triggers `attempt to write a readonly database (1032)` (SQLITE_READONLY_DBMOVED).

3. **`togo migrate` (CLI) doesn't always load `.env`.** Pass `DB_DRIVER` +
   `DATABASE_URL` inline, or run `go run ./cmd/migrate` (the project binary reads config).

4. **`datetime` column type** in a generated schema fails on Postgres
   (`type "datetime" does not exist`). Use `timestamptz`.

---

## 8. Definition of done (v0.1)

- [ ] Entities + Agents seeded (M1).
- [ ] Public ecosystem + entity profiles; "Claim" stores an attributed Lead (M2).
- [ ] Module Agents render with sticky, contextual CTAs → attributed Leads (M3).
- [ ] Newsletter capture, store-only (M4).
- [ ] Agent admin settings page, auth-gated (M5).
- [ ] Lead inbox + per-Agent/module counts, auth-gated (M6).
- [ ] **Public site needs no login; lead reads + admin are authenticated** (§1).
- [ ] News ingestion + narratives + alerts wired via the Sentra engine (M7).
- [ ] Cortex reached via an MCP-minted virtual key (`CORTEX_BASE_URL` + `CORTEX_API_KEY`); no committed secrets.

---

## 9. Open questions (PRD §10)

- Exact per-Agent CTA wording ("Want a Saudi Agent …?").
- Which of the ~17 Agents are in v0.1 vs later (start with 3–5).
- Which AVO Board view(s) seed each entity profile.

---

## 10. Reference sources (PRD §4)

| Source | Type | Role |
|---|---|---|
| ecosystemsa.com | external | Saudi Ecosystem Directory (500+ VCs/accelerators/incubators); visual ref for the Agent concept |
| avo-board.vercel.app?domain=market | internal | AVO Board — Market |
| avo-board.vercel.app?domain=radar | internal | AVO Board — Radar (news) |
| avo-board.vercel.app?view=ecosystem | internal | AVO Board — Ecosystem |

> AVO Board is our own system (we own code, admin, and data) — pull any extra detail directly.
