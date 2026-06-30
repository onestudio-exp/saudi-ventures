-- togo schema fragment (Postgres). Hand-editable; cmd/migrate execs verbatim.
CREATE TABLE IF NOT EXISTS entities (
    id text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    name text NOT NULL,
    slug text NOT NULL,
    kind text NOT NULL,
    description text,
    logo_url text,
    website text,
    sector text,
    headquarters text,
    founded_year bigint,
    claimed boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
