import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, ArrowRight, ArrowLeft } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { listNarratives, type Narrative } from "../lib/public";

export function Narratives() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const [items, setItems] = useState<Narrative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNarratives()
      .then((n) => setItems(n.filter((x) => x.status === "published")))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{tx("Market Narratives", "روايات السوق")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tx("AI-generated digests of the Saudi venture economy, drawn from the news radar and ecosystem data.", "ملخّصات مولّدة بالذكاء الاصطناعي لاقتصاد ريادة الأعمال السعودي، مستمدّة من رادار الأخبار وبيانات المنظومة.")}
        </p>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">{tx("Loading…", "جارٍ التحميل…")}</p>
        ) : items.length > 0 ? (
          <div className="mt-8 space-y-3">
            {items.map((n) => (
              <Link key={n.id} to="/narratives/$id" params={{ id: n.id }}
                className="group block rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span>
                    <div>
                      <div className="font-semibold leading-tight">{n.title}</div>
                      <div className="text-xs capitalize text-muted-foreground">{n.kind}</div>
                    </div>
                  </div>
                  <Arrow className="mt-1 h-4 w-4 text-muted-foreground/50 transition-all group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-8">
            <p className="text-center text-sm text-muted-foreground">
              {tx("The first digests are being generated from the news radar. Get notified when they're live:", "يجري توليد أول الملخّصات من رادار الأخبار. اشترك ليصلك عند توفّرها:")}
            </p>
            <div className="mx-auto mt-5 max-w-xl"><LeadForm sourceType="newsletter" sourcePage="/narratives" /></div>
          </div>
        )}
      </div>
    </main>
  );
}
