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

export const listEntities = () => getJSON<Entity[]>(`/api/entities?limit=200`);
export const listCapabilities = () => getJSON<Capability[]>(`/api/capabilities?limit=100`);

// No get-by-slug endpoint yet — fetch the list and match (fine for seed-sized data).
export async function getEntityBySlug(slug: string): Promise<Entity | undefined> {
  const all = await listEntities();
  return all.find((e) => e.slug === slug);
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
