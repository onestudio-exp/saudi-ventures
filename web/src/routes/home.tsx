import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Radar, Rocket, TrendingUp, Handshake, Layers, Sparkles, ArrowRight, ArrowLeft,
  Check, Bell, Search, Mail, Lock,
} from "lucide-react";
import { useT } from "@togo-framework/ui";
import { APP_NAME } from "../lib/api";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { SubscribeBar } from "../components/public/SubscribeBar";
import { Markdown } from "../components/public/Markdown";
import { listAgents, listEntities, listNarratives, type Agent, type Entity, type Narrative } from "../lib/public";

// Agent module -> lucide component.
const ICONS: Record<string, typeof Layers> = {
  news: Radar, startups: Rocket, investment: TrendingUp, funding: Handshake, sectors: Layers,
};

export function Home() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [overview, setOverview] = useState<Narrative | null>(null);

  useEffect(() => {
    listNarratives()
      .then((ns) => setOverview(ns.find((n) => n.kind === "overview" && n.status === "published") ?? null))
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

  // Headline counts for the "by the numbers" strip.
  const stats = useMemo(() => {
    const by = (kind: string) => entities.filter((e) => e.kind === kind).length;
    return [
      { label: tx("Entities", "كيان"), value: entities.length },
      { label: tx("Startups", "شركات ناشئة"), value: by("Startup") },
      { label: tx("VCs", "صناديق استثمار"), value: by("VC") },
      { label: tx("Accelerators", "مسرّعات"), value: by("Accelerator") },
      { label: tx("Incubators", "حاضنات"), value: by("Incubator") },
    ];
  }, [entities, ar]);

  const perks = [
    tx("A weekly AI ecosystem brief, written for you", "موجز أسبوعي للمنظومة بالذكاء الاصطناعي، مُعدّ لك"),
    tx("Funding & deal alerts as they break", "تنبيهات التمويل والصفقات فور حدوثها"),
    tx(`Full access to ${count}+ tracked entities`, `وصول كامل إلى أكثر من ${count} كيان مُتابَع`),
  ];

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <SubscribeBar />

      {/* hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]"
          style={{ background: "radial-gradient(680px 340px at 50% -6%, color-mix(in srgb, var(--primary) 24%, transparent), transparent 70%)" }} />
        <div aria-hidden className="grid-texture pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]" />
        <div className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-24">
          <div className="reveal reveal-1 mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ background: "linear-gradient(135deg,#1f9d57,#127a44 55%,#0c5e34)" }}>
            <Sparkles className="h-7 w-7" />
          </div>
          <p className="reveal reveal-1 kicker mb-5">{tx("Saudi Venture Intelligence", "ذكاء ريادة الأعمال السعودية")}</p>
          <h1 className="font-display reveal reveal-2 mx-auto max-w-3xl text-[2.6rem] leading-[1.05] sm:text-6xl">
            {tx("The Saudi venture ecosystem, ", "منظومة ريادة الأعمال السعودية، ")}
            <span className="italic text-primary">{tx("decoded weekly.", "مُحلّلة أسبوعيًا.")}</span>
          </h1>
          <p className="reveal reveal-3 mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {tx(
              `${APP_NAME} tracks ${count}+ entities and turns the noise into one AI-written brief — funding rounds, new startups, and market shifts — delivered to your inbox and WhatsApp.`,
              `${APP_NAME} يتابع أكثر من ${count} كيان ويحوّل الضجيج إلى موجز واحد بالذكاء الاصطناعي — جولات التمويل والشركات الناشئة وتحوّلات السوق — يصلك عبر البريد وواتساب.`,
            )}
          </p>

          <ul className="reveal reveal-3 mx-auto mt-7 flex max-w-xl flex-col items-start gap-2 text-start sm:flex-row sm:flex-wrap sm:justify-center">
            {perks.map((p) => (
              <li key={p} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 shrink-0 text-primary" /> {p}
              </li>
            ))}
          </ul>

          <div className="reveal reveal-4 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#subscribe"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.7)]">
              <Mail className="h-4 w-4" /> {tx("Subscribe free", "اشترك مجانًا")}
            </a>
            <Link to="/entities"
              className="group inline-flex items-center gap-1.5 rounded-xl border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent/40">
              {tx("Explore the ecosystem", "استكشف المنظومة")}
              <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </Link>
          </div>
          <p className="reveal reveal-4 mt-3 text-xs text-muted-foreground/70">
            {tx("Free · No spam · Unsubscribe anytime", "مجاني · بلا إزعاج · إلغاء الاشتراك في أي وقت")}
          </p>
        </div>
      </section>

      {/* by the numbers — proof of scale */}
      {entities.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-12">
          <p className="kicker mb-4">{tx("By the numbers", "بالأرقام")}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((s) => (
              <div key={s.label} className="surface-card rounded-2xl p-5">
                <div className="font-mono tabular text-3xl font-semibold text-foreground">{s.value.toLocaleString()}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* primary subscribe CTA — the page's main conversion moment */}
      <section id="subscribe" className="mx-auto max-w-4xl scroll-mt-20 px-6 pb-12">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 p-8 sm:p-10"
          style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, transparent), transparent 60%)" }}>
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> {tx("Weekly intelligence", "ذكاء أسبوعي")}
              </span>
              <h2 className="font-display mt-4 text-3xl sm:text-4xl">
                {tx("Join the Saudi venture insiders.", "انضم إلى المطّلعين على ريادة الأعمال السعودية.")}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {tx(
                  "Founders, investors, and operators read our weekly brief to stay ahead. One email, no noise — the signal that matters.",
                  "يقرأ المؤسسون والمستثمرون والمشغّلون موجزنا الأسبوعي ليبقوا في المقدمة. بريد واحد بلا ضجيج — الإشارة التي تهم.",
                )}
              </p>
            </div>
            <div className="surface-card rounded-2xl p-6">
              <LeadForm sourceType="newsletter" sourcePage="home" submitLabel={tx("Subscribe free", "اشترك مجانًا")} />
              <p className="mt-3 text-xs text-muted-foreground/70">
                {tx("Free · No spam · Unsubscribe anytime", "مجاني · بلا إزعاج · إلغاء الاشتراك في أي وقت")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* what you get */}
      <section className="mx-auto max-w-6xl px-6 pb-12">
        <p className="kicker mb-4">{tx("What you get", "ما الذي تحصل عليه")}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Sparkles, t: tx("Weekly AI Brief", "موجز أسبوعي بالذكاء"), d: tx(`An AI-written digest of what moved in Saudi venture — grounded in ${count} entities.`, `موجز مكتوب بالذكاء الاصطناعي لما تحرّك في ريادة الأعمال السعودية — مبني على ${count} كيان.`) },
            { icon: Bell, t: tx("Real-time Alerts", "تنبيهات فورية"), d: tx("Funding rounds, new entrants, and market shifts — the moment they surface.", "جولات تمويل، لاعبون جدد، وتحوّلات السوق — لحظة ظهورها.") },
            { icon: Search, t: tx("The Full Directory", "الدليل الكامل"), d: tx("Search every startup, VC, accelerator and more — with deep, structured profiles.", "ابحث في كل شركة ناشئة وصندوق ومسرّعة وغيرها — بملفات عميقة ومنظّمة.") },
          ].map((c) => (
            <div key={c.t} className="surface-card rounded-2xl p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                <c.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{c.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI ecosystem brief — a taste of what subscribers get weekly */}
      {overview && (
        <section className="mx-auto max-w-4xl px-6 pb-12">
          <div className="surface-card rounded-2xl p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="kicker">{tx("This week's brief — preview", "موجز هذا الأسبوع — معاينة")}</span>
              {overview.model && <span className="ms-auto font-mono text-xs text-muted-foreground/60">{overview.model}</span>}
            </div>
            <div className="relative mt-3">
              <Markdown text={overview.body_md.length > 700 ? overview.body_md.slice(0, 700) + "…" : overview.body_md} />
              {/* fade + unlock — the full brief lands in your inbox when you subscribe */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href="#subscribe"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                <Lock className="h-3.5 w-3.5" /> {tx("Get the full brief weekly", "احصل على الموجز كاملًا أسبوعيًا")}
              </a>
              <Link to="/narratives/$id" params={{ id: overview.id }} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                {tx("Read this one in full", "اقرأ هذا كاملًا")} <Arrow className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* agents */}
      <section className="mx-auto max-w-6xl px-6 pb-4">
        <p className="kicker mb-2">{tx("Your AI agents", "وكلاؤك بالذكاء الاصطناعي")}</p>
        <p className="mb-5 max-w-xl text-sm text-muted-foreground">{tx("Five specialists watching the ecosystem for you — chat with any of them.", "خمسة متخصّصين يراقبون المنظومة نيابةً عنك — تحدّث مع أيٍّ منهم.")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => {
            const Icon = ICONS[a.module] ?? Sparkles;
            return (
              <Link key={a.slug} to="/agents/$slug" params={{ slug: a.slug }}
                className="group block rounded-2xl border border-border bg-card p-5 text-start transition-colors hover:border-primary/40 hover:bg-accent/40">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-semibold">{a.name}</span>
                  <Arrow className="ms-auto h-4 w-4 text-muted-foreground/50 transition-all group-hover:text-primary" />
                </div>
                {a.tagline && <p className="mt-3 text-sm text-muted-foreground">{a.tagline}</p>}
              </Link>
            );
          })}
        </div>
      </section>

      {/* directory — minimal link */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/entities" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          {tx("Browse the ecosystem directory", "تصفّح دليل المنظومة")} <Arrow className="h-4 w-4" />
        </Link>
      </section>

      {/* closing subscribe — for those who scrolled the whole way */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-display text-3xl sm:text-4xl">{tx("Don't miss the next shift.", "لا تفوّت التحوّل القادم.")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {tx("Get the weekly Saudi venture brief and real-time alerts by email and WhatsApp.", "احصل على موجز ريادة الأعمال السعودية الأسبوعي والتنبيهات الفورية عبر البريد وواتساب.")}
          </p>
          <div className="mx-auto mt-6 max-w-xl text-start">
            <LeadForm sourceType="newsletter" sourcePage="home-footer" submitLabel={tx("Subscribe free", "اشترك مجانًا")} />
          </div>
        </div>
      </section>
    </main>
  );
}
