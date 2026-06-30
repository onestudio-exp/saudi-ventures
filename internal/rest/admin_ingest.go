// Admin-only ingestion: pull recent envelopes from the Scout product into local
// Articles (the app owns the data; Scout is the upstream source). ADMIN-gated and
// returns 503 when Scout is not configured, so the app boots fine without it.
package rest

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/models"
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
		Summary:     "Pull recent envelopes from Scout into Articles",
		Tags:        []string{"Admin", "Intelligence"},
		Middlewares: adminMW,
	}, func(ctx context.Context, in *struct {
		Body struct {
			Limit  int    `json:"limit,omitempty"`
			Source string `json:"source,omitempty"`
		}
	}) (*struct {
		Body struct {
			Fetched  int `json:"fetched"`
			Ingested int `json:"ingested"`
			Skipped  int `json:"skipped"`
		}
	}, error) {
		limit := in.Body.Limit
		if limit <= 0 {
			limit = 50
		}

		client := scout.New()
		if !client.Enabled() {
			return nil, huma.Error503ServiceUnavailable("scout not configured")
		}

		envs, err := client.Envelopes(ctx, limit, in.Body.Source)
		if err != nil {
			return nil, huma.Error500InternalServerError("scout fetch failed", err)
		}

		out := &struct {
			Body struct {
				Fetched  int `json:"fetched"`
				Ingested int `json:"ingested"`
				Skipped  int `json:"skipped"`
			}
		}{}
		out.Body.Fetched = len(envs)

		for _, e := range envs {
			u := ""
			if e.URL != nil {
				u = strings.TrimSpace(*e.URL)
			}
			if u == "" {
				u = "scout:envelope:" + e.ID // synthetic, stable dedup key when no URL
			}

			// Dedup by url (the Article unique key).
			if existing, _ := models.Articles(a).Where("url", "=", u).Limit(1).Get(ctx); len(existing) > 0 {
				out.Body.Skipped++
				continue
			}

			title := firstLine(e.Content, 120)
			if title == "" {
				title = e.Source
			}
			fields := map[string]any{
				"url":               u,
				"title":             title,
				"content":           e.Content,
				"source_name":       e.Source,
				"source_type":       "scout",
				"status":            "ok",
				"harvester_item_id": e.ID,
			}
			if t, perr := time.Parse(time.RFC3339, e.CollectedAt); perr == nil {
				fields["published_at"] = t
			}
			if _, cerr := models.Articles(a).Create(ctx, fields); cerr != nil {
				out.Body.Skipped++
				continue
			}
			out.Body.Ingested++
		}
		return out, nil
	})
}

// firstLine returns the first line of s, trimmed and capped at max runes — used to
// derive an Article title from envelope content (envelopes carry no title).
func firstLine(s string, max int) string {
	s = strings.TrimSpace(s)
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		s = s[:i]
	}
	s = strings.TrimSpace(s)
	if len(s) > max {
		s = strings.TrimSpace(s[:max])
	}
	return s
}
