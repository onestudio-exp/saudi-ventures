// Admin-only ingestion: pull envelopes from the Scout product into local Articles.
// Source-filtering: by free-text `query` (Scout searchEnvelopes), by `source` id, or
// — the default — by a capability's configured queries (the registry config is the
// "plugin" config; default capability "news-radar" carries the Saudi search terms).
// ADMIN-gated; returns 503 when Scout is not configured. The pipeline logic lives in
// internal/pipeline so the background scheduler shares the exact same code; this
// handler is a thin wrapper over pipeline.IngestScout.
//
// By default the ingest is Saudi-gated (SaudiOnly); pass {"all":true} to ingest the
// raw envelope set without the relevance filter.
package rest

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/pipeline"
	"github.com/saudi-ventures/saudi-ventures/internal/services/scout"
)

// RegisterAdminIngestRoutes mounts the Scout-backed ingestion endpoint.
func RegisterAdminIngestRoutes(api huma.API, a *app.App) {
	var adminMW huma.Middlewares
	if a != nil {
		adminMW = huma.Middlewares{NewGate(api, a.Kernel).RequireAdmin}
	}

	huma.Register(api, huma.Operation{
		OperationID: "admin-ingest-scout",
		Method:      http.MethodPost,
		Path:        "/api/admin/ingest/scout",
		Summary:     "Ingest Scout envelopes into Articles (query / source / capability filtered)",
		Tags:        []string{"Admin", "Intelligence"},
		Middlewares: adminMW,
	}, func(ctx context.Context, in *struct {
		Body struct {
			Limit      int    `json:"limit,omitempty"`
			Query      string `json:"query,omitempty"`
			Source     string `json:"source,omitempty"`
			Capability string `json:"capability,omitempty"`
			All        bool   `json:"all,omitempty"`
		}
	}) (*struct {
		Body struct {
			Fetched  int      `json:"fetched"`
			Ingested int      `json:"ingested"`
			Skipped  int      `json:"skipped"`
			Queries  []string `json:"queries,omitempty"`
		}
	}, error) {
		if !scout.New().Enabled() {
			return nil, huma.Error503ServiceUnavailable("scout not configured")
		}

		// Saudi-gated by default; {"all":true} ingests the raw set without the gate.
		res, err := pipeline.IngestScout(ctx, a, pipeline.IngestOpts{
			Query:      in.Body.Query,
			Source:     in.Body.Source,
			Capability: in.Body.Capability,
			Limit:      in.Body.Limit,
			SaudiOnly:  !in.Body.All,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("scout ingest failed", err)
		}

		out := &struct {
			Body struct {
				Fetched  int      `json:"fetched"`
				Ingested int      `json:"ingested"`
				Skipped  int      `json:"skipped"`
				Queries  []string `json:"queries,omitempty"`
			}
		}{}
		out.Body.Fetched, out.Body.Ingested, out.Body.Skipped = res.Fetched, res.Ingested, res.Skipped
		out.Body.Queries = res.Queries
		return out, nil
	})
}
