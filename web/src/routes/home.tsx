import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Radar, Rocket, TrendingUp, Handshake, Layers, Building2, ArrowRight, ArrowLeft,
} from "lucide-react";
import { useT } from "@togo-framework/ui";
import { APP_NAME } from "../lib/api";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { listCapabilities, listEntities, type Capability, type Entity } from "../lib/public";

// Capability nav_icon -> lucide component (registry-driven personas).
const ICONS: Record<string, typeof Layers> = {
  radar: Radar, rocket: Rocket, "trending-up": TrendingUp, handshake: Handshake, layers: Layers,
};

export function Home() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const [caps, setCaps] = useState<Capability[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    listCapabilities()
      .then((cs) => setCaps(cs.filter((c) => c.enabled).sort((a, b) => a.nav_order - b.nav_order)))
      .catch(() => {});
    listEntities().then(setEntities).catch(() => {});
  }, []);

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />

      {/* hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
          style={{ background: "radial-gradient(620px 320px at 50% -4%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 70%)" }} />
        <div className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-20">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{APP_NAME}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {tx(
              "The deepest, most up-to-date map of the Saudi startup ecosystem — entities, modules, and market activity.",
              "أعمق وأحدث خريطة لمنظومة الشركات الناشئة في السعودية — الكيانات والوحدات ونشاط السوق.",
            )}
          </p>
        </div>
      </section>

      {/* capability personas (registry-driven) */}
      <section className="mx-auto max-w-6xl px-6 pb-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{tx("Modules", "الوحدات")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {caps.map((c) => {
            const Icon = ICONS[c.nav_icon ?? ""] ?? Layers;
            const inner = (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-semibold">{tx(c.name_en, c.name_ar ?? c.name_en)}</span>
                  <Arrow className="ms-auto h-4 w-4 text-muted-foreground/50 transition-all group-hover:text-primary" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{tx(c.description_en ?? "", c.description_ar ?? c.description_en ?? "")}</p>
              </>
            );
            const cls = "group block rounded-2xl border border-border bg-card p-5 text-start transition-colors hover:border-primary/40 hover:bg-accent/40";
            return c.route ? (
              <Link key={c.slug} to={c.route} className={cls}>{inner}</Link>
            ) : (
              <div key={c.slug} className={cls}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* featured entities */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{tx("Featured entities", "كيانات مختارة")}</h2>
          <Link to="/entities" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            {tx("View all", "عرض الكل")} <Arrow className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.slice(0, 6).map((e) => (
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
              {e.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>}
            </Link>
          ))}
        </div>
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
