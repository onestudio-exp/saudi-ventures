import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Radar, Rocket, TrendingUp, Handshake, Layers, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { getAgentBySlug, type Agent } from "../lib/public";

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

  useEffect(() => {
    getAgentBySlug(slug).then((a) => setAgent(a ?? null)).catch(() => setAgent(null));
  }, [slug]);

  const Icon = ICONS[agent?.module ?? ""] ?? Sparkles;

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
                <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
                {agent.tagline && <p className="mt-2 max-w-2xl text-muted-foreground">{agent.tagline}</p>}
              </div>
            </header>

            {agent.description && <p className="mt-6 leading-relaxed text-muted-foreground">{agent.description}</p>}

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
