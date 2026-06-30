# Saudi Ventures Intelligence — Product Requirements Document

> Public showcase & lead-generation platform for the Saudi startup ecosystem.
> **ID8Media** · Version 0.1 · Draft for review · 29 June 2026

---

## Document Control

| Field | Detail |
|---|---|
| Product / Project | Saudi Ventures Intelligence (hybrid: Sentra engine + app-owned data/UI) |
| Status | Draft v0.1 — for team review |
| Last updated | 29 June 2026 |

---

## 1. Overview & Background

The Saudi Ecosystem Site is a hybrid public web platform that maps and presents the Saudi startup ecosystem. It depends on Sentra as its upstream intelligence engine — the Sentra harvester for news ingestion and Cortex (the OpenAI-compatible LLM gateway, reached via an MCP-minted virtual key) for AI narratives and alert classification — while owning its own Postgres data model and the public/admin UI on its own domain.

The product serves a dual purpose. Outward-facing, it is a credibility showcase that demonstrates how deeply ID8Media understands the Saudi market, positioning the company as the most comprehensive and authoritative player in that space. Internally, it is a lightweight instrument for measuring demand: by capturing leads (email and WhatsApp) against specific features and personas, the team learns which capabilities attract real interest and can prioritize the backlog accordingly.

**Guiding principle:** ship a simple first version, measure interest, then invest. No feature in this initial scope should be over-built before demand is demonstrated.

---

## 2. Goals & Non-Goals

### 2.1 Goals
- Present a polished, credible public view of the Saudi startup ecosystem.
- Capture leads (email + WhatsApp) tied to specific features, sections, and personas.
- Measure relative interest across features to guide backlog prioritization.
- Establish ID8Media's positioning as the deepest, most up-to-date source on the Saudi market.

### 2.2 Non-Goals (for this release)
- No email-service or WhatsApp provider integration — leads are stored only.
- No automated profile editing — "claim" is a request, handled manually for now.
- Admin authentication, news ingestion, AI narratives, and alerts ARE in scope for v0.1 (see §7); the public site still needs no login.

---

## 3. Success Metrics

Because the release is an interest-measurement exercise, success is defined by signal quality rather than delivery volume.

| Metric | What it tells us |
|---|---|
| Profile claim requests submitted | Whether entity owners care enough to manage their presence |
| Newsletter sign-ups (email + WhatsApp) | Demand for periodic Saudi-market reporting |
| Lead submissions per Agent / module | Which personas and sections attract the most interest |
| Source attribution coverage | Confidence that every lead is traceable to its origin |
| Optional-message completion rate | Depth of intent behind a lead |

---

## 4. Reference & Definitions

A **"Saudi Startup Ecosystem" definition block** is added at the top of the working spec. It enumerates the canonical reference sources below (numbered 1–10 with a short description each) and is treated as the shared baseline that both the team and the AI agent build on and extend. Existing spec text is preserved but explicitly marked as defined reference.

