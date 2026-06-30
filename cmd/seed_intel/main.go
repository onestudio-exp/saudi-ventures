// Command seed_intel generates one Cortex intelligence brief per Agent (Narrative
// with kind = agent slug), focused on that agent's domain and grounded in the real
// entity dataset. The public agent pages render the brief whose kind == their slug.
// Idempotent: it clears existing per-agent briefs first. Requires Cortex env.
//
// Run:  <db + CORTEX env> go run ./cmd/seed_intel
package main

import (
	"context"

	"github.com/togo-framework/togo"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/models"
	"github.com/saudi-ventures/saudi-ventures/internal/pipeline"
)

func main() {
	k := togo.New()
	ctx := context.Background()
	a := app.New(ctx, k)
	defer k.Close()
	if a.SQLDB == nil {
		k.Log.Error("seed_intel: database unavailable")
		return
	}

	agents, err := models.Agents(a).Order("sort_order").Get(ctx)
	if err != nil {
		k.Log.Error("seed_intel: load agents failed", "err", err)
		return
	}

	for _, ag := range agents {
		// Focus the brief on this agent's domain.
		topic := ag.Name
		if ag.Tagline != nil && *ag.Tagline != "" {
			topic += " — " + *ag.Tagline
		}
		if ag.Description != nil && *ag.Description != "" {
			topic += ". " + *ag.Description
		}

		// Refresh: drop any existing brief for this agent before regenerating.
		if _, derr := a.SQLDB.ExecContext(ctx, "DELETE FROM narratives WHERE kind = $1", ag.Slug); derr != nil {
			k.Log.Warn("seed_intel: clear failed", "agent", ag.Slug, "err", derr)
		}

		row, gerr := pipeline.GenerateNarrative(ctx, a, 7, ag.Slug, topic)
		if gerr != nil {
			k.Log.Warn("seed_intel: brief failed", "agent", ag.Slug, "err", gerr)
			continue
		}
		k.Log.Info("seed_intel: brief generated", "agent", ag.Slug, "narrative_id", row.ID)
	}
	k.Log.Info("seed_intel: complete", "agents", len(agents))
}
