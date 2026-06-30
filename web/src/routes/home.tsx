import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, ArrowLeft, Mail } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { SubscribeBar } from "../components/public/SubscribeBar";
import { RadarPanel, type RadarSignal } from "../components/public/RadarPanel";
import { BadgeAvatar } from "../components/public/BadgeAvatar";
import { PublicFooter } from "../components/public/PublicFooter";
import { listAgents, listAlerts, listEntities, listNarratives, AGENT_PERSONAS, type Agent, type Entity, type Narrative } from "../lib/public";

export function Home() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [overview, setOverview] = useState<Narrative | null>(null);
  const [signals, setSignals] = useState<RadarSignal[]>([]);

  useEffect(() => {
    listNarratives()
      .then((ns) => {
        setOverview(ns.find((n) => n.kind === "overview" && n.status === "published") ?? null);
        setSignals((prev) => {
          const narr: RadarSignal[] = ns.slice(0, 2).map((n) => ({ label: n.title, tag: "BRIEF", type: "policy" }));
          return [...narr, ...prev].slice(0, 3);
        });
      })
      .catch(() => {});
    listAlerts()
      .then((al) =>
        setSignals((prev) => {
          const sig: RadarSignal[] = al.slice(0, 3).map((a) => ({
            label: a.title,
            tag: (a.signal || "signal").replace(/_/g, " ").toUpperCase().slice(0, 10),
            type: a.signal === "funding_round" ? "funding" : a.signal === "regulation" ? "policy" : a.signal === "new_entrant" ? "launch" : "alert",
          }));
          return [...sig, ...prev].slice(0, 3);
        }),
      )
      .catch(() => {});
    listAgents()
      .then((as) =>
        setAgents(
          as
            .filter((a) => a.active)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        ),
      )
      .catch(() => {});
    listEntities(2000).then(setEntities).catch(() => {});
  }, []);

  const count = entities.length > 0 ? entities.length.toLocaleString() : "1,700";
  const by = (kind: string) => entities.filter((e) => e.kind === kind).length;

  // Radar shows real signals; before any land, a representative placeholder set.
  const radarSignals: RadarSignal[] = signals.length
    ? signals
    : [
        { label: tx("Live signals sync hourly", "تتزامن الإشارات كل ساعة"), tag: "LIVE", type: "funding" },
        { label: tx("Cortex narratives", "روايات كورتكس"), tag: "BRIEF", type: "policy" },
        { label: tx("Classified alerts", "تنبيهات مصنّفة"), tag: "ALERT", type: "alert" },
      ];

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <SubscribeBar />

      {/* hero — two-column: pitch + live market radar */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem]"
          style={{ background: "radial-gradient(900px 460px at 82% -12%, color-mix(in srgb, var(--primary) 20%, transparent), transparent 60%)" }} />
        <div aria-hidden className="grid-texture pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="reveal reveal-1 kicker mb-6 inline-flex items-center gap-2 rounded-full border border-[#1C3A2C] bg-[#12271E] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {tx("By ID8Media · Powered by Cortex", "من ID8Media · مدعوم بكورتكس")}
            </p>
            <h1 className="font-display reveal reveal-2 text-[2.6rem] font-semibold leading-[1.04] sm:text-[3.25rem]">
              {tx("The deepest map of the ", "أعمق خريطة لمنظومة ")}
              <span className="text-primary">{tx("Saudi startup", "الشركات الناشئة")}</span>
              {tx(" ecosystem.", " السعودية.")}
            </h1>
            <p className="reveal reveal-3 mt-5 max-w-[52ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
              {tx(
                "Companies, investors, deals, and market signals — continuously ingested, synthesized, and kept current. One living intelligence layer for the Kingdom's venture economy.",
                "الشركات والمستثمرون والصفقات وإشارات السوق — تُستوعب وتُلخّص وتبقى محدّثة باستمرار. طبقة ذكاء حيّة واحدة لاقتصاد ريادة الأعمال في المملكة.",
              )}
            </p>
            <div className="reveal reveal-4 mt-8 flex flex-wrap gap-3">
              <a href="#subscribe"
                className="group inline-flex items-center gap-2 rounded-[9px] bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.7)]">
                <Mail className="h-4 w-4" /> {tx("Get the weekly brief", "احصل على الموجز الأسبوعي")}
              </a>
              <Link to="/entities"
                className="group inline-flex items-center gap-1.5 rounded-[9px] border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent/40">
                {tx("Explore the ecosystem", "استكشف المنظومة")}
                <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              </Link>
            </div>
            <div className="reveal reveal-4 mt-9 flex items-center gap-8">
              {[
                { v: count, l: tx("Entities mapped", "كيان مُوثّق") },
                { v: by("VC") || by("Investor"), l: tx("Active investors", "مستثمر نشط") },
                { v: by("Startup"), l: tx("Startups tracked", "شركة ناشئة") },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-8">
                  {i > 0 && <span className="h-9 w-px bg-border" />}
                  <div>
                    <div className="font-display text-3xl font-semibold text-foreground">{typeof s.v === "number" ? s.v.toLocaleString() : s.v}</div>
                    <div className="kicker mt-1 text-[10px]">{s.l}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="reveal reveal-3">
            <RadarPanel signals={radarSignals} />
          </div>
        </div>
      </section>

      {/* sourced from — trust strip */}
      <section className="mx-auto max-w-6xl px-6 pb-11">
        <div className="flex flex-wrap items-center gap-x-9 gap-y-3 border-y border-border py-5">
          <span className="kicker">{tx("Sourced from", "المصادر")}</span>
          {["STV", "Sanabil", "Wa'ed Ventures", "Raed VC", "Impact46", "Merak Capital"].map((n) => (
            <span key={n} className="font-display text-base font-medium text-muted-foreground/70">{n}</span>
          ))}
        </div>
      </section>

      {/* directory preview */}
      <section className="mx-auto max-w-6xl px-6 pb-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">{tx("The directory", "الدليل")}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{tx("Every company, profiled and kept current.", "كل شركة، بملف مُحدّث باستمرار.")}</p>
          </div>
          <span className="mono text-xs text-muted-foreground/70">{count} {tx("entities", "كيان")}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.slice(0, 6).map((e) => (
            <Link key={e.slug} to="/entities/$slug" params={{ slug: e.slug }}
              className="ecard group rounded-2xl border border-border p-5" style={{ background: "#10151D" }}>
              <div className="mb-4 flex items-center justify-between">
                <BadgeAvatar name={e.name} logoUrl={e.logo_url} size={46} radius={11} />
                {e.claimed && <span className="mono rounded-full border border-[#1C3A2C] bg-[#12271E] px-2.5 py-1 text-[10px] text-[#5FE0AE]">✓ {tx("CLAIMED", "موثّق")}</span>}
              </div>
              <div className="font-display truncate text-lg font-semibold">{e.name}</div>
              {(e.description || e.sector) && <div className="mt-1 line-clamp-2 min-h-[2.4rem] text-[13px] leading-relaxed text-muted-foreground">{e.description || e.sector}</div>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="mono rounded-md border border-border px-2 py-0.5 text-[10.5px] text-muted-foreground" style={{ background: "#161D26" }}>{e.kind}</span>
                {e.headquarters && <span className="mono text-[10.5px] text-muted-foreground/70">{e.headquarters}</span>}
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <Link to="/entities" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            {tx("Browse the full directory", "تصفّح الدليل كاملًا")} <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* agents teaser — module specialists */}
      <section className="mx-auto max-w-6xl px-6 pb-6 pt-8">
        <div className="rounded-[20px] border border-border p-8 sm:p-10" style={{ background: "linear-gradient(180deg,#0E141C,#0B0F16)" }}>
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="kicker mb-2.5">{tx("Module Agents", "وكلاء الوحدات")}</p>
              <h2 className="font-display text-2xl font-semibold">{tx("A specialist for every corner of the market", "متخصّص لكل زاوية من السوق")}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{tx("Each Agent owns a module — watching, curating, and briefing you in Arabic and English.", "كل وكيل يملك وحدة — يراقب وينسّق ويوجز لك بالعربية والإنجليزية.")}</p>
            </div>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {agents.map((a) => {
              const persona = AGENT_PERSONAS[a.slug];
              return (
                <Link key={a.slug} to="/agents/$slug" params={{ slug: a.slug }}
                  className="ecard rounded-2xl border border-border p-5" style={{ background: "#10151D" }}>
                  <BadgeAvatar name={persona?.name ?? a.name} size={44} radius={12} />
                  <div className="font-display mt-3.5 text-base font-semibold">{persona?.name ?? a.name}</div>
                  <div className="mono mt-0.5 text-[10.5px] uppercase tracking-wide text-muted-foreground/70">{a.name}</div>
                  {a.tagline && <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">{a.tagline}</p>}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* newsletter band — the weekly brief (subscribe) */}
      <section id="subscribe" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16 pt-8">
        <div className="grid items-center gap-11 rounded-[20px] border border-[#1C3A2C] p-8 sm:p-11 lg:grid-cols-2"
          style={{ background: "linear-gradient(120deg,#0C1D16,#0B0F16 70%)" }}>
          <div>
            {overview && (
              <span className="kicker mb-3 inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> {tx("This week's brief is live", "موجز هذا الأسبوع جاهز")}
              </span>
            )}
            <h2 className="font-display text-[26px] font-semibold sm:text-3xl">{tx("The weekly Saudi venture brief", "الموجز الأسبوعي لريادة الأعمال السعودية")}</h2>
            <p className="mt-2.5 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
              {tx("Every funding round, policy shift, and market signal — synthesized into one read. Delivered to your inbox and WhatsApp.", "كل جولة تمويل وتحوّل تنظيمي وإشارة سوق — ملخّصة في قراءة واحدة. تصلك عبر البريد وواتساب.")}
            </p>
            {overview && (
              <Link to="/narratives/$id" params={{ id: overview.id }} className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                {tx("Preview this week's brief", "عاين موجز هذا الأسبوع")} <Arrow className="h-4 w-4" />
              </Link>
            )}
          </div>
          <div className="surface-card rounded-2xl p-6">
            <LeadForm sourceType="newsletter" sourcePage="home" submitLabel={tx("Subscribe to the brief", "اشترك في الموجز")} />
            <p className="mono mt-3 text-[11px] text-muted-foreground/70">
              {tx("Email + WhatsApp · no spam · unsubscribe anytime", "بريد + واتساب · بلا إزعاج · إلغاء في أي وقت")}
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
