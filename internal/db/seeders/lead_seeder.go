package seeders

import (
	"context"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
)

// SeedLead is intentionally a no-op: leads are real, source-attributed submissions
// from the public site (claim / newsletter / agent_cta), not fake seed data. Kept so
// the generated seeder registry still compiles.
func SeedLead(ctx context.Context, a *app.App) error {
	_ = ctx
	_ = a
	return nil
}
