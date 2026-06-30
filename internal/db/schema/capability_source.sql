-- togo schema fragment (Postgres). Hand-editable; cmd/migrate execs verbatim.
CREATE TABLE IF NOT EXISTS capability_sources (
    id text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    capability_id text NOT NULL,
    source_id text NOT NULL,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    active boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
