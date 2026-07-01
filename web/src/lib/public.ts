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

// displayName returns the entity's Arabic name (metadata.name_ar) in AR mode when
// available, else its English name. ~97% of entities carry name_ar.
export function displayName(e: { name: string; metadata?: string | null }, ar: boolean): string {
  if (!ar) return e.name;
  try {
    const m = e.metadata ? JSON.parse(e.metadata) : {};
    if (typeof m.name_ar === "string" && m.name_ar.trim()) return m.name_ar as string;
  } catch { /* ignore */ }
  return e.name;
}

// Module -> role label (the small sub-title under the editable agent name).
export const MODULE_LABEL: Record<string, string> = {
  news: "News Radar",
  startups: "Startup Directory",
  investment: "Investment Intel",
  funding: "Funding & Deals",
  sectors: "Sectors & Market",
};
export const MODULE_LABEL_AR: Record<string, string> = {
  news: "رادار الأخبار",
  startups: "دليل الشركات الناشئة",
  investment: "ذكاء الاستثمار",
  funding: "التمويل والصفقات",
  sectors: "القطاعات والسوق",
};
// moduleLabel returns the localized role label for an agent module.
export const moduleLabel = (module: string, ar: boolean): string =>
  (ar ? MODULE_LABEL_AR[module] : MODULE_LABEL[module]) ?? module;

// Persona per agent slug — the character/voice. The editable display NAME now lives
// on the agent record itself (controllable from the admin dashboard).
export const AGENT_PERSONAS: Record<string, { name: string; character: string; character_ar: string }> = {
  "news-radar": { name: "Raqib", character: "a sharp, fast-moving news scout who surfaces what just happened in Saudi venture and why it matters", character_ar: "كشّاف أخبار سريع وحاد يرصد ما حدث للتو في ريادة الأعمال السعودية ولماذا يهم" },
  "list-of-startups": { name: "Rowad", character: "an encyclopedic guide to Saudi startups — who they are, what they build, and where they stand", character_ar: "دليل موسوعي للشركات الناشئة السعودية — من هم، وماذا يبنون، وأين يقفون" },
  "investment": { name: "Mustathmir", character: "a measured investment analyst tracking Saudi VCs, funds, and where capital flows", character_ar: "محلّل استثماري متّزن يتابع صناديق ومستثمري السعودية وأين يتدفّق رأس المال" },
  "funding-deals": { name: "Safqa", character: "a deal-savvy tracker of Saudi funding rounds, M&A, and exits", character_ar: "متتبّع بارع للصفقات يرصد جولات التمويل والاستحواذات والتخارجات في السعودية" },
  "sectors-market": { name: "Sooq", character: "a market trend-spotter reading sector momentum across the Saudi economy", character_ar: "راصد لاتجاهات السوق يقرأ زخم القطاعات عبر الاقتصاد السعودي" },
};

