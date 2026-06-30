import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, Globe, MapPin, Calendar } from "lucide-react";
import { Badge, useT } from "@togo-framework/ui";
import { PublicNav } from "../components/public/PublicNav";
import { LeadForm } from "../components/public/LeadForm";
import { AgentChat } from "../components/public/AgentChat";
import { getEntityBySlug, type Entity } from "../lib/public";

// Logo with initials fallback (same pattern as the directory grid).
function EntityLogo({ entity }: { entity: Entity }) {
  const initials = entity.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-lg font-semibold text-primary ring-1 ring-inset ring-primary/15">
      <span aria-hidden>{initials}</span>
      {entity.logo_url && (
        <img
          src={entity.logo_url}
          alt=""
          className="absolute inset-0 h-full w-full bg-white object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </span>
  );
}

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
              <EntityLogo entity={entity} />
              <div className="min-w-0">
                <h1 className="font-display text-4xl">{entity.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className="capitalize">{entity.kind}</Badge>
                  {entity.sector && <Badge variant="outline">{entity.sector}</Badge>}
                  {entity.claimed && <Badge variant="outline">{tx("Claimed", "موثّق")}</Badge>}
                </div>
              </div>
            </header>

            {/* Meta row */}
            {(entity.headquarters || entity.founded_year || entity.website) && (
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {entity.headquarters && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {entity.headquarters}
                  </span>
                )}
                {entity.founded_year && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> {tx("Founded", "تأسست")} {entity.founded_year}
                  </span>
                )}
                {entity.website && (
                  <a
                    href={entity.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" /> {tx("Website", "الموقع الإلكتروني")}
                  </a>
                )}
              </div>
            )}

            {entity.description && (
              <p className="mt-6 leading-relaxed text-muted-foreground">{entity.description}</p>
            )}

            {/* Full details — every field from the source record (metadata jsonb). */}
            {(() => {
              let meta: Record<string, unknown> = {};
              try {
                meta = entity.metadata ? JSON.parse(entity.metadata) : {};
              } catch {
                meta = {};
              }
              const hide = new Set([
                "id", "name", "logo_url", "is_active", "is_hidden", "sort_order",
                "created_at", "updated_at", "description", "website",
                "country_id", "original_page", "featured", "channel_id", "ingest_metadata",
              ]);
              const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(s);
              const entries = Object.entries(meta).filter(
                ([k, v]) => !hide.has(k) && v !== null && v !== "" && typeof v !== "object" && !isUUID(String(v)),
              );
              if (entries.length === 0) return null;
              const label = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <section className="surface-card mt-8 rounded-2xl p-6">
                  <p className="kicker">{tx("Details", "التفاصيل")}</p>
                  <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                    {entries.map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-3 border-b border-border/50 py-1.5 text-sm">
                        <dt className="text-muted-foreground">{label(k)}</dt>
                        <dd className="text-end font-medium">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })()}

            {/* Ask the AI about this entity — per-entity intelligence on demand (Cortex) */}
            <AgentChat
              entity={slug}
              speaker={tx("the AI analyst", "محلّل الذكاء الاصطناعي")}
              suggestions={[
                tx(`Give me a brief on ${entity.name}.`, `أعطني نبذة عن ${entity.name}.`),
                tx("What do they do?", "ماذا يفعلون؟"),
                tx("How do they fit the Saudi ecosystem?", "كيف يندمجون في المنظومة السعودية؟"),
              ]}
            />

            {/* Claim your profile — stored Lead (source_type=claim) */}
            <section className="surface-card mt-10 rounded-2xl p-6">
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
