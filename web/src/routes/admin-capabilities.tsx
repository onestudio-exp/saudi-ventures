import { useEffect, useState } from "react";
import {
  Radar, Rocket, TrendingUp, Handshake, Layers, Folder, FileText, Zap, Bell,
  BarChart3, Bot, GitCompare, MessageCircle, Database, User, Calendar, Tag,
  Search, Users, BookOpen, Shield, LayoutGrid, CheckSquare, Sparkles,
} from "lucide-react";
import { useT } from "@togo-framework/ui";
import { adminList, adminUpdate } from "../lib/admin";

const ICONS: Record<string, typeof Layers> = {
  radar: Radar, rocket: Rocket, "trending-up": TrendingUp, handshake: Handshake, layers: Layers,
  folder: Folder, "file-text": FileText, zap: Zap, bell: Bell, "bar-chart": BarChart3, bot: Bot,
  "git-compare": GitCompare, "message-circle": MessageCircle, database: Database, user: User,
  calendar: Calendar, tag: Tag, search: Search, users: Users, "book-open": BookOpen, shield: Shield,
  "layout-grid": LayoutGrid, "check-square": CheckSquare,
};

interface Cap {
  id: string; slug: string; name_en: string; name_ar?: string | null; kind: string;
  enabled: boolean; nav_order: number; nav_icon?: string | null; route?: string | null;
  description_en?: string | null; description_ar?: string | null; config?: string; workflow_steps?: string;
}

// Admin capability control (Sentra-style): each capability is a pluggable unit;
// toggling it enabled/disabled controls whether it appears in the product. Auth-gated.
export function AdminCapabilities() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const [caps, setCaps] = useState<Cap[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminList("capabilities")
      .then((r) => setCaps((r as Cap[]).sort((a, b) => a.nav_order - b.nav_order)))
      .catch(() => setErr(tx("Could not load capabilities.", "تعذّر تحميل القدرات.")));
  }, []);

  async function toggle(c: Cap) {
    setBusy(c.slug);
    setErr(null);
    const next = !c.enabled;
    try {
      await adminUpdate("capabilities", c.id, {
        slug: c.slug, name_en: c.name_en, name_ar: c.name_ar ?? "", kind: c.kind,
        enabled: next, nav_order: c.nav_order, nav_icon: c.nav_icon ?? "", route: c.route ?? "",
        description_en: c.description_en ?? "", description_ar: c.description_ar ?? "",
        config: c.config ?? "{}", workflow_steps: c.workflow_steps ?? "[]",
      });
      setCaps((prev) => prev.map((x) => (x.slug === c.slug ? { ...x, enabled: next } : x)));
    } catch {
      setErr(tx("Save failed. Are you signed in as admin?", "فشل الحفظ. هل أنت مسجّل كمشرف؟"));
    } finally {
      setBusy(null);
    }
  }

  const on = caps.filter((c) => c.enabled).length;

  return (
    <div className="mx-auto max-w-6xl p-8" dir={ar ? "rtl" : "ltr"}>
      <h1 className="font-display text-3xl">{tx("Capabilities", "القدرات")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {tx(
          `Pluggable intelligence capabilities — toggle each on/off to control the product. ${on}/${caps.length} enabled.`,
          `قدرات ذكاء قابلة للتوصيل — فعّل أو أوقف كلًّا منها للتحكّم في المنتج. ${on}/${caps.length} مفعّلة.`,
        )}
      </p>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {caps.map((c) => {
          const Icon = ICONS[c.nav_icon ?? ""] ?? Sparkles;
          return (
            <div key={c.slug} className={`rounded-[14px] border p-5 transition-colors ${c.enabled ? "border-primary/25" : "border-border opacity-70"}`} style={{ background: "hsl(var(--card))" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display truncate text-[16px] font-semibold">{tx(c.name_en, c.name_ar ?? c.name_en)}</div>
                  <div className="mono mt-0.5 text-[10px] text-muted-foreground/60">{c.slug}</div>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.enabled ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-2.5 line-clamp-2 min-h-[2.4rem] text-[12.5px] leading-relaxed text-muted-foreground">
                {tx(c.description_en ?? "", c.description_ar ?? c.description_en ?? "")}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                <span className="mono text-[11px] text-muted-foreground/70">{c.route || `/modules/${c.slug}`}</span>
                <button
                  onClick={() => toggle(c)}
                  disabled={busy === c.slug}
                  aria-pressed={c.enabled}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${c.enabled ? "bg-primary" : "bg-muted"}`}
                  title={c.enabled ? tx("Disable", "تعطيل") : tx("Enable", "تفعيل")}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${c.enabled ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1"}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
