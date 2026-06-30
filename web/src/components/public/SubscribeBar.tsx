import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useT } from "@togo-framework/ui";

// SubscribeBar is a slim, dismissible sticky CTA that slides up after the visitor
// scrolls past the hero. It scrolls them to the #subscribe section rather than
// duplicating the form, so there is a single source of truth for capture.
export function SubscribeBar() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (dismissed || !show) return null;

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {tx("Get the weekly Saudi venture intelligence brief", "احصل على موجز ذكاء ريادة الأعمال السعودية الأسبوعي")}
          </p>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {tx("Funding rounds, new startups, and market shifts — free.", "جولات تمويل وشركات ناشئة وتحوّلات السوق — مجانًا.")}
          </p>
        </div>
        <a
          href="#subscribe"
          className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {tx("Subscribe free", "اشترك مجانًا")}
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:text-foreground"
          aria-label={tx("Dismiss", "إغلاق")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
