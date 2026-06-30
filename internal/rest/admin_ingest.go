// Admin-only ingestion: pull envelopes from the Scout product into local Articles.
// Source-filtering: by free-text `query` (Scout searchEnvelopes), by `source` id, or
// — the default — by a capability's configured queries (the registry config is the
// "plugin" config; default capability "news-radar" carries the Saudi search terms).
// ADMIN-gated; returns 503 when Scout is not configured.
package rest

import (
	"context"
	"encoding/json"
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
		Summary:     "Ingest Scout envelopes into Articles (query / source / capability filtered)",
		Tags:        []string{"Admin", "Intelligence"},
		Middlewares: adminMW,
	}, func(ctx context.Context, in *struct {
		Body struct {
			Limit      int    `json:"limit,omitempty"`
			Query      string `json:"query,omitempty"`
			Source     string `json:"source,omitempty"`
			Capability string `json:"capability,omitempty"`
		}
	}) (*struct {
		Body struct {
			Fetched  int      `json:"fetched"`
			Ingested int      `json:"ingested"`
			Skipped  int      `json:"skipped"`
			Queries  []string `json:"queries,omitempty"`
		}
	}, error) {
		limit := in.Body.Limit
		if limit <= 0 {
			limit = 20
		}

		client := scout.New()
		if !client.Enabled() {
			return nil, huma.Error503ServiceUnavailable("scout not configured")
		}

		var envs []scout.Envelope
		var usedQueries []string

		switch {
		case in.Body.Query != "":
			es, err := client.Search(ctx, in.Body.Query, limit)
			if err != nil {
				return nil, huma.Error500InternalServerError("scout search failed", err)
			}
			envs, usedQueries = es, []string{in.Body.Query}

		case in.Body.Source != "":
			es, err := client.Envelopes(ctx, limit, in.Body.Source)
			if err != nil {
				return nil, huma.Error500InternalServerError("scout fetch failed", err)
			}
			envs = es

		default:
			// Capability-driven: the capability's config.queries are the source-filter
			// (default "news-radar"). Each query runs a Scout keyword search.
			slug := in.Body.Capability
			if slug == "" {
				slug = "news-radar"
			}
			queries, perQuery := capabilityQueries(ctx, a, slug)
			if len(queries) == 0 {
				es, err := client.Envelopes(ctx, limit, "")
				if err != nil {
					return nil, huma.Error500InternalServerError("scout fetch failed", err)
				}
				envs = es
			} else {
				if perQuery <= 0 {
					perQuery = limit
				}
				for _, q := range queries {
					es, err := client.Search(ctx, q, perQuery)
					if err != nil {
						continue // tolerate per-query failures
					}
					envs = append(envs, es...)
					usedQueries = append(usedQueries, q)
				}
			}
		}

		fetched, ingested, skipped := ingestEnvelopes(ctx, a, envs)

		out := &struct {
			Body struct {
				Fetched  int      `json:"fetched"`
				Ingested int      `json:"ingested"`
				Skipped  int      `json:"skipped"`
				Queries  []string `json:"queries,omitempty"`
			}
		}{}
		out.Body.Fetched, out.Body.Ingested, out.Body.Skipped = fetched, ingested, skipped
		out.Body.Queries = usedQueries
		return out, nil
	})
}

// capabilityQueries reads {queries:[...], per_query_limit:N} from a capability's
// config jsonb — the registry config that drives its Scout source-filtering.
func capabilityQueries(ctx context.Context, a *app.App, slug string) ([]string, int) {
	rows, err := models.Capabilities(a).Where("slug", "=", slug).Limit(1).Get(ctx)
	if err != nil || len(rows) == 0 {
		return nil, 0
	}
	var cfg struct {
		Queries       []string `json:"queries"`
		PerQueryLimit int      `json:"per_query_limit"`
	}
	_ = json.Unmarshal([]byte(rows[0].Config), &cfg)
	return cfg.Queries, cfg.PerQueryLimit
}

// ingestEnvelopes upserts envelopes into Articles (dedup by url within the batch and
// against the DB, skipping JSON collection-metadata content). Returns counts.
func ingestEnvelopes(ctx context.Context, a *app.App, envs []scout.Envelope) (fetched, ingested, skipped int) {
	fetched = len(envs)
	seen := map[string]bool{}
	for _, e := range envs {
		if strings.HasPrefix(strings.TrimSpace(e.Content), "{") {
			skipped++
			continue
		}
		u := ""
		if e.URL != nil {
			u = strings.TrimSpace(*e.URL)
		}
		if u == "" {
			u = "scout:envelope:" + e.ID
		}
		if seen[u] {
			skipped++
			continue
		}
		seen[u] = true
		if existing, _ := models.Articles(a).Where("url", "=", u).Limit(1).Get(ctx); len(existing) > 0 {
			skipped++
			continue
		}

		title := firstLine(e.Content, 120)
		if title == "" {
			title = e.SourceID
		}
		fields := map[string]any{
			"url":               u,
			"title":             title,
			"content":           e.Content,
			"source_name":       e.SourceID,
			"source_type":       "scout",
			"status":            "ok",
			"harvester_item_id": e.ID,
		}
		pub := e.CollectedAt
		if e.PublishedAt != nil && *e.PublishedAt != "" {
			pub = *e.PublishedAt
		}
		if t, perr := time.Parse(time.RFC3339, pub); perr == nil {
			fields["published_at"] = t
		}
		if _, cerr := models.Articles(a).Create(ctx, fields); cerr != nil {
			skipped++
			continue
		}
		ingested++
	}
	return fetched, ingested, skipped
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