| Source | Type | Role |
|---|---|---|
| [ecosystemsa.com](https://ecosystemsa.com/) | External | Saudi Ecosystem Directory (500+ VCs, accelerators, incubators). Also the visual reference for the per-section Agent concept. |
| [avo-board – market](https://avo-board.vercel.app/?domain=market) | Internal | AVO Board — Market view. |
| [avo-board – radar](https://avo-board.vercel.app/?domain=radar) | Internal | AVO Board — Radar (news) view. |
| [avo-board – ecosystem](https://avo-board.vercel.app/?view=ecosystem) | Internal | AVO Board — Ecosystem view. |

**Note:** the AVO Board sources are our own system — we own the code, the admin, and the underlying data, so any additional detail can be pulled from them directly.

---

## 5. Personas & Stakeholders

| Actor | Need |
|---|---|
| Entity owner (e.g. founder, VC, accelerator) | See their organization represented accurately and request control to correct it. |
| Market follower / prospect | Stay up to date on the Saudi market; receive periodic reports. |
| Lead (any visitor) | Express interest in an Agent-backed service via a frictionless form. |
| ID8Media team | Measure interest and route operational follow-up. |

---

## 6. Functional Requirements

### 6.1 Entity Profiles & "Claim Your Profile"

Each entity in the ecosystem has a dedicated profile page. Each page exposes a "Claim your profile" action allowing an owner to request the ability to edit their own details.

**User stories**
- As an entity owner, I can view my organization's profile so I can check its accuracy.
- As an entity owner, I can click "Claim your profile" and submit my contact details so the team can verify me and let me edit later.

**Acceptance criteria**
1. Every entity renders a profile page.
2. "Claim your profile" submits email + WhatsApp and shows a confirmation that the team will follow up for verification.
3. No permissions, editing, or account system is built in this release — the claim is a stored request only.
4. If claim volume is meaningful (e.g. 10/20/30+), user management becomes a follow-up decision: verified claimers get edit rights on their own page only.

### 6.2 Newsletter Subscription

A subscription CTA invites visitors to receive periodic reports on the Saudi market (daily / weekly / etc.). The goal is purely to gauge demand before any delivery infrastructure is built.

**User stories**
- As a market follower, I can subscribe with my email and WhatsApp so I can receive Saudi-market updates.

**Acceptance criteria**
1. Form collects email + WhatsApp only.
2. On submit, the contact is stored on our side and a confirmation message is shown (e.g. "You've been added — updates will reach you later").
3. No integration with any email service or WhatsApp provider in this release.

### 6.3 Module Agents & Smart Lead CTAs

Each module — a core ecosystem component such as **News Radar**, **List of Startups**, or **Investment** — is represented by an **Agent persona** (visual reference: ecosystemsa.com). The Agent appears prominently at the top of its section, introduces itself by name, and explains what it does ("I gather / analyze / maintain this data"). Target is up to ~17 specialized Agents, one per ecosystem area.

Each Agent carries a **smart, contextual CTA** that opens a very simple free-form lead capture. Example CTAs:
- **"Want a Saudi Agent Cofounder?"** — on a startup profile / list.
- **"Want a Saudi Agent Investment Manager?"** — on the Investment section.

**Purpose of the Agent + CTA:** each Agent demonstrates that a domain specialist is actively gathering, analyzing, and maintaining that section's data — making the site feel authoritative and deeply informed. The CTA converts that credibility into a lead: a visitor who finds the section valuable can request a dedicated specialist ("Agent") for their own need, and we capture their interest.

**User stories**
- As a visitor, I see an Agent that owns each section so I understand who produces and maintains that data.
- As a visitor, I can act on an Agent's CTA and submit a short lead form so the team can reach me about that service.
- As an admin, I can configure each Agent's name, image, and CTA text from a settings page so copy stays flexible without engineering effort.

**Acceptance criteria**
1. Each module renders an Agent persona (name, image, short self-description) at the top of its section.
2. Each Agent has a configurable CTA opening a free-form lead form: WhatsApp + email required, optional message field. Nothing else.
3. Every submission records its source: which page/module and which Agent it originated from.
4. The Agent's CTA stays reachable as the user scrolls (sticky / shrink-into-header or a persistent visible button), not just at the top of the section.
5. Agent name, image, and CTA text are editable from a settings page; CTA copy may be AI-generated.
6. Agent responsibilities stay isolated — no mixing of agent logic across sections.

---

## 7. Lead Data Model

All three features funnel into a single, minimal lead record. Source attribution is mandatory so interest can be measured per feature, module, and Agent.

| Field | Required | Notes |
|---|---|---|
| `email` | Yes | Primary contact. |
| `whatsapp` | Yes | Phone in international format. |
| `message` | No | Optional free-form intent. |
| `source_type` | Yes | claim \| newsletter \| agent_cta. |
| `source_page` | Yes | Page / module the lead came from. |
| `source_agent` | Conditional | Agent name when source_type = agent_cta. |
| `created_at` | Yes | Timestamp. |

### 7.1 Intelligence & Capability Resources

Beyond Entity, Agent, and Lead, v0.1 adds the intelligence layer fed by the Sentra engine plus a Sentra-style pluggable capability registry:

| Resource | Purpose |
|---|---|
| **Article** | Ingested news item from the Sentra harvester. |
| **Narrative** | AI-generated digest / narrative produced by Cortex. |
| **Alert** | Classified signal surfaced from ingested news. |
| **Capability** | DB-driven registry entry (slug, bilingual names, kind, enabled flag, nav metadata, `config` jsonb, `workflow_steps` jsonb) — capabilities are data, enabled/configured at runtime, Sentra-style, not code. |
| **Source** | News connector definition feeding ingestion. |
| **CapabilitySource** | M:N join linking capabilities to their news sources. |
| **Prompt** | Versioned, bilingual Cortex prompt. |

**Auth boundary:** Lead reads and Article/Narrative/Alert writes, plus Source and Prompt management, are admin-gated. Public reads — entities, agents/capabilities, published narratives, the radar, and alerts — need no login.

---

## 8. Technical & Non-Functional Considerations

- Standalone deployment on its own domain; no Sentra coupling.
- Agent configuration (name, image, CTA copy) driven from a settings page, with copy generation delegated to AI.
- Lead capture forms must be low-friction (minimal fields) and consistently attribute source.
- Agent modules implemented in isolation to avoid cross-section logic mixing.

---

## 9. Release Plan

| Phase | Scope | Trigger to advance |
|---|---|---|
| v0.1 (this PRD) | Profiles + claim request, newsletter capture, Agents + lead CTAs, settings page, source-attributed lead store. | Ship and start measuring interest. |
| v0.2 (conditional) | User management for verified claimers (own-page editing). | Meaningful claim volume (e.g. 10/20/30+). |
| v0.3 (conditional) | Newsletter & WhatsApp delivery integrations. | Demonstrated subscription demand. |

---

## 10. Open Questions

- **CTA wording:** confirmed as "Want a Saudi Agent …?" pattern — verify exact phrasing per Agent.
- **Agent roster:** which of the ~17 Agents are in scope for v0.1 vs later?
- **Profile data source:** which AVO Board view(s) seed each entity profile?

---

## 11. Action Items

- Add definition block + 4 reference links to top of spec doc (preserve prior text as defined reference).
- Build entity profile pages + claim request form (email + WhatsApp, no permissions).
- Build newsletter capture (store only, no integrations).
- Build Agent component + configurable settings page (name / image / CTA editable; AI-generated copy).
- Implement source-attributed lead store (all three sources tagged).
