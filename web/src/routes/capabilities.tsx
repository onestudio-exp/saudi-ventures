import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Radar, Rocket, TrendingUp, Handshake, Layers, Folder, FileText, Zap, Bell,
  BarChart3, Bot, GitCompare, MessageCircle, Database, User, Calendar, Tag,
  Search, Users, BookOpen, Shield, LayoutGrid, CheckSquare, Sparkles, ArrowRight, ArrowLeft,
} from "lucide-react";
import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { PublicFooter } from "../components/public/PublicFooter";
import { listCapabilities, listEntities, listArticles, listNarratives, listAlerts, type Capability } from "../lib/public";

// nav_icon string -> lucide component.
const ICONS: Record<string, typeof Layers> = {
  radar: Radar, rocket: Rocket, "trending-up": TrendingUp, handshake: Handshake, layers: Layers,
  folder: Folder, "file-text": FileText, zap: Zap, bell: Bell, "bar-chart": BarChart3, bot: Bot,
  "git-compare": GitCompare, "message-circle": MessageCircle, database: Database, user: User,
  calendar: Calendar, tag: Tag, search: Search, users: Users, "book-open": BookOpen, shield: Shield,
  "layout-grid": LayoutGrid, "check-square": CheckSquare,
};

export function Capabilities() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const [caps, setCaps] = useState<Capability[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Only enabled capabilities appear on the public site — the admin toggle governs this.
    listCapabilities().then((c) => setCaps(c.filter((x) => x.enabled).sort((a, b) => a.nav_order - b.nav_order))).catch(() => {});
    // Real record counts per capability domain.
    Promise.all([
      listEntities(2000).then((e) => e.length).catch(() => 0),
      listArticles().then((a) => a.length).catch(() => 0),
      listNarratives().then((n) => n.length).catch(() => 0),
      listAlerts().then((a) => a.length).catch(() => 0),
    ]).then(([entities, articles, narratives, alerts]) => setCounts({ entities, articles, narratives, alerts }));
  }, []);

  const recordsFor = (slug: string): number => {
    if (["news-radar", "breaking-news", "coverage", "search", "trend-detection"].includes(slug)) return counts.articles ?? 0;
    if (["narrative", "briefing", "for-you", "dashboard"].includes(slug)) return counts.narratives ?? 0;
    if (["alert", "notification", "war-room"].includes(slug)) return counts.alerts ?? 0;
    if (["startups", "entity", "personas", "knowledge", "investment", "funding", "sectors", "event"].includes(slug)) return counts.entities ?? 0;
    return 0;
  };

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="kicker mb-2.5">{tx("Capabilities", "القدرات")}</p>
          <h1 className="font-display text-4xl">{tx("The intelligence capability catalog", "كتالوج قدرات الذكاء")}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {tx(
              "Every capability is data-driven and pluggable, Sentra-style — enable, configure, and compose them per venture.",
              "كل قدرة مبنية على البيانات وقابلة للتوصيل على طراز سنترا — فعّلها واضبطها وركّبها لكل مشروع.",
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {caps.map((c) => {
            const Icon = ICONS[c.nav_icon ?? ""] ?? Sparkles;
            const name = tx(c.name_en, c.name_ar ?? c.name_en);
            const desc = tx(c.description_en ?? "", c.description_ar ?? c.description_en ?? "");
            const records = recordsFor(c.slug);
            const target = c.route && c.route.startsWith("/modules/") ? `/modules/${c.slug}` : c.route || `/modules/${c.slug}`;
            return (
              <Link key={c.slug} to={target} className="ecard group flex flex-col rounded-2xl border border-border p-5" style={{ background: "hsl(var(--card))" }}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-display truncate text-[17px] font-semibold">{name}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="mono rounded-md border border-border px-1.5 py-0.5 text-[9.5px] uppercase text-muted-foreground" style={{ background: "hsl(var(--secondary))" }}>{tx("capability", "قدرة")}</span>
                      <span className={`mono rounded-md px-1.5 py-0.5 text-[9.5px] uppercase ${c.enabled ? "border border-primary/25 bg-primary/10 text-primary" : "border border-border text-muted-foreground"}`}>
                        {c.enabled ? tx("enabled", "مفعّل") : tx("off", "متوقف")}
                      </span>
                    </div>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 min-h-[3.6rem] text-[13px] leading-relaxed text-muted-foreground">{desc}</p>
                <div className="mt-4 flex items-end justify-between border-t border-border/50 pt-3">
                  <div>
                    <div className="mono text-[10px] uppercase tracking-wide text-muted-foreground/60">{tx("records", "سجلات")}</div>
                    <div className="font-display tabular text-2xl font-semibold">{records.toLocaleString()}</div>
                  </div>
                  <span className="mono flex items-center gap-1 text-[11px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    {tx("Open", "فتح")} <Arrow className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="mono mt-2 text-[10px] text-muted-foreground/40">{c.slug}</div>
              </Link>
            );
          })}
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}
