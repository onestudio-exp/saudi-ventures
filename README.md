# Saudi Venture Economy Intelligence

> AI-powered, real-time intelligence on the Saudi venture economy — ecosystem health, funding activity, investment momentum, and sector performance at a glance. Powered by Sentra's national-intelligence engine.

A One Studio venture · [Hub page](https://onestudio-agent-hub.vercel.app/ventures/saudi-ventures)

---

# Product Vision

Become the intelligence layer for the Saudi venture ecosystem — providing a real-time view of the Saudi venture economy, investment activity, ecosystem health, and market momentum, powered by Sentra's national-intelligence engine.

# Product Description

Saudi Venture Economy Intelligence is a public, no-login "mini Sentra": an intelligence dashboard that provides a live view of the Saudi venture ecosystem. It showcases key economic indicators, funding activity, investment trends, ecosystem health, and market momentum through interactive intelligence cards and drill-down reports. The experience also serves as the marketing front door to the full Sentra platform through a "Try it now" call-to-action.

# Objectives

* Showcase Sentra's intelligence capabilities with zero friction (no login).
* Deliver a fast, shareable overview of the Saudi venture economy and ecosystem trends.
* Highlight investment activity, funding momentum, and ecosystem health through real-time intelligence.
* Remain fully feature-flag-controlled and bilingual (EN/AR with full RTL).

# Scope

**In scope:** read-only venture economy dashboard, ecosystem intelligence reports, curated seed dataset, DB-driven feature flag, bilingual EN/AR with full RTL UI, and a landing-page CTA.

# High-Level Features

* Venture economy dashboard with ecosystem health, funding activity, investment momentum, startup formation, exit activity, and sector performance cards, plus sector and time-range filters.
* Drill-down ecosystem reports with analyst summaries, key economic insights, and tracked market signals.
* Bilingual EN/AR with full right-to-left support.
* DB-driven on/off feature flag via the capability registry.
* Marketing landing section plus a "Try it now" CTA into the demo.

---

# Tech Stack & Development

Built with [togo](https://github.com/togo-framework) — Go, the artisan way.
API-first (GraphQL + REST/OpenAPI), Supabase auth, plugin-extensible, AI-native.

## Quickstart

```bash
cp .env.example .env          # configure DATABASE_URL + Supabase
docker compose up -d          # Postgres / Supabase
togo make:resource Post title:string body:text:nullable
togo generate                 # sqlc + gqlgen + atlas + openapi
togo migrate
togo serve                    # backend + frontend together
```

`togo serve` runs **both** the Go API and the TanStack frontend (installing web
deps on first run). Use `togo serve --api-only` / `--web-only`, or `togo web`.

- API → http://localhost:8080  (GraphQL `/graphql` · REST `/api` · docs `/docs`)
- Web → http://localhost:3000

## Stack

- **API**: chi + Huma (REST/OpenAPI 3.1) + gqlgen (GraphQL)
- **Data**: sqlc (typed queries) + Atlas (migrations) + pgx/Postgres
- **Auth + Storage**: Supabase (`@supabase/ssr`) — client/server/middleware wired
- **Frontend**: TanStack + Vite + Tailwind CSS v4 + shadcn-style `ui/`
  primitives (CVA + `cn()`), `next-themes` (dark mode), `sonner` toasts, lucide icons
- **AI**: `.claude/` skills + agents + `.mcp.json` wired to the togo MCP server

## Layout

```
cmd/api/            HTTP entrypoint (REST + GraphQL)
internal/models/    domain structs            (togo make:resource)
internal/db/        sqlc schema + queries + generated code
internal/graph/     GraphQL schema + resolvers
internal/rest/      Huma handlers + generated route registry
internal/resources/ resource descriptors (dashboard/admin)
db/atlas/           Atlas desired-state schema + migrations
web/                TanStack frontend
.claude/            skills, agents, rules for Claude Code
togo.yaml           project config
togo.resources.yaml resource manifest (source of truth for codegen)
```
