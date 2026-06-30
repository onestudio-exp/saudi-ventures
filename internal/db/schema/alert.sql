-- togo schema fragment (Postgres). Hand-editable; cmd/migrate execs verbatim.
CREATE TABLE IF NOT EXISTS alerts (
    id text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    signal text NOT NULL,
    severity text NOT NULL,
    title text NOT NULL,
    summary text,
    article_id text,
    entity_id text,
    acknowledged boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
