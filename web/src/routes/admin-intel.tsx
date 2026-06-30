import { useState } from "react";
import { Radar, FileText, Bell } from "lucide-react";
import { PageHeader, Card, Button, useT } from "@togo-framework/ui";
import { API } from "../lib/api";

type Outcome = { ok: boolean; text: string } | null;

// POST an admin intelligence endpoint with the session cookie (the RequireAdmin
// gate reads it). These endpoints aren't under /api/auth, so no CSRF token is needed.
async function post(path: string, body: unknown): Promise<any> {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = d.detail || (d.errors && d.errors[0] && d.errors[0].message) || `failed (${r.status})`;
    throw new Error(msg);
  }
  return d;
}

export function AdminIntel() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const [busy, setBusy] = useState("");
  const [out, setOut] = useState<Record<string, Outcome>>({});

  async function run(key: string, fn: () => Promise<string>) {
    setBusy(key);
    setOut((o) => ({ ...o, [key]: null }));
    try {
      const text = await fn();
      setOut((o) => ({ ...o, [key]: { ok: true, text } }));
    } catch (e) {
      setOut((o) => ({ ...o, [key]: { ok: false, text: e instanceof Error ? e.message : "error" } }));
    } finally {
      setBusy("");
    }
  }

  const cards = [
    {
      key: "ingest",
      icon: Radar,
      title: tx("Ingest from Scout", "استيراد من سكاوت"),
      desc: tx("Pull Saudi-filtered envelopes (News Radar capability config) into Articles.", "جلب المظاريف المُرشّحة للسعودية (إعداد رادار الأخبار) إلى المقالات."),
      btn: tx("Run ingest", "تشغيل الاستيراد"),
      go: () => run("ingest", async () => {
        const d = await post("/api/admin/ingest/scout", {});
        return tx(`Fetched ${d.fetched}, ingested ${d.ingested}, skipped ${d.skipped}.`, `جُلب ${d.fetched}، أُضيف ${d.ingested}، تُخطّي ${d.skipped}.`);
      }),
    },
    {
      key: "narrative",
      icon: FileText,
      title: tx("Generate Digest", "توليد ملخّص"),
      desc: tx("Cortex writes a Saudi venture-economy digest from recent Articles + Entities.", "يكتب كورتكس ملخّصاً لاقتصاد ريادة الأعمال السعودي من المقالات والكيانات الحديثة."),
      btn: tx("Generate", "توليد"),
      go: () => run("narrative", async () => {
        const d = await post("/api/admin/narratives/generate", { window_days: 7, kind: "digest" });
        return tx(`Published "${d.title}" (${d.model}).`, `نُشر "${d.title}" (${d.model}).`);
      }),
    },
    {
      key: "alerts",
      icon: Bell,
      title: tx("Scan Alerts", "فحص التنبيهات"),
      desc: tx("Cortex classifies recent Articles into market signals (funding, M&A, regulation).", "يصنّف كورتكس المقالات الحديثة إلى إشارات سوقية (تمويل، استحواذ، تنظيم)."),
      btn: tx("Scan", "فحص"),
      go: () => run("alerts", async () => {
        const d = await post("/api/admin/alerts/scan", { limit: 8 });
        return tx(`${d.created} alert(s) created.`, `أُنشئ ${d.created} تنبيه.`);
      }),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl p-8" dir={ar ? "rtl" : "ltr"}>
      <PageHeader
        title={tx("Intelligence", "الذكاء")}
        description={tx("Run the Sentra-powered pipeline — Scout ingest → Cortex narratives & alerts.", "شغّل خط الإنتاج المدعوم بسنترا — استيراد سكاوت ← ملخّصات وتنبيهات كورتكس.")}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.key} className="flex flex-col p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary"><c.icon className="h-4 w-4" /></span>
              <span className="font-medium">{c.title}</span>
            </div>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{c.desc}</p>
            <Button className="mt-4" disabled={busy === c.key} onClick={c.go}>
              {busy === c.key ? tx("Running…", "جارٍ التشغيل…") : c.btn}
            </Button>
            {out[c.key] && (
              <p className={`mt-3 text-sm ${out[c.key]!.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {out[c.key]!.text}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
