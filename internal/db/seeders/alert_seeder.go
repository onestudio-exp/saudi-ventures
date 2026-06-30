package seeders

import (
	"context"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
)

// SeedAlert is intentionally a no-op: alerts are emitted by the intelligence
// pipeline, not fabricated. Kept so the seeder registry compiles.
func SeedAlert(ctx context.Context, a *app.App) error {
	_ = ctx
	_ = a
	return nil
}
