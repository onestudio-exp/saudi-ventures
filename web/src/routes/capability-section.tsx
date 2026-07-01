import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  Radar, Rocket, TrendingUp, Handshake, Layers, Folder, FileText, Zap, Bell,
  BarChart3, Bot, GitCompare, MessageCircle, Database, User, Calendar, Tag,
  Search, Users, BookOpen, Shield, LayoutGrid, CheckSquare, Sparkles, ArrowRight, ArrowLeft,
} from "lucide-react";
import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { PublicFooter } from "../components/public/PublicFooter";
import { LeadForm } from "../components/public/LeadForm";
import { Markdown } from "../components/public/Markdown";
import { BadgeAvatar } from "../components/public/BadgeAvatar";
import { getCapabilityBySlug, listEntities, capabilityBrief, displayName, type Capability, type Entity } from "../lib/public";
import { useTranslated } from "../lib/translate";

const ICONS: Record<string, typeof Layers> = {
  radar: Radar, rocket: Rocket, "trending-up": TrendingUp, handshake: Handshake, layers: Layers,
  folder: Folder, "file-text": FileText, zap: Zap, bell: Bell, "bar-chart": BarChart3, bot: Bot,
  "git-compare": GitCompare, "message-circle": MessageCircle, database: Database, user: User,
  calendar: Calendar, tag: Tag, search: Search, users: Users, "book-open": BookOpen, shield: Shield,
  "layout-grid": LayoutGrid, "check-square": CheckSquare,
};

// Entities relevant to each capability, over the real (normalized) kind set.
function relevant(slug: string): (e: Entity) => boolean {
  switch (slug) {
    case "investment": return (e) => ["VC", "Angel Group", "Venture Debt", "Loan Funding", "Crowdfunding"].includes(e.kind);
    case "funding": return (e) => ["VC", "Angel Group", "Venture Debt"].includes(e.kind);
    case "startups": case "entity": return (e) => e.kind === "Startup";
    case "sectors": return (e) => !!e.sector;
    case "coverage": case "news-radar": case "breaking-news": return (e) => e.kind === "News Media";
    case "knowledge": case "personas": return (e) => ["Supporting Org", "Community", "Course", "Podcast"].includes(e.kind);
    default: return () => true;
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
  const [brief, setBrief] = useState<string>("");

  useEffect(() => {
    getCapabilityBySlug(slug).then((c) => setCap(c ?? null)).catch(() => setCap(null));
    listEntities(2000).then(setEntities).catch(() => {});
  }, [slug]);

  const name = cap ? tx(cap.name_en, cap.name_ar ?? cap.name_en) : "";
  const desc = cap ? tx(cap.description_en ?? "", cap.description_ar ?? cap.description_en ?? "") : "";

  // Generate a Cortex intelligence brief for this capability's domain.
  useEffect(() => {
    if (!cap) return;
    setBrief("");
    capabilityBrief(cap.slug, cap.name_en, cap.description_en ?? "", language).then(setBrief).catch(() => setBrief(""));
  }, [cap?.slug, language]);

  const Icon = ICONS[cap?.nav_icon ?? ""] ?? Sparkles;
  const related = entities.filter(relevant(slug));

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-5xl px-6 py-10 pb-20">
        <Link to="/" className="mono inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Arrow className="h-3.5 w-3.5 rotate-180" /> {tx("Home", "الرئيسية")}
        </Link>

        {cap === undefined && <p className="mt-8 text-sm text-muted-foreground">{tx("Loading…", "جارٍ التحميل…")}</p>}
        {cap === null && <p className="mt-8 text-sm text-muted-foreground">{tx("Capability not found.", "القدرة غير موجودة.")}</p>}

        {cap && (
          <>
            {/* header */}
            <header className="mt-6 flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                <Icon className="h-7 w-7" />
              </span>
              <div>
                <div className="kicker mb-1.5">{tx("Capability", "قدرة")}</div>
                <h1 className="font-display text-4xl">{name}</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">{desc}</p>
              </div>
            </header>

            {/* stats strip */}
            <div className="mt-7 grid grid-cols-3 gap-4">
              {[
                { v: related.length, l: tx("Tracked records", "سجلات متتبَّعة") },
                { v: cap.enabled ? tx("Active", "نشطة") : tx("Off", "متوقفة"), l: tx("Status", "الحالة") },
                { v: "AR + EN", l: tx("Coverage", "التغطية") },
              ].map((s, i) => (
                <div key={i} className="surface-card rounded-2xl p-5">
                  <div className="font-display tabular text-2xl font-semibold">{typeof s.v === "number" ? s.v.toLocaleString() : s.v}</div>
                  <div className="kicker mt-1 text-[10px]">{s.l}</div>
                </div>
              ))}
            </div>

            {/* AI intelligence brief */}
            <section className="surface-card mt-6 rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="kicker">{tx("AI Intelligence Brief", "موجز الذكاء الاصطناعي")}</span>
              </div>
              <div className="mt-3">
                {brief ? <Markdown text={brief} /> : (
                  <div className="space-y-2">
                    <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-full animate-pulse rounded bg-muted" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                  </div>
                )}
              </div>
            </section>

            {/* related entities */}
            {related.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display mb-3.5 text-base font-semibold">{tx("Related entities", "كيانات ذات صلة")} · {related.length.toLocaleString()}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {related.slice(0, 9).map((e) => (
                    <Link key={e.slug} to="/entities/$slug" params={{ slug: e.slug }}
                      className="ecard flex items-center gap-3 rounded-2xl border border-border p-4" style={{ background: "hsl(var(--card))" }}>
                      <BadgeAvatar name={e.name} logoUrl={e.logo_url} size={40} radius={11} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold leading-tight">{displayName(e, ar)}</div>
                        <div className="mono truncate text-[10.5px] text-muted-foreground/70">{e.sector || e.kind}</div>
                      </div>
                    </Link>
                  ))}
                </div>
                {related.length > 9 && (
                  <Link to="/entities" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    {tx("Browse the full directory", "تصفّح الدليل كاملًا")} <Arrow className="h-4 w-4" />
                  </Link>
                )}
              </section>
            )}

            {/* CTA → stored Lead */}
            <section className="mt-10 rounded-2xl border border-primary/25 p-6" style={{ background: "hsl(var(--primary) / 0.06)" }}>
              <h2 className="font-display text-lg font-semibold">
                {tx(`Want a Saudi ${cap.name_en} capability for your team?`, `هل تريد قدرة ${cap.name_ar ?? cap.name_en} سعودية لفريقك؟`)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{tx("Leave your details and we'll reach out.", "اترك بياناتك وسنتواصل معك.")}</p>
              <div className="mt-4"><LeadForm sourceType="agent_cta" sourceAgent={cap.slug} sourcePage={`/modules/${slug}`} submitLabel={tx("Request access", "اطلب الوصول")} /></div>
            </section>
          </>
        )}
      </div>
      <PublicFooter />
    </main>
  );
}
