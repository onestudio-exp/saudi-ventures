import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { Markdown } from "../components/public/Markdown";
import { getNarrativeById, type Narrative } from "../lib/public";

export function NarrativeDetail() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id ?? "";
  const [n, setN] = useState<Narrative | null | undefined>(undefined);

  useEffect(() => {
    getNarrativeById(id).then((x) => setN(x ?? null)).catch(() => setN(null));
  }, [id]);

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/narratives" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Arrow className="h-4 w-4 rotate-180" /> {tx("All narratives", "كل الروايات")}
        </Link>
        {n === undefined && <p className="mt-8 text-sm text-muted-foreground">{tx("Loading…", "جارٍ التحميل…")}</p>}
        {n === null && <p className="mt-8 text-sm text-muted-foreground">{tx("Narrative not found.", "الرواية غير موجودة.")}</p>}
        {n && (
          <article className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight">{n.title}</h1>
            <div className="mt-2 text-xs capitalize text-muted-foreground">
              {[n.kind, n.period_start && n.period_end ? `${new Date(n.period_start).toLocaleDateString()} – ${new Date(n.period_end).toLocaleDateString()}` : null].filter(Boolean).join(" · ")}
            </div>
            <div className="mt-6"><Markdown text={n.body_md} /></div>
          </article>
        )}
      </div>
    </main>
  );
}
