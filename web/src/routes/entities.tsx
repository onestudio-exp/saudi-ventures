import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { Badge, Input, useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { listEntities, type Entity } from "../lib/public";

const MAX_RENDER = 120;

// Logo with initials fallback. The <img> hides itself on error and reveals the
// initials badge sitting behind it.
function EntityLogo({ entity, size = "h-11 w-11" }: { entity: Entity; size?: string }) {
  const initials = entity.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/15`}>
      <span aria-hidden>{initials}</span>
      {entity.logo_url && (
        <img
          src={entity.logo_url}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full bg-white object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </span>
  );
}

export function Entities() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEntities(2000).then(setEntities).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Distinct kinds with counts, sorted by count desc.
  const kinds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entities) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [entities]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entities.filter((e) => {
      if (kind && e.kind !== kind) return false;
      if (!needle) return true;
      return [e.name, e.kind, e.sector, e.headquarters]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [entities, q, kind]);

  const shown = filtered.slice(0, MAX_RENDER);

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{tx("Ecosystem Directory", "دليل المنظومة")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tx(
            "Startups, investors, accelerators, and programs across the Kingdom.",
            "الشركات الناشئة والمستثمرون والمسرّعات والبرامج في المملكة.",
          )}
        </p>

        <div className="relative mt-6 max-w-md">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx("Search by name, sector, city…", "ابحث بالاسم أو القطاع أو المدينة…")}
            className="ps-9"
          />
        </div>

        {/* Filter chips */}
        {!loading && kinds.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setKind(null)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                kind === null
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {tx("All", "الكل")} ({entities.length})
            </button>
            {kinds.map(([k, n]) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k === kind ? null : k)}
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  kind === k
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {k} ({n})
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">{tx("Loading…", "جارٍ التحميل…")}</p>
        ) : (
          <>
            <p className="mt-6 text-xs text-muted-foreground">
              {tx("Showing", "عرض")} {shown.length} {tx("of", "من")} {filtered.length}
              {filtered.length > MAX_RENDER &&
                ` — ${tx("refine search or filters to see more", "حسّن البحث أو المرشّحات لرؤية المزيد")}`}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((e) => (
                <Link
                  key={e.slug}
                  to="/entities/$slug"
                  params={{ slug: e.slug }}
                  className="group surface-card flex flex-col rounded-2xl p-5"
                >
                  <div className="flex items-start gap-3">
                    <EntityLogo entity={e} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold leading-tight">{e.name}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="capitalize">{e.kind}</Badge>
                        {e.sector && (
                          <span className="text-xs text-muted-foreground">{e.sector}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {e.headquarters && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {e.headquarters}
                    </div>
                  )}
                  {e.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>
                  )}
                </Link>
              ))}
            </div>
            {shown.length === 0 && (
              <p className="mt-10 text-sm text-muted-foreground">
                {tx("No matching entities.", "لا توجد كيانات مطابقة.")}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
