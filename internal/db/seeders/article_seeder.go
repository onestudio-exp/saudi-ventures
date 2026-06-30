package seeders

import (
	"context"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
)

// SeedArticle is intentionally a no-op: articles are ingested from the Sentra
// harvester (M4), not fabricated. Kept so the generated seeder registry compiles.
func SeedArticle(ctx context.Context, a *app.App) error {
	_ = ctx
	_ = a
	return nil
}
