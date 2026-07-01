import { Link } from "@tanstack/react-router";
import { useT } from "@togo-framework/ui";
import { displayName, type Entity } from "../../lib/public";

// SectorMap is the ecosystem knowledge layer: it aggregates the enriched entities
// by sector and shows the sector distribution with a proportional bar and the top
// players in each — a real, structured read of the ecosystem.
export function SectorMap({ entities }: { entities: Entity[] }) {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const withSector = entities.filter((e) => (e.sector ?? "").trim());
  if (withSector.length === 0) return null;

  const groups = new Map<string, Entity[]>();
  for (const e of withSector) {
    const s = (e.sector as string).trim();
    (groups.get(s) ?? groups.set(s, []).get(s)!).push(e);
  }
  const sectors = [...groups.entries()]
    .map(([sector, list]) => ({ sector, list, count: list.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const max = sectors[0]?.count ?? 1;

  return (
    <section className="mx-auto max-w-6xl px-6 pb-12">
      <p className="kicker mb-1">{tx("Ecosystem map", "خريطة المنظومة")}</p>
      <p className="mb-5 max-w-xl text-sm text-muted-foreground">
        {tx("The ecosystem by sector — distribution and the top players in each.", "المنظومة حسب القطاع — التوزيع وأبرز اللاعبين في كل قطاع.")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {sectors.map(({ sector, list, count }) => (
          <div key={sector} className="surface-card rounded-2xl p-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-base font-semibold">{sector}</span>
              <span className="font-mono tabular text-sm text-muted-foreground">{count.toLocaleString()}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(6, (count / max) * 100)}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {list.slice(0, 4).map((e) => (
                <Link key={e.slug} to="/entities/$slug" params={{ slug: e.slug }}
                  className="mono truncate rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  style={{ background: "hsl(var(--secondary))" }}>
                  {displayName(e, ar)}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
