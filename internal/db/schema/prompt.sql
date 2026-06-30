-- togo schema fragment (Postgres). Hand-editable; cmd/migrate execs verbatim.
CREATE TABLE IF NOT EXISTS prompts (
    id text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    capability_id text NOT NULL,
    prompt_key text NOT NULL,
    content_en text NOT NULL,
    content_ar text,
    version bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
