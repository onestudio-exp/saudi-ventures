import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Radar, Rocket, TrendingUp, Handshake, Layers, Building2, ArrowRight, ArrowLeft } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { getCapabilityBySlug, listEntities, type Capability, type Entity } from "../lib/public";

const ICONS: Record<string, typeof Layers> = {
  radar: Radar, rocket: Rocket, "trending-up": TrendingUp, handshake: Handshake, layers: Layers,
};

// Which entities are relevant to each module (simple v0.1 rules over the seed set).
function relevant(slug: string): (e: Entity) => boolean {
  switch (slug) {
    case "investment":
    case "funding":
      return (e) => e.kind === "investor";
    default:
      return () => true;
  }
}

export function CapabilitySection() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? "";

  const [cap, setCap] = useState<Capability | null | undefined>(undefined);
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    getCapabilityBySlug(slug).then((c) => setCap(c ?? null)).catch(() => setCap(null));
    listEntities().then(setEntities).catch(() => {});
  }, [slug]);

  const Icon = ICONS[cap?.nav_icon ?? ""] ?? Layers;
  const related = entities.filter(relevant(slug));
  const isNews = slug === "news-radar";

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Arrow className="h-4 w-4 rotate-180" /> {tx("Home", "الرئيسية")}
        </Link>

        {cap === undefined && <p className="mt-8 text-sm text-muted-foreground">{tx("Loading…", "جارٍ التحميل…")}</p>}
        {cap === null && <p className="mt-8 text-sm text-muted-foreground">{tx("Module not found.", "الوحدة غير موجودة.")}</p>}

        {cap && (
          <>
            {/* persona header — the Agent introduces itself */}
            <header className="mt-6 flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                <Icon className="h-7 w-7" />
              </span>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{tx(cap.name_en, cap.name_ar ?? cap.name_en)}</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">{tx(cap.description_en ?? "", cap.description_ar ?? cap.description_en ?? "")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tx("I gather, analyze, and maintain this data for the Saudi market.", "أجمع وأحلّل وأحافظ على هذه البيانات للسوق السعودي.")}
                </p>
              </div>
            </header>

            {isNews ? (
              <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                {tx(
                  "Live news radar is being wired to the Sentra harvester. Want early access?",
                  "يجري ربط رادار الأخبار بمحرّك سنترا. هل تريد وصولًا مبكرًا؟",
                )}
              </div>
            ) : (
              <section className="mt-10">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{tx("Related entities", "كيانات ذات صلة")}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {related.slice(0, 9).map((e) => (
                    <Link key={e.slug} to="/entities/$slug" params={{ slug: e.slug }}
                      className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <Building2 className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="font-semibold leading-tight">{e.name}</div>
                          <div className="text-xs capitalize text-muted-foreground">{e.kind}{e.sector ? ` · ${e.sector}` : ""}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* contextual Agent CTA → stored Lead (source_type=agent_cta, source_agent=slug) */}
            <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <h2 className="text-lg font-semibold">
                {tx(`Want a Saudi ${cap.name_en} agent for your team?`, `هل تريد وكيل ${cap.name_ar ?? cap.name_en} سعودي لفريقك؟`)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{tx("Leave your details and we'll reach out.", "اترك بياناتك وسنتواصل معك.")}</p>
              <div className="mt-4">
                <LeadForm sourceType="agent_cta" sourceAgent={cap.slug} sourcePage={`/modules/${slug}`} />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