// chat sends the conversation (+ agent/entity context + reply language) to Cortex.
export async function chat(
  messages: ChatMessage[],
  ctx: { agent?: string; entity?: string; lang?: string },
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

// --- Platform RAG (Ask the ecosystem) ----------------------------------------

export interface AskSource { name: string; slug: string; sector: string }

// ask runs a retrieval-augmented question over the whole knowledge base: the
// backend retrieves the most relevant entities/narratives and Cortex answers,
// grounded, with entity citations.
export async function ask(question: string, lang: string): Promise<{ answer: string; sources: AskSource[] }> {
  const r = await fetch(`${API}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, lang }),
  });
  if (!r.ok) {
    if (r.status === 503) throw new Error("AI is not configured on this server.");
    throw new Error(`ask failed (${r.status})`);
  }
  const d = (await r.json()) as { answer: string; sources?: AskSource[] };
  return { answer: d.answer, sources: d.sources ?? [] };
}

// entityBrief returns a short Cortex-written intelligence brief for one entity,
// grounded in its record (via the chat endpoint) and replied in `lang`. Cached in
// sessionStorage per entity+language so re-visits are instant and not re-billed.
export async function entityBrief(slug: string, name: string, lang: string): Promise<string> {
  const key = `brief:${lang}:${slug}`;
  try { const c = sessionStorage.getItem(key); if (c) return c; } catch { /* ignore */ }
  const prompt = lang === "ar"
    ? `اكتب موجز ذكاء اصطناعي موجزًا (٢-٣ جمل) عن "${name}" ودوره وأهميته ضمن منظومة ريادة الأعمال السعودية. بدون مقدمات.`
    : `Write a concise 2-3 sentence AI intelligence brief on "${name}" — what it does and its role in the Saudi venture ecosystem. No preamble.`;
  const reply = await chat([{ role: "user", content: prompt }], { entity: slug, lang });
  try { sessionStorage.setItem(key, reply); } catch { /* ignore */ }
  return reply;
}

// entityReport generates a structured multi-section intelligence report on an entity
// (Role & Positioning / Ecosystem Fit / Strategic Outlook), grounded in its record,
// replied in `lang`. Cached per entity + language. This is the deep dossier content.
export async function entityReport(
  slug: string, name: string, kind: string, sector: string, hq: string, metadata: string, lang: string,
): Promise<string> {
  const key = `report:${lang}:${slug}`;
  try { const c = sessionStorage.getItem(key); if (c) return c; } catch { /* ignore */ }
  const rec = (metadata || "").slice(0, 2200);
  const prompt = lang === "ar"
    ? `أنت محلّل أول في منصة "ريادة الأعمال السعودية للذكاء". اكتب تقرير استخبارات منظّمًا عن "${name}" (النوع: ${kind}، القطاع: ${sector}، المقر: ${hq}) ومكانته في منظومة ريادة الأعمال السعودية. استخدم بالضبط هذه الأقسام بعناوين markdown من مستوى ثالث: ### الدور والتموضع، ### الملاءمة ضمن المنظومة، ### النظرة الاستراتيجية وما يجب مراقبته. جملتان إلى ثلاث لكل قسم، تحليلية ومحددة. استند إلى السجل: ${rec}. إن كانت البيانات محدودة فاستنتج من فئة الكيان وسياق السوق السعودي. بدون مقدمات.`
    : `You are a senior analyst at Saudi Ventures Intelligence. Write a structured intelligence report on "${name}" (kind: ${kind}, sector: ${sector}, HQ: ${hq}) and its place in the Saudi venture ecosystem. Use exactly these markdown H3 sections: ### Role & Positioning, ### Ecosystem Fit, ### Strategic Outlook & What to Watch. 2-3 sentences each, analytical and specific. Ground it in this record: ${rec}. If data is limited, reason from the entity's category and Saudi market context. No preamble.`;
  const reply = await chat([{ role: "user", content: prompt }], { entity: slug, lang });
  try { sessionStorage.setItem(key, reply); } catch { /* ignore */ }
  return reply;
}

// capabilityBrief returns a short Cortex intelligence brief on a capability's
// domain within the Saudi ecosystem, in `lang`. Cached per capability + language.
export async function capabilityBrief(slug: string, name: string, desc: string, lang: string): Promise<string> {
  const key = `capbrief:${lang}:${slug}`;
  try { const c = sessionStorage.getItem(key); if (c) return c; } catch { /* ignore */ }
  const prompt = lang === "ar"
    ? `اكتب موجز ذكاء (٣-٤ جمل) عن حالة "${name}" (${desc}) ضمن منظومة ريادة الأعمال السعودية، مبنيًا على البيانات المتتبَّعة. بدون مقدمات.`
    : `Write a 3-4 sentence intelligence brief on the state of "${name}" (${desc}) within the Saudi venture ecosystem, grounded in the tracked data. No preamble.`;
  const reply = await chat([{ role: "user", content: prompt }], { lang });
  try { sessionStorage.setItem(key, reply); } catch { /* ignore */ }
  return reply;
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
