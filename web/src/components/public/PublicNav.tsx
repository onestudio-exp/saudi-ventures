import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useT } from "@togo-framework/ui";

// Shared top bar for the unguarded public pages — matches the product design:
// gradient logo mark with a sweeping highlight, underline-active nav, a LIVE
// status dot, and an Admin button.
export function PublicNav() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const items: { to: string; label: string }[] = [
    { to: "/", label: tx("Ecosystem", "المنظومة") },
    { to: "/entities", label: tx("Directory", "الدليل") },
    { to: "/narratives", label: tx("Radar", "الرادار") },
    { to: "/alerts", label: tx("Alerts", "التنبيهات") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border" style={{ background: "rgba(10,13,19,0.82)", backdropFilter: "blur(14px)" }}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6" dir={ar ? "rtl" : "ltr"}>
        <div className="flex items-center gap-9">
          <Link to="/" className="flex items-center gap-3">
            <span className="relative flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-lg"
              style={{ background: "linear-gradient(135deg,#17493A,#2FBE8F)" }}>
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
        <div className="flex items-center gap-3.5">
          <span className="mono hidden items-center gap-1.5 text-[11px] text-muted-foreground/70 sm:flex">
            <span data-pulse className="h-1.5 w-1.5 rounded-full bg-primary" style={{ boxShadow: "0 0 8px #2FBE8F" }} /> LIVE
          </span>
          <Link to="/login" className="inline-flex items-center gap-1.5 rounded-[9px] border border-border px-3.5 py-2 text-sm text-foreground/90 transition-colors hover:bg-accent/40">
            <Lock className="h-3.5 w-3.5" /> {tx("Admin", "الإدارة")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
