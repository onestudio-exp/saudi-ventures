import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { PublicFooter } from "../components/public/PublicFooter";
import { LeadForm } from "../components/public/LeadForm";
import {
  listArticles, listNarratives, listAlerts,
  type Article, type Narrative, type Alert,
} from "../lib/public";

// Relative "Xh ago" from an ISO timestamp (best-effort).
function ago(iso?: string | null): string {
  if (!iso) return "";
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return "";
  const mins = Math.max(1, Math.round((Date.now() - d) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const sevClass: Record<string, string> = { high: "sev-high", med: "sev-med", medium: "sev-med", low: "sev-low" };
const sevLabel: Record<string, string> = { high: "HIGH", med: "MED", medium: "MED", low: "LOW" };

// The Market Radar page (design M7): live signals + synthesized narratives +
// classified alerts, all from the live Scout → Cortex pipeline.
export function Narratives() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const [articles, setArticles] = useState<Article[]>([]);
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    listArticles().then((a) => setArticles(a.filter((x) => x.status !== "archived"))).catch(() => {});
    listNarratives().then((n) => setNarratives(n.filter((x) => x.status === "published"))).catch(() => {});
    listAlerts().then((a) => setAlerts(a.filter((x) => !x.acknowledged))).catch(() => {});
  }, []);

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker mb-2.5">{tx("Market Radar · بالعربية والإنجليزية", "رادار السوق · بالعربية والإنجليزية")}</p>
            <h1 className="font-display text-4xl">{tx("Signals, narratives & alerts", "الإشارات والروايات والتنبيهات")}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{tx("Ingested by Scout · synthesized & classified by Cortex.", "مُستوعبة عبر سكاوت · مُلخّصة ومصنّفة عبر كورتكس.")}</p>
          </div>
          <span className="mono flex items-center gap-2 text-[11px] text-muted-foreground/70">
            <span data-pulse className="h-1.5 w-1.5 rounded-full bg-primary" /> {tx("UPDATED HOURLY", "تحديث كل ساعة")}
          </span>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* live signals */}
          <div>
            <h2 className="font-display mb-3.5 text-base font-semibold">{tx("Live signals", "إشارات مباشرة")}</h2>
            <div className="flex flex-col gap-2.5">
              {articles.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {tx("Signals are syncing from Scout. Check back shortly.", "تتم مزامنة الإشارات من سكاوت. عُد قريبًا.")}
                </div>
              )}
              {articles.slice(0, 12).map((a) => (
                <a key={a.id} href={a.url || undefined} target="_blank" rel="noreferrer"
                  className="lrow rounded-[13px] border border-border p-[18px] transition-colors" style={{ background: "hsl(var(--card))" }}>
                  <div className="mb-2 flex items-center gap-2.5">
                    <span className="mono ntag ntag-launch rounded-md px-2 py-0.5 text-[10px]">{tx("SIGNAL", "إشارة")}</span>
                    {a.source_name && <span className="mono text-[11px] text-muted-foreground">{a.source_name}</span>}
                    {a.published_at && <span className="mono text-[11px] text-muted-foreground/60">· {ago(a.published_at)}</span>}
                  </div>
                  <div className="font-display text-base font-semibold leading-snug">{a.title}</div>
                  {(a.summary || a.why_it_matters) && (
                    <div className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{a.summary || a.why_it_matters}</div>
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* narratives + alerts */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-display mb-3.5 text-base font-semibold">{tx("Synthesized narratives", "روايات مُركّبة")}</h2>
              <div className="flex flex-col gap-3">
                {narratives.slice(0, 5).map((n) => (
                  <Link key={n.id} to="/narratives/$id" params={{ id: n.id }}
                    className="rounded-[13px] border border-border p-[18px] transition-colors hover:border-primary/40"
                    style={{ background: "linear-gradient(180deg,hsl(var(--card)),hsl(var(--background)))" }}>
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" style={{ color: "#8B79E0" }} />
                      <span className="mono text-[10px] tracking-wide" style={{ color: "#A390E8" }}>{tx("CORTEX NARRATIVE", "رواية كورتكس")}</span>
                    </div>
                    <div className="font-display text-[15px] font-semibold leading-snug">{n.title}</div>
                    <div className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">{n.body_md.replace(/[#*_>-]/g, "").slice(0, 160)}</div>
                  </Link>
                ))}
                {narratives.length === 0 && (
                  <div className="rounded-[13px] border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                    {tx("Narratives generate on the digest cycle.", "تُولَّد الروايات ضمن دورة الملخّص.")}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="font-display mb-3.5 text-base font-semibold">{tx("Classified alerts", "تنبيهات مصنّفة")}</h2>
              <div className="flex flex-col gap-2.5">
                {alerts.slice(0, 8).map((al) => (
                  <div key={al.id} className="flex items-start gap-3 rounded-xl border border-border p-[14px_16px]" style={{ background: "hsl(var(--card))" }}>
                    <span className={`mono ${sevClass[al.severity] ?? "sev-low"} mt-0.5 shrink-0 rounded-[5px] border px-2 py-0.5 text-[9.5px]`}>
                      {sevLabel[al.severity] ?? al.severity.toUpperCase()}
                    </span>
                    <div>
                      <div className="text-[13.5px] font-medium leading-snug text-foreground">{al.title}</div>
                      <div className="mono mt-1 text-[10.5px] capitalize text-muted-foreground/70">{(al.signal || "").replace(/_/g, " ")}{al.summary ? ` · ${al.summary}` : ""}</div>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                    {tx("No open alerts right now.", "لا توجد تنبيهات مفتوحة حاليًا.")}
                  </div>
                )}
              </div>
            </div>

            {/* subscribe to the radar */}
            <div className="rounded-[16px] border border-primary/25 p-5" style={{ background: "linear-gradient(160deg,hsl(var(--primary) / 0.1),hsl(var(--background)) 75%)" }}>
              <div className="text-[13px] leading-relaxed text-muted-foreground">{tx("Get the radar's weekly synthesis by email and WhatsApp.", "احصل على الخلاصة الأسبوعية للرادار عبر البريد وواتساب.")}</div>
              <div className="mt-3"><LeadForm sourceType="newsletter" sourcePage="/radar" submitLabel={tx("Subscribe", "اشترك")} /></div>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}
