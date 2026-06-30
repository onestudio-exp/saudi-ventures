import { useState, type FormEvent } from "react";
import { Button, Input, Label, useT } from "@togo-framework/ui";
import { submitLead, type LeadSource } from "../../lib/public";

// Low-friction public lead capture (email + WhatsApp + optional message). One
// component drives every source: claim (entity profile), newsletter (home), and
// agent_cta (capability sections, passing source_agent).
export function LeadForm({
  sourceType,
  sourcePage,
  sourceAgent,
  withMessage = true,
}: {
  sourceType: LeadSource;
  sourcePage: string;
  sourceAgent?: string;
  withMessage?: boolean;
}) {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  const showMessage = withMessage && sourceType !== "newsletter";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("loading");
    setErr("");
    try {
      await submitLead({
        email,
        whatsapp,
        message: message.trim() || undefined,
        source_type: sourceType,
        source_page: sourcePage,
        source_agent: sourceAgent,
      });
      setState("done");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "error");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
        {tx("Thanks — we'll be in touch shortly.", "شكرًا — سنتواصل معك قريبًا.")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" dir={ar ? "rtl" : "ltr"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lead-email">{tx("Email", "البريد الإلكتروني")}</Label>
          <Input id="lead-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-wa">{tx("WhatsApp", "واتساب")}</Label>
          <Input id="lead-wa" required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+9665XXXXXXXX" />
        </div>
      </div>
      {showMessage && (
        <div className="space-y-1.5">
          <Label htmlFor="lead-msg">{tx("Message (optional)", "رسالة (اختياري)")}</Label>
          <textarea
            id="lead-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}
      {state === "error" && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" disabled={state === "loading"} className="w-full sm:w-auto">
        {state === "loading" ? tx("Sending…", "جارٍ الإرسال…") : tx("Submit", "إرسال")}
      </Button>
    </form>
  );
}
