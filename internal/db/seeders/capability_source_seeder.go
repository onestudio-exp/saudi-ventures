package seeders

import (
	"context"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
)

// SeedCapabilitySource is intentionally a no-op for v0.1: capability↔source links
// are wired meaningfully during the ingestion milestone (M4), and the factory would
// insert non-JSON into the jsonb `config` column. Kept so the registry compiles.
func SeedCapabilitySource(ctx context.Context, a *app.App) error {
	_ = ctx
	_ = a
	return nil
}
