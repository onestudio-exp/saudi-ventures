import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { chat } from "../../lib/public";
import { Markdown } from "./Markdown";
import { Skeleton } from "./Skeleton";

export interface SmartAction {
  label: string;
  prompt: string;
}

// SmartActions renders a row of one-tap AI actions under an intelligence section.
// Each runs a grounded Cortex call (entity/agent context + the visitor's language)
// and reveals the answer inline. Sentra-style "copilot" actions.
export function SmartActions({
  actions,
  entity,
  agent,
}: {
  actions: SmartAction[];
  entity?: string;
  agent?: string;
}) {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const [active, setActive] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function run(a: SmartAction) {
    if (active === a.label) { setActive(null); return; }
    setActive(a.label);
    setResult("");
    setBusy(true);
    try {
      const reply = await chat([{ role: "user", content: a.prompt }], { entity, agent, lang: language });
      setResult(reply);
    } catch {
      setResult(tx("Something went wrong — try again.", "حدث خطأ — حاول مرة أخرى."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-border/50 pt-3.5">
      <div className="mb-2.5 flex items-center gap-1.5">
        <Wand2 className="h-3.5 w-3.5 text-primary" />
        <span className="kicker">{tx("Smart actions", "إجراءات ذكية")}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => run(a)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active === a.label
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3 w-3" /> {a.label}
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-3 rounded-xl border border-border p-4" style={{ background: "hsl(var(--muted) / 0.5)" }}>
          {busy ? <Skeleton lines={3} /> : <Markdown text={result} />}
        </div>
      )}
    </div>
  );
}
