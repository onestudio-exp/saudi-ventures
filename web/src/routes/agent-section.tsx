import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Radar, Rocket, TrendingUp, Handshake, Layers, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { Markdown } from "../components/public/Markdown";
import { ChatFab } from "../components/public/ChatFab";
import { getAgentBySlug, listNarratives, AGENT_PERSONAS, type Agent, type Narrative } from "../lib/public";

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

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Arrow className="h-4 w-4 rotate-180" /> {tx("Home", "الرئيسية")}
        </Link>

        {agent === undefined && <p className="mt-8 text-sm text-muted-foreground">{tx("Loading…", "جارٍ التحميل…")}</p>}
        {agent === null && <p className="mt-8 text-sm text-muted-foreground">{tx("Agent not found.", "الوكيل غير موجود.")}</p>}

        {agent && (
          <>
            <header className="mt-6 flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                <Icon className="h-7 w-7" />
              </span>
              <div>
                <h1 className="font-display text-4xl">{agent.name}</h1>
                {persona && (
                  <p className="mt-1 text-sm font-medium text-primary">
                    {tx("Meet", "تعرّف على")} {persona.name} — {persona.character}
                  </p>
                )}
                {agent.tagline && <p className="mt-2 max-w-2xl text-muted-foreground">{agent.tagline}</p>}
              </div>
            </header>

            {agent.description && <p className="mt-6 leading-relaxed text-muted-foreground">{agent.description}</p>}

            {/* AI intelligence brief (Cortex-generated narrative for this agent's domain) */}
            {brief ? (
              <section className="surface-card mt-8 rounded-2xl p-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="kicker">{tx("AI Intelligence Brief", "موجز الذكاء الاصطناعي")}</span>
                  {brief.model && <span className="ms-auto font-mono text-xs text-muted-foreground/60">{brief.model}</span>}
                </div>
                <div className="mt-3"><Markdown text={brief.body_md} /></div>
              </section>
            ) : (
              <p className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {tx("Intelligence brief is being generated…", "يجري توليد موجز الذكاء…")}
              </p>
            )}

            {/* Floating chat with the agent's persona (Cortex, grounded in the dataset + this agent's brief) */}
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

            {/* contextual Agent CTA → stored Lead (source_type=agent_cta, source_agent=slug) */}
            <section className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <h2 className="text-lg font-semibold">{agent.cta_text}</h2>
              {agent.cta_subtext && <p className="mt-1 text-sm text-muted-foreground">{agent.cta_subtext}</p>}
              <div className="mt-4">
                <LeadForm sourceType="agent_cta" sourceAgent={slug} sourcePage={`/agents/${slug}`} />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
