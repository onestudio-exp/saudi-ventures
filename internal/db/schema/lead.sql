-- togo schema fragment (Postgres). Hand-editable; cmd/migrate execs verbatim.
CREATE TABLE IF NOT EXISTS leads (
    id text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    email text NOT NULL,
    whatsapp text NOT NULL,
    message text,
    source_type text NOT NULL,
    source_page text NOT NULL,
    source_agent text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
