# Saudi Ventures Intelligence

> Public showcase & lead-generation platform for the Saudi startup ecosystem.
> A hybrid **ID8Media** product — app-owned data model & UI built on top of the Sentra intelligence engine (the Sentra harvester for news ingestion, Cortex for AI narratives & alerts).

A One Studio venture · [Hub page](https://onestudio-agent-hub.vercel.app/ventures/saudi-ventures)

See [`PRD.md`](./PRD.md) for the full product spec.

---

# Product Vision

Become the most comprehensive, authoritative public view of the Saudi startup ecosystem — mapping entities, modules, and market activity — while measuring real demand through source-attributed lead capture.

# Product Description

Saudi Ventures Intelligence is a standalone public web platform that maps and presents the Saudi startup ecosystem. Outward-facing, it is a credibility showcase that positions ID8Media as the deepest, most up-to-date source on the Saudi market. Internally, it is a lightweight instrument for measuring demand: by capturing leads (email + WhatsApp) against specific features, modules, and Agent personas, the team learns which capabilities attract real interest and prioritizes the backlog accordingly.

**Guiding principle:** ship a simple first version, measure interest, then invest.

# Objectives

* Present a polished, credible public view of the Saudi startup ecosystem.
* Capture leads (email + WhatsApp) tied to specific features, sections, and personas.
* Measure relative interest across features to guide backlog prioritization.
* Establish ID8Media's positioning as the deepest, most up-to-date source on the Saudi market.

# Scope (v0.1)

**In scope:** entity profile pages + "claim your profile" request, newsletter capture (store-only), module **Agent** personas with smart contextual lead CTAs, an admin settings page for Agent config, a single source-attributed lead store, news ingestion (via the Sentra harvester), AI narratives & classified alerts (via Cortex), and admin authentication (lead/admin surfaces are auth-gated).

**Out of scope:** email/WhatsApp delivery integrations, automated profile editing.

# High-Level Features

* **Entity profiles & "Claim your profile"** — every ecosystem org has a profile page with a claim-request action (stored request only; no accounts yet).
* **Newsletter subscription** — email + WhatsApp capture to gauge demand (store-only, no delivery integration).
* **Module Agents & smart lead CTAs** — up to ~17 specialized Agent personas (e.g. News Radar, List of Startups, Investment), each introducing its section and carrying a sticky contextual CTA that opens a low-friction lead form.
* **Source-attributed lead store** — every lead records `source_type` (claim / newsletter / agent_cta), `source_page`, and `source_agent`.
* **Agent settings page** — name, image, and CTA copy editable without engineering (copy may be AI-generated).

# Data Model (MVP)

Scaffolded via togo (`togo make:resource`):

| Resource | Purpose |
|---|---|
| **Entity** | Ecosystem org profiles (startup / VC / accelerator / incubator) + claim flow |
| **Agent**  | Per-module persona: name, image, self-description, configurable CTA |
| **Lead**   | Unified, source-attributed lead record (claim / newsletter / agent_cta) |
| **Article** | Ingested news item from the Sentra harvester |
| **Narrative** | AI-generated digest / narrative produced by Cortex |
| **Alert** | Classified signal surfaced from ingested news |
| **Capability** | DB-driven, Sentra-style registry entry: slug, bilingual names, kind, enabled flag, nav metadata, `config` jsonb, `workflow_steps` jsonb |
| **Source** | News connector definition feeding ingestion |
| **CapabilitySource** | M:N join linking capabilities to their news sources |
| **Prompt** | Versioned, bilingual Cortex prompt |

---

# Tech Stack & Development

Built with [togo](https://github.com/togo-framework) — Go, the artisan way.
API-first (GraphQL + REST/OpenAPI), plugin-extensible, AI-native.

## Quickstart

```bash
cp .env.example .env          # configure DATABASE_URL
togo db:up                    # start local Postgres (docker)
togo generate                 # sqlc + gqlgen + atlas + openapi
togo migrate                  # apply Atlas migrations
togo serve                    # backend + frontend together
```

`togo serve` runs **both** the Go API and the TanStack frontend (installing web
deps on first run). Use `togo serve --api-only` / `--web-only`, or `togo web`.

- API → http://localhost:8080  (GraphQL `/graphql` · REST `/api` · docs `/docs`)
- Web → http://localhost:3000

## Stack

- **API**: chi + Huma (REST/OpenAPI 3.1) + gqlgen (GraphQL)
- **Data**: sqlc (typed queries) + Atlas (migrations) + pgx/Postgres
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
