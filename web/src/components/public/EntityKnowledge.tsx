import { TrendingUp, ShieldAlert, Target, Tag } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { useTranslated } from "../../lib/translate";

export interface Knowledge {
  sector?: string;
  tags?: string[];
  positioning?: string;
  business_model?: string;
  target_market?: string;
  offerings?: string[];
  strengths?: string[];
  risks?: string[];
  opportunities?: string[];
}

// EntityKnowledge renders the stored, structured intelligence profile (from
// metadata.knowledge) — instant, no on-demand Cortex. Text fields translate to
// Arabic via Cortex (cached) when the UI is Arabic; tags stay as keywords.
export function EntityKnowledge({ k }: { k: Knowledge }) {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const pos = useTranslated([k.positioning ?? ""], ar)[0];
  const bm = useTranslated([k.business_model ?? "", k.target_market ?? ""], ar);
  const strengths = useTranslated(k.strengths ?? [], ar);
  const risks = useTranslated(k.risks ?? [], ar);
  const opps = useTranslated(k.opportunities ?? [], ar);

  const positioning = ar ? pos || k.positioning : k.positioning;
  const model = ar ? bm[0] || k.business_model : k.business_model;
  const market = ar ? bm[1] || k.target_market : k.target_market;
  const S = ar ? strengths : k.strengths ?? [];
  const R = ar ? risks : k.risks ?? [];
  const O = ar ? opps : k.opportunities ?? [];

  const cols: { icon: typeof Target; label: string; items: string[]; tone: string }[] = [
    { icon: TrendingUp, label: tx("Strengths", "نقاط القوة"), items: S, tone: "text-primary" },
    { icon: ShieldAlert, label: tx("Risks", "المخاطر"), items: R, tone: "text-[#E6C878]" },
    { icon: Target, label: tx("Opportunities", "الفرص"), items: O, tone: "text-[#8FC2EF]" },
  ];

  return (
    <div>
      {positioning && <p className="text-[14.5px] leading-relaxed text-foreground/90">{positioning}</p>}

      {(model || market) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {model && <span className="mono rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground" style={{ background: "hsl(var(--secondary))" }}>{tx("Model", "النموذج")}: {model}</span>}
          {market && <span className="mono rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground" style={{ background: "hsl(var(--secondary))" }}>{tx("Market", "السوق")}: {market}</span>}
        </div>
      )}

      {(k.tags?.length ?? 0) > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Tag className="h-3 w-3 text-muted-foreground/60" />
          {k.tags!.slice(0, 8).map((t) => (
            <span key={t} className="mono rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10.5px] text-primary">{t}</span>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {cols.map((c) => (
          c.items.length > 0 && (
            <div key={c.label}>
              <div className="mb-2 flex items-center gap-1.5">
                <c.icon className={`h-3.5 w-3.5 ${c.tone}`} />
                <span className="kicker">{c.label}</span>
              </div>
              <ul className="space-y-1.5">
                {c.items.slice(0, 3).map((it, i) => (
                  <li key={i} className="flex gap-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                    <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${c.tone.replace("text-", "bg-")}`} />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
