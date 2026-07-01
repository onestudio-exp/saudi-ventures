import { useT } from "@togo-framework/ui";

export interface RadarSignal {
  label: string;
  tag: string;
  type: "funding" | "launch" | "policy" | "alert";
}

// RadarPanel is the hero's "market radar" visual from the product design: concentric
// rings with a sweeping conic gradient and a few live signal rows underneath. Signals
// are real (recent alerts/narratives) passed in by the caller.
export function RadarPanel({ signals }: { signals: RadarSignal[] }) {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const blips = [
    { top: 30, left: 58, c: "hsl(var(--primary))", s: 8 },
    { top: 120, left: 150, c: "#5B9BD5", s: 6 },
    { top: 150, left: 70, c: "#D8B15C", s: 7 },
    { top: 70, left: 120, c: "#D86B8A", s: 5 },
  ];

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-border p-6"
      style={{ background: "linear-gradient(180deg,hsl(var(--card)),hsl(var(--background)))" }}>
      <div className="mb-5 flex items-center justify-between">
        <span className="kicker">{tx("Market Radar", "رادار السوق")}</span>
        <span className="mono flex items-center gap-1.5 text-[10px] text-primary">
          <span data-pulse className="h-1.5 w-1.5 rounded-full bg-primary" />
          {tx("SYNCING", "مزامنة")}
        </span>
      </div>

      <div className="relative mx-auto mb-5 flex h-[190px] w-[190px] items-center justify-center">
        <div className="absolute h-[190px] w-[190px] rounded-full border border-border" />
        <div className="absolute h-[128px] w-[128px] rounded-full border border-border" />
        <div className="absolute h-[66px] w-[66px] rounded-full border border-border" />
        <div data-sweep className="absolute h-[190px] w-[190px] rounded-full"
          style={{ background: "conic-gradient(from 0deg, rgba(47,190,143,0.28), rgba(47,190,143,0) 60%)" }} />
        {blips.map((b, i) => (
          <span key={i} className="absolute rounded-full"
            style={{ top: b.top, left: b.left, width: b.s, height: b.s, background: b.c, boxShadow: `0 0 9px ${b.c}` }} />
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {signals.slice(0, 3).map((sig, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-[9px] border border-border px-3 py-2.5"
            style={{ background: "hsl(var(--muted))" }}>
            <span className="truncate text-[12.5px] text-foreground">{sig.label}</span>
            <span className={`mono ntag ntag-${sig.type} shrink-0 rounded-[5px] px-2 py-0.5 text-[10px]`}>{sig.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
