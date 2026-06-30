package seeders

import (
	"context"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
)

// SeedAgent is intentionally a no-op: the Agent resource is superseded by the
// pluggable Capability registry (see SeedCapability). Kept so the generated
// seeder registry still compiles; remove when the Agent resource is retired.
func SeedAgent(ctx context.Context, a *app.App) error {
	_ = ctx
	_ = a
	return nil
}
