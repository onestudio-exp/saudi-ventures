import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Radar, Rocket, TrendingUp, Handshake, Layers, Sparkles, ArrowRight, ArrowLeft,
} from "lucide-react";
import { useT } from "@togo-framework/ui";
import { APP_NAME } from "../lib/api";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { listAgents, type Agent } from "../lib/public";

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

  useEffect(() => {
    listAgents()
      .then((as) =>
        setAgents(
          as
            .filter((a) => a.active)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        ),
      )
      .catch(() => {});
  }, []);

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />

      {/* hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
          style={{ background: "radial-gradient(620px 320px at 50% -4%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 70%)" }} />
        <div className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-20">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ background: "linear-gradient(135deg,#1f9d57,#127a44 55%,#0c5e34)" }}>
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{APP_NAME}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {tx(
              "The deepest, most up-to-date map of the Saudi startup ecosystem — entities, modules, and market activity.",
              "أعمق وأحدث خريطة لمنظومة الشركات الناشئة في السعودية — الكيانات والوحدات ونشاط السوق.",
            )}
          </p>
        </div>
      </section>

      {/* agents */}
      <section className="mx-auto max-w-6xl px-6 pb-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{tx("Agents", "الوكلاء")}</h2>
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

      {/* directory — minimal link, no rich data */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/entities" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          {tx("Browse the ecosystem directory", "تصفّح دليل المنظومة")} <Arrow className="h-4 w-4" />
        </Link>
      </section>

      {/* newsletter capture */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <h2 className="text-2xl font-bold tracking-tight">{tx("Stay in the loop", "ابقَ على اطّلاع")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tx("Get Saudi ecosystem updates by email and WhatsApp.", "احصل على تحديثات منظومة ريادة الأعمال السعودية عبر البريد وواتساب.")}
          </p>
          <div className="mt-5">
            <LeadForm sourceType="newsletter" sourcePage="home" />
          </div>
        </div>
      </section>
    </main>
  );
}
