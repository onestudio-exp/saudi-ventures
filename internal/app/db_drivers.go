package app

// Register the pgx database/sql driver ("pgx") on internal/app's import graph so
// cmd/migrate and cmd/seed — which import only internal/app, not internal/plugins —
// can open Postgres. cmd/api already gets pgx via internal/plugins -> db-postgres;
// this one blank import covers the other two binaries. Harmless to cmd/api.
import _ "github.com/jackc/pgx/v5/stdlib"
