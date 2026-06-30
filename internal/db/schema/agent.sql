-- togo schema fragment (Postgres). Hand-editable; cmd/migrate execs verbatim.
CREATE TABLE IF NOT EXISTS agents (
    id text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    name text NOT NULL,
    slug text NOT NULL,
    module text NOT NULL,
    tagline text,
    description text,
    image_url text,
    cta_text text NOT NULL,
    cta_subtext text,
    sort_order bigint,
    active boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
