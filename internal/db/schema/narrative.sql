-- togo schema fragment (Postgres). Hand-editable; cmd/migrate execs verbatim.
CREATE TABLE IF NOT EXISTS narratives (
    id text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    title text NOT NULL,
    kind text NOT NULL,
    body_md text NOT NULL,
    period_start timestamptz,
    period_end timestamptz,
    window_days bigint,
    model text,
    prompt_tokens bigint,
    completion_tokens bigint,
    status text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
