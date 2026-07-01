import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sun, Moon, Languages } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { listCapabilities } from "../../lib/public";

// Apply a theme choice the same way index.html's no-flash script does.
function applyTheme(theme: "light" | "dark") {
  try {
    localStorage.setItem("togo-theme", theme);
    const d = document.documentElement;
    d.setAttribute("data-theme", theme);
    d.classList.toggle("dark", theme !== "light");
  } catch {
    /* ignore */
  }
}

// Shared top bar for the unguarded public pages — matches the product design:
// gradient logo mark with a sweeping highlight, underline-active nav, a LIVE
// status dot, plus language (AR/EN) and light/dark toggles, and an Admin button.
export function PublicNav() {
  const { language, setLanguage } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const [dark, setDark] = useState<boolean>(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true,
  );
  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    applyTheme(next);
    setDark(!dark);
  };

  // The nav is capability-driven: an item shows only if its governing capability is
  // enabled (items with no gate always show). Until capabilities load, show all.
  const [enabled, setEnabled] = useState<Set<string> | null>(null);
  useEffect(() => {
    listCapabilities().then((c) => setEnabled(new Set(c.filter((x) => x.enabled).map((x) => x.slug)))).catch(() => setEnabled(null));
  }, []);
  const on = (gate?: string[]) => !gate || enabled === null || gate.some((s) => enabled.has(s));

  const items = ([
    { to: "/", label: tx("Ecosystem", "المنظومة") },
    { to: "/entities", label: tx("Directory", "الدليل"), gate: ["startups", "entity"] },
    { to: "/capabilities", label: tx("Capabilities", "القدرات") },
    { to: "/narratives", label: tx("Radar", "الرادار"), gate: ["narrative"] },
    { to: "/newsletter", label: tx("Newsletter", "النشرة") },
  ] as { to: string; label: string; gate?: string[] }[]).filter((it) => on(it.gate));

  return (
    <header className="sticky top-0 z-50 border-b border-border" style={{ background: "hsl(var(--background) / 0.82)", backdropFilter: "blur(14px)" }}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6" dir={ar ? "rtl" : "ltr"}>
        <div className="flex items-center gap-9">
          <Link to="/" className="flex items-center gap-3">
            <span className="relative flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-lg"
              style={{ background: "linear-gradient(135deg,#17493A,hsl(var(--primary)))" }}>
              <span data-sweep className="absolute inset-0" style={{ background: "conic-gradient(from 0deg, rgba(255,255,255,0.5), rgba(255,255,255,0) 25%)" }} />
              <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: "#04120C" }} />
            </span>
            <span className="leading-none">
              <span className="font-display block text-[15px] font-semibold tracking-tight">
                Saudi Ventures<span className="text-primary">·</span>SA
              </span>
              <span className="mono mt-0.5 block text-[9px] tracking-[0.14em] text-muted-foreground/70">SAUDI VENTURE INTEL</span>
            </span>
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            {items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                activeOptions={{ exact: it.to === "/" }}
                className="relative py-2 text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:after:absolute [&.active]:after:inset-x-0 [&.active]:after:-bottom-[1.35rem] [&.active]:after:h-0.5 [&.active]:after:bg-primary [&.active]:after:content-['']"
              >
                {it.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="mono hidden items-center gap-1.5 text-[11px] text-muted-foreground/70 lg:flex">
            <span data-pulse className="h-1.5 w-1.5 rounded-full bg-primary" style={{ boxShadow: "0 0 8px hsl(var(--primary))" }} /> LIVE
          </span>
          <button
            onClick={() => setLanguage(ar ? "en" : "ar")}
            className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border px-2.5 text-xs font-semibold text-foreground/90 transition-colors hover:bg-accent"
            aria-label={tx("Switch language", "تبديل اللغة")}
          >
            <Languages className="h-3.5 w-3.5" /> {ar ? "EN" : "ع"}
          </button>
          <button
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-border text-foreground/90 transition-colors hover:bg-accent"
            aria-label={tx("Toggle theme", "تبديل المظهر")}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </nav>
    </header>
  );
}
