import { useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { PublicFooter } from "../components/public/PublicFooter";
import { LeadForm } from "../components/public/LeadForm";

// The Newsletter / weekly-brief page (design M4).
export function Newsletter() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const tiles = [
    { v: tx("Weekly", "أسبوعيًا"), d: tx("Every Sunday, before the week starts.", "كل أحد، قبل بداية الأسبوع.") },
    { v: "AR + EN", d: tx("Bilingual, written for operators.", "بلغتين، مكتوب للمشغّلين.") },
    { v: tx("5 min", "٥ دقائق"), d: tx("Everything that moved, distilled.", "كل ما تحرّك، مُلخّصًا.") },
  ];

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-[760px] px-6 py-16 sm:py-20">
        <div className="rounded-[22px] border border-primary/25 p-8 sm:p-12" style={{ background: "linear-gradient(150deg,hsl(var(--primary) / 0.07),hsl(var(--background)) 70%)" }}>
          <div className="mb-8 text-center">
            <p className="kicker mb-3.5">{tx("Weekly Brief", "الموجز الأسبوعي")}</p>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{tx("Never miss a Saudi venture move", "لا تفوّت أي تحرّك في ريادة الأعمال السعودية")}</h1>
            <p className="mx-auto mt-2.5 max-w-[48ch] text-[15px] leading-relaxed text-muted-foreground">
              {tx(
                "Funding, policy, launches, and market signals — one synthesized read every week, in your inbox and on WhatsApp.",
                "تمويل، سياسات، إطلاقات، وإشارات سوق — قراءة واحدة مُركّبة كل أسبوع، في بريدك وعلى واتساب.",
              )}
            </p>
          </div>
          <div className="mx-auto max-w-[420px]">
            <LeadForm sourceType="newsletter" sourcePage="/newsletter" submitLabel={tx("Subscribe to the brief", "اشترك في الموجز")} />
            <p className="mono mt-3 text-center text-[10.5px] text-muted-foreground/60">
              {tx("stored securely · unsubscribe anytime", "محفوظ بأمان · إلغاء الاشتراك في أي وقت")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3.5 sm:grid-cols-3">
          {tiles.map((t) => (
            <div key={t.v} className="rounded-xl border border-border p-[18px]" style={{ background: "hsl(var(--card))" }}>
              <div className="font-display text-xl font-semibold text-primary">{t.v}</div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{t.d}</div>
            </div>
          ))}
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}
