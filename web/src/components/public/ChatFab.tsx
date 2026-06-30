import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { AgentChat } from "./AgentChat";

interface Props {
  agent?: string;
  entity?: string;
  speaker: string;
  suggestions?: string[];
  // Short name shown on the launcher button (persona/agent/entity name).
  label?: string;
}

// ChatFab is a floating action button that opens a Cortex chat drawer in the
// corner of any page. It reuses AgentChat for the actual conversation, so the
// agent persona / entity context flows through unchanged.
export function ChatFab({ agent, entity, speaker, suggestions, label }: Props) {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  const [open, setOpen] = useState(false);

  return (
    <div dir={ar ? "rtl" : "ltr"} className="fixed bottom-5 z-50 end-5">
      {/* drawer */}
      {open && (
        <div className="mb-3 w-[min(92vw,384px)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border/60 bg-primary/5 px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{speaker}</p>
              <p className="truncate text-[11px] text-muted-foreground">{tx("AI · grounded in real data", "ذكاء اصطناعي · مبني على بيانات حقيقية")}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ms-auto rounded-lg p-1.5 text-muted-foreground/70 transition-colors hover:text-foreground"
              aria-label={tx("Close", "إغلاق")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <AgentChat
            agent={agent}
            entity={entity}
            speaker={speaker}
            suggestions={suggestions}
            className="overflow-hidden"
            hideHeader
          />
        </div>
      )}

      {/* launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="ms-auto flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:shadow-[0_12px_34px_-8px_hsl(var(--primary)/0.7)]"
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        <span className="hidden sm:inline">
          {open ? tx("Close", "إغلاق") : `${tx("Ask", "اسأل")} ${label ?? speaker}`}
        </span>
      </button>
    </div>
  );
}
