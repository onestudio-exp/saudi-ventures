import { useT } from "@togo-framework/ui";

// Shared footer for the public pages — matches the product design's slim,
// mono two-line footer.
export function PublicFooter() {
  const { language } = useT();
  const ar = language === "ar";
  return (
    <footer className="border-t border-border" dir={ar ? "rtl" : "ltr"}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-9">
        <span className="mono text-[11px] text-muted-foreground/70">
          SAUDI VENTURES·SA — SAUDI VENTURE INTELLIGENCE · BY ONE STUDIO
        </span>
        <span className="mono text-[11px] text-muted-foreground/70">
          v0.1 · Data via Scout · Narratives via Cortex
        </span>
      </div>
    </footer>
  );
}
