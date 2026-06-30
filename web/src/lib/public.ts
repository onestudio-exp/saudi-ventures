// Public API client for the unguarded showcase pages. Reads are public
// (GET entities/capabilities); lead submit is the one public write (POST /api/leads,
// not under /api/auth so no CSRF token is required).
import { API } from "./api";

export interface Entity {
  id: string;
  name: string;
  slug: string;
  kind: string;
  description?: string | null;
  logo_url?: string | null;
  website?: string | null;
  sector?: string | null;
  headquarters?: string | null;
  founded_year?: number | null;
  claimed: boolean;
  metadata?: string | null; // full source record (JSON string) — all info
}

export interface Capability {
  id: string;
  slug: string;
  name_en: string;
  name_ar?: string | null;
  kind: string;
  enabled: boolean;
  nav_order: number;
  nav_icon?: string | null;
  route?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
}

async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`load failed (${r.status})`);
  return r.json() as Promise<T>;
}

export interface Article {
  id: string;
  url: string;
  title: string;
  content?: string | null;
  summary?: string | null;
  why_it_matters?: string | null;
  source_name?: string | null;
  source_type: string;
  image_url?: string | null;
  published_at?: string | null;
  status: string;
}

export interface Narrative {
  id: string;
  title: string;
  kind: string;
  body_md: string;
  period_start?: string | null;
  period_end?: string | null;
  window_days?: number | null;
  model?: string | null;
  status: string;
}

export interface Alert {
  id: string;
  signal: string;
  severity: string;
  title: string;
  summary?: string | null;
  article_id?: string | null;
  entity_id?: string | null;
  acknowledged: boolean;
}

export interface Agent {
  id: string;
  name: string;
  slug: string;
  module: string;
  tagline?: string | null;
  description?: string | null;
  image_url?: string | null;
  cta_text: string;
  cta_subtext?: string | null;
  sort_order?: number | null;
  active: boolean;
}

export const listAgents = () => getJSON<Agent[]>(`/api/agents?limit=100`);

export async function getAgentBySlug(slug: string): Promise<Agent | undefined> {
  const all = await listAgents();
  return all.find((a) => a.slug === slug);
}

export const listEntities = (limit = 2000) => getJSON<Entity[]>(`/api/entities?limit=${limit}`);
export const listCapabilities = () => getJSON<Capability[]>(`/api/capabilities?limit=100`);
export const listArticles = () => getJSON<Article[]>(`/api/articles?limit=100`);
export const listNarratives = () => getJSON<Narrative[]>(`/api/narratives?limit=100`);
export const listAlerts = () => getJSON<Alert[]>(`/api/alerts?limit=100`);

export async function getNarrativeById(id: string): Promise<Narrative | undefined> {
  const all = await listNarratives();
  return all.find((n) => n.id === id);
}

// No get-by-slug endpoint yet — fetch the list and match (fine for seed-sized data).
export async function getEntityBySlug(slug: string): Promise<Entity | undefined> {
  const all = await listEntities();
  return all.find((e) => e.slug === slug);
}

export async function getCapabilityBySlug(slug: string): Promise<Capability | undefined> {
  const all = await listCapabilities();
  return all.find((c) => c.slug === slug);
}

// --- AI chat (Cortex) ---------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Persona per agent slug (display side; mirrors the backend persona map).
export const AGENT_PERSONAS: Record<string, { name: string; character: string }> = {
  "news-radar": { name: "Raqib", character: "a sharp, fast-moving news scout who surfaces what just happened in Saudi venture and why it matters" },
  "list-of-startups": { name: "Rowad", character: "an encyclopedic guide to Saudi startups — who they are, what they build, and where they stand" },
  "investment": { name: "Mustathmir", character: "a measured investment analyst tracking Saudi VCs, funds, and where capital flows" },
  "funding-deals": { name: "Safqa", character: "a deal-savvy tracker of Saudi funding rounds, M&A, and exits" },
  "sectors-market": { name: "Sooq", character: "a market trend-spotter reading sector momentum across the Saudi economy" },
};

// chat sends the conversation (+ agent/entity context) to Cortex and returns the reply.
export async function chat(
  messages: ChatMessage[],
  ctx: { agent?: string; entity?: string },
): Promise<string> {
  const r = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...ctx, messages }),
  });
  if (!r.ok) {
    if (r.status === 503) throw new Error("AI chat is not configured on this server.");
    const d = await r.json().catch(() => ({}));
    throw new Error(d.detail || d.error || `chat failed (${r.status})`);
  }
  const d = (await r.json()) as { reply: string };
  return d.reply;
}

export type LeadSource = "claim" | "newsletter" | "agent_cta";

export interface LeadInput {
  email: string;
  whatsapp: string;
  message?: string;
  source_type: LeadSource;
  source_page: string;
  source_agent?: string;
}

export async function submitLead(input: LeadInput): Promise<void> {
  const r = await fetch(`${API}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.detail || d.error || `submit failed (${r.status})`);
  }
}
