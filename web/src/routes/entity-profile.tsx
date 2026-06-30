import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Building2, Globe, MapPin, Calendar, ArrowRight, ArrowLeft } from "lucide-react";
import { Badge, useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { getEntityBySlug, type Entity } from "../lib/public";

export function EntityProfile() {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? "";

  const [entity, setEntity] = useState<Entity | null | undefined>(undefined);

  useEffect(() => {
    getEntityBySlug(slug).then((e) => setEntity(e ?? null)).catch(() => setEntity(null));
  }, [slug]);

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/entities" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Arrow className="h-4 w-4 rotate-180" /> {tx("Back to directory", "العودة إلى الدليل")}
        </Link>

        {entity === undefined && <p className="mt-8 text-sm text-muted-foreground">{tx("Loading…", "جارٍ التحميل…")}</p>}
        {entity === null && <p className="mt-8 text-sm text-muted-foreground">{tx("Entity not found.", "الكيان غير موجود.")}</p>}

        {entity && (
          <>
            <header className="mt-6 flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Building2 className="h-7 w-7" />
              </span>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{entity.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className="capitalize">{entity.kind}</Badge>
                  {entity.sector && <Badge variant="outline">{entity.sector}</Badge>}
                  {entity.claimed && <Badge variant="outline">{tx("Claimed", "موثّق")}</Badge>}
                </div>
              </div>
            </header>

            {entity.description && <p className="mt-6 leading-relaxed text-muted-foreground">{entity.description}</p>}

            <dl className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {entity.headquarters && (
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {entity.headquarters}</div>
              )}
              {entity.founded_year != null && (
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> {tx("Founded", "تأسست")} {entity.founded_year}</div>
              )}
              {entity.website && (
                <a href={entity.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <Globe className="h-4 w-4" /> {tx("Website", "الموقع")}
                </a>
              )}
            </dl>

            {/* Claim your profile — stored Lead (source_type=claim) */}
            <section className="mt-10 rounded-2xl border border-border bg-card/40 p-6">
              <h2 className="text-lg font-semibold">{tx("Is this your organization?", "هل هذه مؤسستك؟")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {tx("Claim your profile to keep it accurate and up to date.", "وثّق ملفك للحفاظ على دقته وتحديثه.")}
              </p>
              <div className="mt-4">
                <LeadForm sourceType="claim" sourcePage={`/entities/${slug}`} />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
