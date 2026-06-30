package seeders

import (
	"context"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
)

// SeedPrompt is intentionally a no-op for v0.1: capability prompts are authored
// for real during the narrative milestone (M5). Kept so the registry compiles.
func SeedPrompt(ctx context.Context, a *app.App) error {
	_ = ctx
	_ = a
	return nil
}
