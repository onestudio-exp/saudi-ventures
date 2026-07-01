import { useEffect, useMemo, useState } from "react";
import { Inbox, Users } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { adminList, adminUpdate } from "../lib/admin";
import { BadgeAvatar } from "../components/public/BadgeAvatar";
import { listAgents, MODULE_LABEL, type Agent } from "../lib/public";

interface Lead {
  id: string;
  email: string;
  whatsapp?: string | null;
  message?: string | null;
  source_type: string;
  source_page?: string | null;
  source_agent?: string | null;
  created_at?: string | null;
}

const SOURCES = ["all", "claim", "newsletter", "agent_cta"] as const;
const srcLabel: Record<string, string> = { all: "All", claim: "Claims", newsletter: "Newsletter", agent_cta: "Agent CTA" };
const stClass: Record<string, string> = { claim: "ntag-launch", newsletter: "ntag-policy", agent_cta: "ntag-funding" };

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Admin lead inbox + agent settings (design M5 / M6). Auth-gated (rendered under
// the /_app shell); data comes from the admin-only GET /api/leads.
export function AdminLeads() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const [tab, setTab] = useState<"leads" | "agents">("leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [err, setErr] = useState<string | null>(null);

  // Per-agent local edits (name + CTA copy), saved to /api/agents/:id via PUT.
  type Draft = { name: string; cta_text: string; cta_subtext: string };
  const [edits, setEdits] = useState<Record<string, Draft>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    adminList("leads").then((r) => setLeads(r as Lead[])).catch(() => setErr(tx("Could not load leads.", "تعذّر تحميل العملاء المحتملين.")));
    listAgents().then(setAgents).catch(() => {});
  }, []);

  const draftOf = (a: Agent): Draft => edits[a.slug] ?? { name: a.name, cta_text: a.cta_text, cta_subtext: a.cta_subtext ?? "" };
  const setDraft = (a: Agent, patch: Partial<Draft>) => setEdits((e) => ({ ...e, [a.slug]: { ...draftOf(a), ...patch } }));
  async function saveAgent(a: Agent) {
    const d = draftOf(a);
    setSaveErr(null);
    try {
      // The update endpoint replaces the record, so send the full agent + edits.
      await adminUpdate("agents", a.id, {
        name: d.name,
        slug: a.slug,
        module: a.module,
        tagline: a.tagline ?? "",
        description: a.description ?? "",
        image_url: a.image_url ?? "",
        cta_text: d.cta_text,
        cta_subtext: d.cta_subtext,
        sort_order: a.sort_order ?? 0,
        active: a.active,
      });
      setAgents((prev) => prev.map((x) => (x.slug === a.slug ? { ...x, ...d } : x)));
      setEdits((e) => { const n = { ...e }; delete n[a.slug]; return n; });
      setSaved(a.slug);
      setTimeout(() => setSaved(null), 1600);
    } catch {
      setSaveErr(tx("Save failed. Are you signed in as admin?", "فشل الحفظ. هل أنت مسجّل كمشرف؟"));
    }
  }

  const counts = useMemo(() => {
    const c = (t: string) => leads.filter((l) => l.source_type === t).length;
    return { total: leads.length, claim: c("claim"), newsletter: c("newsletter"), agent_cta: c("agent_cta") };
  }, [leads]);

  const perAgent = useMemo(
    () => agents.map((a) => ({ agent: a, count: leads.filter((l) => (l.source_agent || "") === a.slug || (l.source_agent || "") === a.name).length })),
    [agents, leads],
  );

  const rows = filter === "all" ? leads : leads.filter((l) => l.source_type === filter);

  const metrics = [
    { v: counts.total, l: tx("Total leads", "إجمالي العملاء"), c: "text-foreground" },
    { v: counts.claim, l: tx("Claims", "مطالبات"), c: "text-[#8FC2EF]" },
    { v: counts.newsletter, l: tx("Newsletter", "النشرة"), c: "text-[#E6C878]" },
    { v: counts.agent_cta, l: tx("Agent CTA", "دعوة الوكيل"), c: "text-primary" },
  ];

  return (
    <div className="mx-auto max-w-6xl p-8" dir={ar ? "rtl" : "ltr"}>
      {/* tabs */}
      <div className="mb-7 flex gap-2">
        {([["leads", Inbox, tx("Lead inbox", "صندوق العملاء")], ["agents", Users, tx("Agent settings", "إعدادات الوكلاء")]] as const).map(([k, Icon, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`inline-flex items-center gap-2 rounded-[9px] border px-4 py-2 text-sm transition-colors ${tab === k ? "border-primary/50 bg-card text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "leads" ? (
        <div>
          <h1 className="font-display text-3xl">{tx("Lead inbox", "صندوق العملاء")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tx("Every captured lead, source-attributed. The public can submit but never read.", "كل عميل محتمل مُلتقط ومنسوب لمصدره. يمكن للعامة الإرسال دون الاطّلاع.")}</p>
          {err && <p className="mt-4 text-sm text-destructive">{err}</p>}

          {/* metrics */}
          <div className="mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.l} className="rounded-[13px] border border-border p-[18px]" style={{ background: "hsl(var(--card))" }}>
                <div className={`font-display text-3xl font-semibold ${m.c}`}>{m.v}</div>
                <div className="mono mt-1 text-[10.5px] uppercase tracking-wide text-muted-foreground/70">{m.l}</div>
              </div>
            ))}
          </div>

          {/* per-agent */}
          {perAgent.length > 0 && (
            <div className="mt-6 rounded-[13px] border border-border p-5" style={{ background: "hsl(var(--card))" }}>
              <div className="mono mb-3.5 text-[10.5px] uppercase tracking-wide text-muted-foreground/70">{tx("Leads per agent", "العملاء لكل وكيل")}</div>
              <div className="flex flex-wrap gap-7">
                {perAgent.map(({ agent, count }) => (
                  <div key={agent.slug} className="flex items-center gap-3">
                    <BadgeAvatar name={agent.name} size={34} radius={9} />
                    <div>
                      <div className="font-display text-lg font-semibold">{count}</div>
                      <div className="mono text-[10px] text-muted-foreground/70">{agent.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* filters */}
          <div className="mt-6 flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {srcLabel[s]}
              </button>
            ))}
          </div>

          {/* table */}
          <div className="mt-4 overflow-hidden rounded-[13px] border border-border" style={{ background: "hsl(var(--card))" }}>
            <div className="grid grid-cols-[1.4fr_1.1fr_1fr_1.3fr_0.7fr] gap-3 border-b border-border px-[18px] py-3" style={{ background: "hsl(var(--muted))" }}>
              {[tx("Email", "البريد"), tx("WhatsApp", "واتساب"), tx("Source", "المصدر"), tx("Page / Agent", "الصفحة / الوكيل"), tx("Date", "التاريخ")].map((h) => (
                <div key={h} className="mono text-[10px] uppercase tracking-wide text-muted-foreground/70">{h}</div>
              ))}
            </div>
            {rows.length === 0 && <div className="px-[18px] py-8 text-center text-sm text-muted-foreground">{tx("No leads yet.", "لا يوجد عملاء بعد.")}</div>}
            {rows.map((l) => (
              <div key={l.id} className="lrow grid grid-cols-[1.4fr_1.1fr_1fr_1.3fr_0.7fr] items-center gap-3 border-b border-border/50 px-[18px] py-3.5">
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-foreground">{l.email}</div>
                  {l.message && <div className="mono truncate text-[10.5px] text-muted-foreground/60">{l.message}</div>}
                </div>
                <div className="mono text-[12px] text-muted-foreground">{l.whatsapp || "—"}</div>
                <div><span className={`mono ${stClass[l.source_type] ?? ""} rounded-[5px] px-2 py-0.5 text-[10px] uppercase`}>{l.source_type.replace("_", " ")}</span></div>
                <div className="mono truncate text-[11.5px] text-muted-foreground">{l.source_agent ? `${l.source_page ?? ""} · ${l.source_agent}` : l.source_page ?? "—"}</div>
                <div className="mono text-[11.5px] text-muted-foreground/70">{fmtDate(l.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h1 className="font-display text-3xl">{tx("Agent settings", "إعدادات الوكلاء")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tx("Rename each agent and edit its CTA copy. Changes go live on the public site.", "أعد تسمية كل وكيل وحرّر نص دعوته. تظهر التغييرات مباشرةً على الموقع العام.")}</p>
          {saveErr && <p className="mt-3 text-sm text-destructive">{saveErr}</p>}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {agents.map((a) => {
              const d = draftOf(a);
              const dirty = !!edits[a.slug];
              const inp = "w-full rounded-[9px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50";
              return (
                <div key={a.slug} className="rounded-[14px] border border-border p-[22px]" style={{ background: "hsl(var(--card))" }}>
                  <div className="flex items-center gap-3.5">
                    <BadgeAvatar name={d.name} size={48} radius={12} />
                    <div className="flex-1">
                      <div className="font-display text-[17px] font-semibold">{d.name}</div>
                      <div className="mono text-[10.5px] uppercase text-muted-foreground/70">{MODULE_LABEL[a.module] ?? a.module}</div>
                    </div>
                    <span className={`mono rounded-full border px-2.5 py-1 text-[10px] ${a.active ? "border-primary/25 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      {a.active ? tx("ACTIVE", "نشط") : tx("OFF", "متوقف")}
                    </span>
                  </div>

                  <label className="mono mt-4 block text-[10px] uppercase tracking-wide text-muted-foreground/70">{tx("Display name", "الاسم المعروض")}</label>
                  <input className={`mt-1.5 ${inp}`} value={d.name} onChange={(e) => setDraft(a, { name: e.target.value })} />

                  <label className="mono mt-3 block text-[10px] uppercase tracking-wide text-muted-foreground/70">{tx("CTA headline", "عنوان الدعوة")}</label>
                  <input className={`mt-1.5 ${inp}`} value={d.cta_text} onChange={(e) => setDraft(a, { cta_text: e.target.value })} />

                  <label className="mono mt-3 block text-[10px] uppercase tracking-wide text-muted-foreground/70">{tx("CTA subtext", "نص الدعوة")}</label>
                  <textarea className={`mt-1.5 ${inp} resize-none`} rows={2} value={d.cta_subtext} onChange={(e) => setDraft(a, { cta_subtext: e.target.value })} />

                  <div className="mt-4 flex items-center gap-3">
                    <button onClick={() => saveAgent(a)} disabled={!dirty}
                      className="rounded-[9px] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40">
                      {tx("Save", "حفظ")}
                    </button>
                    {dirty && <button onClick={() => setEdits((e) => { const n = { ...e }; delete n[a.slug]; return n; })} className="text-sm text-muted-foreground hover:text-foreground">{tx("Reset", "استرجاع")}</button>}
                    {saved === a.slug && <span className="mono text-xs text-primary">{tx("✓ Saved", "✓ حُفظ")}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
