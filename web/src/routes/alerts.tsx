import { useEffect, useState } from "react";
import { Bell, AlertTriangle } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { listAlerts, type Alert } from "../lib/public";

const SEVERITY: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20",
  med: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  low: "bg-muted text-muted-foreground ring-border",
};

export function Alerts() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const [items, setItems] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAlerts().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{tx("Signals & Alerts", "الإشارات والتنبيهات")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tx("Funding rounds, new entrants, and regulatory moves detected across the ecosystem.", "جولات التمويل والداخلون الجدد والتحرّكات التنظيمية المرصودة في المنظومة.")}
        </p>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">{tx("Loading…", "جارٍ التحميل…")}</p>
        ) : items.length > 0 ? (
          <div className="mt-8 space-y-3">
            {items.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><AlertTriangle className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${SEVERITY[a.severity] ?? SEVERITY.low}`}>{a.severity}</span>
                      <span className="text-xs capitalize text-muted-foreground">{a.signal.replace(/_/g, " ")}</span>
                    </div>
                    <div className="mt-1 font-semibold leading-tight">{a.title}</div>
                    {a.summary && <p className="mt-1 text-sm text-muted-foreground">{a.summary}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-8">
            <div className="flex justify-center"><Bell className="h-6 w-6 text-muted-foreground" /></div>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {tx("Signal detection is being tuned on the news radar. Get alerted the moment it goes live:", "يجري ضبط كشف الإشارات على رادار الأخبار. اشترك ليصلك التنبيه فور التفعيل:")}
            </p>
            <div className="mx-auto mt-5 max-w-xl"><LeadForm sourceType="newsletter" sourcePage="/alerts" /></div>
          </div>
        )}
      </div>
    </main>
  );
}
