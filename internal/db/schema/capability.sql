-- togo schema fragment (Postgres). Hand-editable; cmd/migrate execs verbatim.
CREATE TABLE IF NOT EXISTS capabilities (
    id text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    slug text NOT NULL,
    name_en text NOT NULL,
    name_ar text,
    kind text NOT NULL,
    enabled boolean NOT NULL,
    nav_order bigint NOT NULL,
    nav_icon text,
    route text,
    description_en text,
    description_ar text,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    workflow_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
