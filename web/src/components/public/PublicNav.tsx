import { Link } from "@tanstack/react-router";
import { useT } from "@togo-framework/ui";
import { APP_NAME } from "../../lib/api";

// Shared top bar for the unguarded public pages.
export function PublicNav() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3" dir={ar ? "rtl" : "ltr"}>
        <Link to="/" className="text-lg font-extrabold tracking-tight">{APP_NAME}</Link>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-foreground">{tx("Home", "الرئيسية")}</Link>
          <Link to="/entities" className="transition-colors hover:text-foreground">{tx("Directory", "الدليل")}</Link>
          <Link to="/narratives" className="hidden transition-colors hover:text-foreground sm:inline">{tx("Narratives", "الروايات")}</Link>
          <Link to="/alerts" className="hidden transition-colors hover:text-foreground sm:inline">{tx("Alerts", "التنبيهات")}</Link>
          <Link to="/login" className="transition-colors hover:text-foreground">{tx("Admin", "الإدارة")}</Link>
        </div>
      </nav>
    </header>
  );
}
