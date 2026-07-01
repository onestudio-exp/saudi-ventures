import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Search, ArrowRight, ArrowLeft } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { ask, type AskSource } from "../../lib/public";
import { Markdown } from "./Markdown";
import { Skeleton } from "./Skeleton";

// AskEcosystem is the platform-wide RAG surface: ask anything about the Saudi
// venture ecosystem and get a grounded, cited answer retrieved from the whole
// knowledge base (1,690 enriched entities + narratives).
export function AskEcosystem() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<AskSource[]>([]);
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const suggestions = [
    tx("Which fintech startups are tracked?", "ما الشركات الناشئة في التقنية المالية المتتبَّعة؟"),
    tx("Who are the most active VCs?", "من هم أنشط المستثمرين الجريئين؟"),
    tx("What's happening in Saudi e-commerce?", "ماذا يحدث في التجارة الإلكترونية السعودية؟"),
  ];

  async function run(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setQ(text);
    setBusy(true);
    setAsked(true);
    setErr(null);
    setAnswer("");
    setSources([]);
    try {
      const r = await ask(text, language);
      setAnswer(r.answer);
      setSources(r.sources);
    } catch (e) {
      setErr(e instanceof Error ? e.message : tx("Something went wrong.", "حدث خطأ ما."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-6 pb-10">
      <div className="surface-card rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">{tx("Ask the ecosystem", "اسأل المنظومة")}</h2>
            <p className="text-xs text-muted-foreground">{tx("AI answers grounded in 1,690 tracked entities.", "إجابات ذكاء مبنية على 1,690 كيانًا متتبَّعًا.")}</p>
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); run(q); }}
          className="relative mt-4"
        >
          <Search className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx("Ask anything about the Saudi venture ecosystem…", "اسأل أي شيء عن منظومة ريادة الأعمال السعودية…")}
            className="w-full rounded-xl border border-border bg-background py-3 pe-24 ps-10 text-sm outline-none focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={busy || !q.trim()}
            className="absolute inset-y-0 end-2 my-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {tx("Ask", "اسأل")}
          </button>
        </form>

        {!asked && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => run(s)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                {s}
              </button>
            ))}
          </div>
        )}

        {asked && (
          <div className="mt-5">
            {err ? (
              <p className="text-sm text-destructive">{err}</p>
            ) : busy ? (
              <Skeleton lines={5} />
            ) : (
              <>
                <Markdown text={answer} />
                {sources.length > 0 && (
                  <div className="mt-4 border-t border-border/50 pt-3">
                    <div className="kicker mb-2">{tx("Sources", "المصادر")}</div>
                    <div className="flex flex-wrap gap-2">
                      {sources.map((s) => (
                        <Link key={s.slug} to="/entities/$slug" params={{ slug: s.slug }}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/10">
                          {s.name} <Arrow className="h-3 w-3" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
