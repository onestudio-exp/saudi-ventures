-- togo schema fragment (Postgres). Hand-editable; cmd/migrate execs verbatim.
CREATE TABLE IF NOT EXISTS articles (
    id text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    url text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    summary text,
    why_it_matters text,
    source_name text,
    source_type text NOT NULL,
    image_url text,
    published_at timestamptz,
    status text NOT NULL,
    harvester_item_id text,
    linked_venture_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT articles_url_key UNIQUE (url)
);
