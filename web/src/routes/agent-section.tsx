import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Radar, Rocket, TrendingUp, Handshake, Layers, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { Markdown } from "../components/public/Markdown";
import { ChatFab } from "../components/public/ChatFab";
import { BadgeAvatar } from "../components/public/BadgeAvatar";
import { getAgentBySlug, listNarratives, AGENT_PERSONAS, type Agent, type Narrative } from "../lib/public";
import { useTranslated, useTranslatedMarkdown } from "../lib/translate";

// Agent module -> lucide component.
const ICONS: Record<string, typeof Layers> = {
  news: Radar, startups: Rocket, investment: TrendingUp, funding: Handshake, sectors: Layers,
};

export function AgentSection() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? "";

  const [agent, setAgent] = useState<Agent | null | undefined>(undefined);
  const [brief, setBrief] = useState<Narrative | null>(null);

  useEffect(() => {
    getAgentBySlug(slug).then((a) => setAgent(a ?? null)).catch(() => setAgent(null));
    // The agent's AI intelligence brief is the published narrative whose kind == slug.
    listNarratives()
      .then((ns) => setBrief(ns.find((n) => n.kind === slug && n.status === "published") ?? null))
      .catch(() => setBrief(null));
  }, [slug]);

  const Icon = ICONS[agent?.module ?? ""] ?? Sparkles;
  const persona = AGENT_PERSONAS[slug];

  // Translate the agent's description + AI brief to Arabic via Cortex when RTL.
  const descTr = useTranslated([agent?.description ?? ""], ar && !!agent)[0];
  const description = ar ? descTr || agent?.description : agent?.description;
  const briefMd = useTranslatedMarkdown(brief?.body_md, ar && !!brief);

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Arrow className="h-4 w-4 rotate-180" /> {tx("Home", "الرئيسية")}
        </Link>

        {agent === undefined && <p className="mt-8 text-sm text-muted-foreground">{tx("Loading…", "جارٍ التحميل…")}</p>}
        {agent === null && <p className="mt-8 text-sm text-muted-foreground">{tx("Agent not found.", "الوكيل غير موجود.")}</p>}

        {agent && (
          <div className="mt-6 grid items-start gap-9 lg:grid-cols-[1fr_360px]">
            {/* persona + intelligence feed */}
            <div>
              <div className="rounded-[18px] border border-border p-8" style={{ background: "linear-gradient(180deg,hsl(var(--card)),hsl(var(--background)))" }}>
                <div className="flex items-center gap-5">
                  <span className="relative">
                    <BadgeAvatar name={persona?.name ?? agent.name} size={66} radius={16} />
                    <span className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-card text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <div>
                    <h1 className="font-display text-3xl">{persona?.name ?? agent.name}</h1>
                    <div className="kicker mt-1.5">{agent.name}{agent.tagline ? ` · ${agent.tagline}` : ""}</div>
                  </div>
                </div>
                {persona && (
                  <p className="mt-5 text-lg leading-relaxed text-foreground/90" style={{ fontStyle: "italic" }}>
                    “{persona.character}.”
                  </p>
                )}
                {description && <p className="mt-3 leading-relaxed text-muted-foreground">{description}</p>}
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {[tx("Cortex-powered", "مدعوم بكورتكس"), tx("AR + EN", "عربي + إنجليزي"), tx("Updated daily", "تحديث يومي")].map((p) => (
                    <span key={p} className="mono rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground" style={{ background: "hsl(var(--muted))" }}>{p}</span>
                  ))}
                </div>
              </div>

              {/* what this agent is tracking — its Cortex brief */}
              <div className="mt-6 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">{tx(`What ${persona?.name ?? agent.name} is tracking`, `ما يتابعه ${persona?.name ?? agent.name}`)}</h2>
                <span className="mono flex items-center gap-1.5 text-[11px] text-primary">
                  <span data-pulse className="h-1.5 w-1.5 rounded-full bg-primary" /> {tx("LIVE", "مباشر")}
                </span>
              </div>
              {brief ? (
                <section className="surface-card mt-3 rounded-2xl p-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="kicker">{tx("AI Intelligence Brief", "موجز الذكاء الاصطناعي")}</span>
                  </div>
                  <div className="mt-3"><Markdown text={briefMd} /></div>
                </section>
              ) : (
                <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {tx("Intelligence brief is being generated…", "يجري توليد موجز الذكاء…")}
                </p>
              )}
            </div>

            {/* sticky lead CTA → stored Lead (source_type=agent_cta, source_agent=slug) */}
            <aside className="lg:sticky lg:top-24">
              <div className="rounded-[18px] border border-primary/25 p-6" style={{ background: "linear-gradient(160deg,hsl(var(--primary) / 0.1),hsl(var(--background)) 75%)" }}>
                <BadgeAvatar name={persona?.name ?? agent.name} size={40} radius={11} />
                <h2 className="font-display mt-4 text-lg font-semibold leading-tight">{agent.cta_text}</h2>
                {agent.cta_subtext && <p className="mt-1.5 text-sm text-muted-foreground">{agent.cta_subtext}</p>}
                <div className="mt-4">
                  <LeadForm sourceType="agent_cta" sourceAgent={slug} sourcePage={`/agents/${slug}`} submitLabel={tx("Request early access", "اطلب وصولاً مبكرًا")} />
                </div>
              </div>
              <p className="mono mt-3 text-center text-[11px] leading-relaxed text-muted-foreground/70">
                {tx("No account needed · stored securely", "لا حاجة لحساب · محفوظ بأمان")}
              </p>
            </aside>

            {/* Floating chat with the agent's persona */}
            <ChatFab
              agent={slug}
              speaker={persona?.name ?? agent.name}
              label={persona?.name ?? agent.name}
              suggestions={[
                tx("What changed this week?", "ما الذي تغيّر هذا الأسبوع؟"),
                tx("Who are the key players?", "من هم اللاعبون الرئيسيون؟"),
                tx("What should I watch next?", "ما الذي ينبغي أن أراقبه تاليًا؟"),
              ]}
            />
          </div>
        )}
      </div>
    </main>
  );
}
