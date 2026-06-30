package seeders

import (
	"context"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
)

// SeedEntity is intentionally a no-op: the canonical entity dataset is the
// ecosystemsa import (cmd/ingest_eco — ~1,718 real entities). Seeding curated rows
// here used to DELETE the whole entities table, which would wipe that import, so it
// is disabled. Populate entities with: `go run ./cmd/ingest_eco`.
func SeedEntity(ctx context.Context, a *app.App) error {
	_ = ctx
	_ = a
	return nil
}
