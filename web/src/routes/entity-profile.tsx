import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, Globe, ShieldCheck, Sparkles } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { ChatFab } from "../components/public/ChatFab";
import { SmartActions } from "../components/public/SmartActions";
import { BadgeAvatar } from "../components/public/BadgeAvatar";
import { Markdown } from "../components/public/Markdown";
import { getEntityBySlug, listEntities, entityBrief, entityReport, displayName, AGENT_PERSONAS, type Entity } from "../lib/public";
import { useTranslated } from "../lib/translate";

// Which persona "watches" an entity, by kind — always the news radar plus one specialist.
function watchers(kind: string): string[] {
  const k = kind.toLowerCase();
  if (k.includes("vc") || k.includes("investor") || k.includes("fund")) return ["news-radar", "investment"];
  if (k.includes("startup")) return ["news-radar", "list-of-startups"];
  return ["news-radar", "sectors-market"];
}

export function EntityProfile() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? "";

  const [entity, setEntity] = useState<Entity | null | undefined>(undefined);
  const [similar, setSimilar] = useState<Entity[]>([]);
  const [brief, setBrief] = useState<string>("");
  const [briefLoading, setBriefLoading] = useState(false);
  const [report, setReport] = useState<string>("");
  const [eco, setEco] = useState<{ sector: number; kind: number; total: number }>({ sector: 0, kind: 0, total: 0 });

  useEffect(() => {
    getEntityBySlug(slug).then((e) => setEntity(e ?? null)).catch(() => setEntity(null));
  }, [slug]);

  // Deep, multi-section intelligence report (Cortex, cached per entity + language).
  useEffect(() => {
    if (!entity) return;
    setReport("");
    entityReport(entity.slug, entity.name, entity.kind, entity.sector ?? "", entity.headquarters ?? "", entity.metadata ?? "", language)
      .then(setReport).catch(() => setReport(""));
  }, [entity?.slug, language]);

  // Auto-generate a short Cortex intelligence brief for this entity (cached per
  // entity + language; replies in the active UI language).
  useEffect(() => {
    if (!entity) return;
    // A pre-generated brief (stored in metadata.ai_brief) shows instantly; only
    // fall back to on-demand Cortex when none is stored.
    if (storedBrief) { setBrief(""); setBriefLoading(false); return; }
    setBrief("");
    setBriefLoading(true);
    entityBrief(entity.slug, entity.name, language)
      .then(setBrief)
      .catch(() => setBrief(""))
      .finally(() => setBriefLoading(false));
  }, [entity?.slug, language]);

  useEffect(() => {
    if (!entity) return;
    listEntities(2000)
      .then((all) => {
        setSimilar(all.filter((e) => e.kind === entity.kind && e.slug !== entity.slug).slice(0, 3));
        setEco({
          sector: entity.sector ? all.filter((e) => e.sector === entity.sector).length : 0,
          kind: all.filter((e) => e.kind === entity.kind).length,
          total: all.length,
        });
      })
      .catch(() => {});
  }, [entity?.slug]);

  // Parse the source record once — for the Details table and the stored brief.
  const meta: Record<string, unknown> = (() => {
    try { return entity?.metadata ? JSON.parse(entity.metadata) : {}; } catch { return {}; }
  })();
  const storedBrief = typeof meta.ai_brief === "string" ? (meta.ai_brief as string) : "";
  const details = (() => {
    // name_ar is hidden because the title already renders it in AR.
    const hide = new Set(["id", "name", "name_ar", "logo_url", "is_active", "is_hidden", "sort_order", "created_at", "updated_at", "description", "website", "country_id", "original_page", "featured", "channel_id", "ingest_metadata", "ai_brief"]);
    const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(s);
    return Object.entries(meta).filter(([k, v]) => !hide.has(k) && v !== null && v !== "" && typeof v !== "object" && !isUUID(String(v)));
  })();
  const label = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Translate the description + stored brief to Arabic via Cortex when RTL. The
  // brief goes as its own request so it always takes the robust single-text path.
  const descTr = useTranslated([entity?.description ?? ""], ar && !!entity)[0];
  const storedBriefTr = useTranslated([storedBrief], ar && !!entity && !!storedBrief)[0];
  const description = ar ? descTr || entity?.description : entity?.description;

  // Translate kind + sector (chips + key facts) and the Details table keys/values.
  const [kindTr, sectorTr] = useTranslated([entity?.kind ?? "", entity?.sector ?? ""], ar && !!entity);
  const kindL = ar ? kindTr || entity?.kind : entity?.kind;
  const sectorL = ar ? sectorTr || entity?.sector : entity?.sector;
  const detailKeysTr = useTranslated(details.map(([k]) => label(k)), ar && !!entity);
  const detailValsTr = useTranslated(details.map(([, v]) => String(v)), ar && !!entity);
  // Prefer the pre-generated brief (translated in AR); else the on-demand one.
  const shownBrief = storedBrief ? (ar ? storedBriefTr || storedBrief : storedBrief) : brief;

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-6xl px-6 py-8 pb-20">
        <Link to="/entities" className="mono inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Arrow className="h-3.5 w-3.5 rotate-180" /> {tx("Back to directory", "العودة إلى الدليل")}
        </Link>

        {entity === undefined && <p className="mt-8 text-sm text-muted-foreground">{tx("Loading…", "جارٍ التحميل…")}</p>}
        {entity === null && <p className="mt-8 text-sm text-muted-foreground">{tx("Entity not found.", "الكيان غير موجود.")}</p>}

        {entity && (
          <>
            {/* header */}
            <div className="mt-6 flex flex-wrap items-start gap-5 border-b border-border pb-7">
              <BadgeAvatar name={entity.name} logoUrl={entity.logo_url} size={76} radius={18} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-3xl font-semibold">{displayName(entity, ar)}</h1>
                  {entity.claimed && (
                    <span className="mono inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10.5px] text-primary">
                      <ShieldCheck className="h-3 w-3" /> {tx("CLAIMED PROFILE", "ملف موثّق")}
                    </span>
                  )}
                </div>
                {description && <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {[kindL, sectorL, entity.headquarters, entity.founded_year ? `${tx("Founded", "تأسست")} ${entity.founded_year}` : null]
                    .filter(Boolean)
                    .map((chip, i) => (
                      <span key={i} className="mono rounded-md border border-border px-2.5 py-1 text-[11px] capitalize text-muted-foreground" style={{ background: "hsl(var(--secondary))" }}>{chip as string}</span>
                    ))}
                </div>
              </div>
              <a href="#claim" className="inline-flex shrink-0 items-center gap-2 rounded-[9px] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                <ShieldCheck className="h-4 w-4" /> {tx("Claim this profile", "طالب بهذا الملف")}
              </a>
            </div>

            {/* two-column body */}
            <div className="mt-8 grid gap-9 lg:grid-cols-[1fr_320px]">
              {/* main */}
              <div>
                {/* AI intelligence brief — Cortex, grounded in this entity's record */}
                <section className="surface-card rounded-2xl p-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="kicker">{tx("AI Intelligence Brief", "موجز الذكاء الاصطناعي")}</span>
                    {briefLoading && !storedBrief && <span data-pulse className="ms-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <div className="mt-3">
                    {shownBrief ? (
                      <Markdown text={shownBrief} />
                    ) : (
                      <div className="space-y-2">
                        <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-full animate-pulse rounded bg-muted" />
                        <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                      </div>
                    )}
                  </div>
                  <SmartActions
                    entity={slug}
                    actions={[
                      { label: tx("TL;DR", "خلاصة سريعة"), prompt: "Give me a single-sentence takeaway on this entity." },
                      { label: tx("Why it matters", "لماذا يهم"), prompt: "In 2 sentences, why does this entity matter in the Saudi venture ecosystem?" },
                      { label: tx("Key facts", "حقائق أساسية"), prompt: "List the 4 most important facts about this entity as bullet points." },
                    ]}
                  />
                </section>

                {/* Ecosystem context — derived positioning within the tracked dataset */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  {[
                    { v: eco.kind, l: tx(`Peers in ${entity.kind}`, `نظائر في ${kindL}`) },
                    { v: eco.sector, l: entity.sector ? tx(`In ${entity.sector}`, `في ${sectorL}`) : tx("Sector", "القطاع") },
                    { v: eco.total, l: tx("Ecosystem total", "إجمالي المنظومة") },
                  ].map((s, i) => (
                    <div key={i} className="surface-card rounded-2xl p-4">
                      <div className="font-display tabular text-2xl font-semibold">{s.v.toLocaleString()}</div>
                      <div className="kicker mt-1 text-[10px]">{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Deep AI intelligence report — Cortex, multi-section dossier */}
                <section className="surface-card mt-6 rounded-2xl p-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="kicker">{tx("Intelligence Report", "تقرير استخباراتي")}</span>
                    {!report && <span data-pulse className="ms-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <div className="mt-3">
                    {report ? (
                      <Markdown text={report} />
                    ) : (
                      <div className="space-y-2.5">
                        {[10, 12, 8, 11, 12, 7].map((w, i) => (
                          <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w * 8}%` }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <SmartActions
                    entity={slug}
                    actions={[
                      { label: tx("Top risks", "أبرز المخاطر"), prompt: "What are the top 3 risks or challenges for this entity? Bullet points." },
                      { label: tx("Competitors", "المنافسون"), prompt: "Who are its main competitors or peers in Saudi Arabia?" },
                      { label: tx("Opportunities", "الفرص"), prompt: "What are its top 3 opportunities? Bullet points." },
                      { label: tx("Strengths", "نقاط القوة"), prompt: "What are its key strengths and advantages?" },
                    ]}
                  />
                </section>

                {entity.description && (
                  <>
                    <h2 className="font-display mt-8 text-[17px] font-semibold">{tx("About", "نبذة")}</h2>
                    <p className="mt-3 text-[14.5px] leading-[1.7] text-foreground/85">{description}</p>
                  </>
                )}

                {details.length > 0 && (
                  <>
                    <h2 className="font-display mt-8 text-[17px] font-semibold">{tx("Details", "التفاصيل")}</h2>
                    <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                      {details.map(([k, v], i) => (
                        <div key={k} className="flex items-start justify-between gap-3 border-b border-border/50 py-1.5 text-sm">
                          <dt className="text-muted-foreground">{ar ? detailKeysTr[i] || label(k) : label(k)}</dt>
                          <dd className="text-end font-medium">{ar ? detailValsTr[i] || String(v) : String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}

                {similar.length > 0 && (
                  <>
                    <h2 className="font-display mt-8 text-[17px] font-semibold">{tx("Similar companies", "شركات مشابهة")}</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {similar.map((s) => (
                        <Link key={s.slug} to="/entities/$slug" params={{ slug: s.slug }}
                          className="ecard flex items-center gap-3 rounded-xl border border-border p-3.5" style={{ background: "hsl(var(--card))" }}>
                          <BadgeAvatar name={s.name} logoUrl={s.logo_url} size={36} radius={9} />
                          <div className="min-w-0">
                            <div className="truncate text-[13.5px] font-semibold">{displayName(s, ar)}</div>
                            <div className="mono truncate text-[10.5px] text-muted-foreground/70">{s.sector || s.kind}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* sidebar */}
              <div className="flex flex-col gap-4">
                <div className="rounded-[14px] border border-border p-5" style={{ background: "hsl(var(--card))" }}>
                  <div className="mono mb-3.5 text-[10.5px] uppercase tracking-wide text-muted-foreground/70">{tx("Key facts", "حقائق أساسية")}</div>
                  <div className="flex flex-col gap-3 text-[13px]">
                    {entity.website && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{tx("Website", "الموقع")}</span>
                        <a href={entity.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 truncate text-primary hover:underline"><Globe className="h-3.5 w-3.5" /> {tx("Visit", "زيارة")}</a>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{tx("Type", "النوع")}</span><span className="capitalize">{kindL}</span></div>
                    {entity.sector && <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{tx("Sector", "القطاع")}</span><span>{sectorL}</span></div>}
                    {entity.headquarters && <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">HQ</span><span>{entity.headquarters}</span></div>}
                    {entity.founded_year && <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{tx("Founded", "التأسيس")}</span><span>{entity.founded_year}</span></div>}
                  </div>
                </div>

                <div className="rounded-[14px] border border-border p-5" style={{ background: "hsl(var(--card))" }}>
                  <div className="mono mb-3.5 text-[10.5px] uppercase tracking-wide text-muted-foreground/70">{tx("Agents watching", "وكلاء يراقبون")}</div>
                  <div className="flex flex-col gap-3">
                    {watchers(entity.kind).map((agSlug) => {
                      const p = AGENT_PERSONAS[agSlug];
                      const role = agSlug === "news-radar" ? tx("News Radar", "رادار الأخبار") : agSlug === "investment" ? tx("Investment Intel", "ذكاء الاستثمار") : agSlug === "list-of-startups" ? tx("Startup Directory", "دليل الشركات") : tx("Sectors & Market", "القطاعات والسوق");
                      return (
                        <Link key={agSlug} to="/agents/$slug" params={{ slug: agSlug }} className="flex items-center gap-3 hover:opacity-90">
                          <BadgeAvatar name={p?.name ?? agSlug} size={32} radius={9} />
                          <div><div className="text-[13px] font-semibold">{p?.name ?? agSlug}</div><div className="mono text-[10px] uppercase text-muted-foreground/70">{role}</div></div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* claim card */}
                <div id="claim" className="scroll-mt-20 rounded-[14px] border border-primary/25 p-5" style={{ background: "hsl(var(--primary) / 0.07)" }}>
                  <div className="text-[13px] leading-relaxed text-muted-foreground">{tx("Is this your company? Claim the profile to keep it accurate.", "هل هذه شركتك؟ طالب بالملف للحفاظ على دقته.")}</div>
                  <div className="mt-4"><LeadForm sourceType="claim" sourcePage={`/entities/${slug}`} submitLabel={tx("Claim profile", "طالب بالملف")} /></div>
                </div>
              </div>
            </div>

            {/* Floating "ask the AI about this entity" — per-entity intelligence on demand (Cortex) */}
            <ChatFab
              entity={slug}
              speaker={tx(`${entity.name} · AI analyst`, `${entity.name} · محلّل الذكاء`)}
              label={entity.name}
              suggestions={[
                tx(`Give me a brief on ${entity.name}.`, `أعطني نبذة عن ${entity.name}.`),
                tx("What do they do?", "ماذا يفعلون؟"),
                tx("How do they fit the Saudi ecosystem?", "كيف يندمجون في المنظومة السعودية؟"),
              ]}
            />
          </>
        )}
      </div>
    </main>
  );
}
