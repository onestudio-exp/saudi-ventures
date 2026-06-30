import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, Search } from "lucide-react";
import { Input, useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { listEntities, type Entity } from "../lib/public";

export function Entities() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEntities().then(setEntities).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entities;
    return entities.filter((e) =>
      [e.name, e.kind, e.sector, e.headquarters].filter(Boolean).join(" ").toLowerCase().includes(needle),
    );
  }, [entities, q]);

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{tx("Ecosystem Directory", "دليل المنظومة")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tx("Startups, investors, accelerators, and programs across the Kingdom.", "الشركات الناشئة والمستثمرون والمسرّعات والبرامج في المملكة.")}
        </p>

        <div className="relative mt-6 max-w-md">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx("Search by name, sector, city…", "ابحث بالاسم أو القطاع أو المدينة…")} className="ps-9" />
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">{tx("Loading…", "جارٍ التحميل…")}</p>
        ) : (
          <>
            <p className="mt-6 text-xs text-muted-foreground">{filtered.length} {tx("entities", "كيان")}</p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((e) => (
                <Link key={e.slug} to="/entities/$slug" params={{ slug: e.slug }}
                  className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="font-semibold leading-tight">{e.name}</div>
                      <div className="text-xs capitalize text-muted-foreground">{e.kind}{e.headquarters ? ` · ${e.headquarters}` : ""}</div>
                    </div>
                  </div>
                  {e.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
