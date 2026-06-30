-- togo schema fragment (Postgres). Hand-editable; cmd/migrate execs verbatim.
CREATE TABLE IF NOT EXISTS sources (
    id text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    slug text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    enabled boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
