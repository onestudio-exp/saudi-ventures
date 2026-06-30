// Admin-only intelligence operations powered by the Cortex LLM gateway:
// narrative (digest) generation and alert classification of recent articles.
// Both operations are ADMIN-gated and return 503 when Cortex is not configured,
// so the app boots fine without LLM credentials.
package rest

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/danielgtaylor/huma/v2"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	db "github.com/saudi-ventures/saudi-ventures/internal/db/gen"
	"github.com/saudi-ventures/saudi-ventures/internal/models"
	"github.com/saudi-ventures/saudi-ventures/internal/resources"
	"github.com/saudi-ventures/saudi-ventures/internal/services/cortex"
)

// RegisterAdminIntelRoutes mounts the Cortex-backed admin intelligence endpoints.
func RegisterAdminIntelRoutes(api huma.API, a *app.App) {
	// Build the admin gate once. Nil-safe for OpenAPI generation (a == nil).
	var adminMW huma.Middlewares
	if a != nil {
		adminMW = huma.Middlewares{NewGate(api, a.Kernel).RequireAdmin}
	}

	registerNarrativeGenerate(api, a, adminMW)
	registerAlertScan(api, a, adminMW)
}

// modelName returns the configured model for persistence: prefer the env value,
// falling back to the client's resolved model.
func modelName(c *cortex.Client) string {
	if m := os.Getenv("CORTEX_MODEL"); m != "" {
		return m
	}
	return c.Model()
}

func registerNarrativeGenerate(api huma.API, a *app.App, adminMW huma.Middlewares) {
	huma.Register(api, huma.Operation{
		OperationID:   "admin-generate-narrative",
		Method:        http.MethodPost,
		Path:          "/api/admin/narratives/generate",
		DefaultStatus: http.StatusCreated,
		Summary:       "Generate a Narrative digest via Cortex",
		Tags:          []string{"Admin", "Intelligence"},
		Middlewares:   adminMW,
	}, func(ctx context.Context, in *struct {
		Body struct {
			WindowDays int    `json:"window_days"`
			Kind       string `json:"kind"`
		}
	}) (*struct {
		Body resources.NarrativeResponse
	}, error) {
		windowDays := in.Body.WindowDays
		if windowDays <= 0 {
			windowDays = 7
		}
		kind := in.Body.Kind
		if kind == "" {
			kind = "digest"
		}

		client := cortex.New()
		if !client.Enabled() {
			return nil, huma.Error503ServiceUnavailable("cortex not configured")
		}

		articles, err := models.Articles(a).Order("created_at DESC").Limit(30).Get(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError("load articles failed", err)
		}
		entities, err := models.Entities(a).Order("created_at DESC").Limit(50).Get(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError("load entities failed", err)
		}

		system := "You are a senior analyst of the Saudi venture economy. Write concise, factual markdown digests for an executive audience. No preamble."
		user := buildDigestPrompt(windowDays, articles, entities)

		content, usage, err := client.Complete(ctx, system, user)
		if err != nil {
			return nil, huma.Error500InternalServerError("cortex completion failed", err)
		}

		model := modelName(client)
		row, err := models.Narratives(a).Create(ctx, map[string]any{
			"title":             "Saudi Venture Economy Digest",
			"kind":              kind,
			"body_md":           content,
			"window_days":       int64(windowDays),
			"model":             model,
			"prompt_tokens":     int64(usage.PromptTokens),
			"completion_tokens": int64(usage.CompletionTokens),
			"status":            "published",
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("create narrative failed", err)
		}
		a.Emit(ctx, "narrative.created", row)

		return &struct {
			Body resources.NarrativeResponse
		}{Body: resources.TransformNarrative(*row)}, nil
	})
}

// buildDigestPrompt assembles the user prompt from recent article titles and a
// sample of entity names grouped by kind.
func buildDigestPrompt(windowDays int, articles []db.Article, entities []db.Entity) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Recent articles (most recent first):\n")
	if len(articles) == 0 {
		b.WriteString("(none available)\n")
	}
	for _, art := range articles {
		fmt.Fprintf(&b, "- %s", art.Title)
		if art.SourceName != nil && *art.SourceName != "" {
			fmt.Fprintf(&b, " (%s)", *art.SourceName)
		}
		if art.Summary != nil && *art.Summary != "" {
			fmt.Fprintf(&b, ": %s", *art.Summary)
		}
		b.WriteString("\n")
	}

	// Group entity names by kind for a compact roster.
	byKind := map[string][]string{}
	order := []string{}
	for _, e := range entities {
		if _, ok := byKind[e.Kind]; !ok {
			order = append(order, e.Kind)
		}
		byKind[e.Kind] = append(byKind[e.Kind], e.Name)
	}
	if len(order) > 0 {
		b.WriteString("\nTracked entities by kind:\n")
		for _, k := range order {
			fmt.Fprintf(&b, "- %s: %s\n", k, strings.Join(byKind[k], ", "))
		}
	}

	fmt.Fprintf(&b, "\nWrite a tight markdown digest (~300-500 words) of the current state of the Saudi startup ecosystem for the last %d days. Use short, clearly-titled sections. Be factual and base it on the articles above; do not invent figures.", windowDays)
	return b.String()
}

func registerAlertScan(api huma.API, a *app.App, adminMW huma.Middlewares) {
	huma.Register(api, huma.Operation{
		OperationID: "admin-scan-alerts",
		Method:      http.MethodPost,
		Path:        "/api/admin/alerts/scan",
		Summary:     "Scan recent articles for market signal Alerts via Cortex",
		Tags:        []string{"Admin", "Intelligence"},
		Middlewares: adminMW,
	}, func(ctx context.Context, in *struct {
		Body struct {
			Limit int `json:"limit"`
		}
	}) (*struct {
		Body struct {
			Created int                          `json:"created"`
			Alerts  []resources.AlertResponse    `json:"alerts"`
		}
	}, error) {
		limit := in.Body.Limit
		if limit <= 0 {
			limit = 5
		}

		client := cortex.New()
		if !client.Enabled() {
			return nil, huma.Error503ServiceUnavailable("cortex not configured")
		}

		articles, err := models.Articles(a).Order("created_at DESC").Limit(limit).Get(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError("load articles failed", err)
		}

		system := "You classify Saudi startup/VC news into a market signal. Respond with ONLY a compact JSON object, no markdown fences."

		out := &struct {
			Body struct {
				Created int                       `json:"created"`
				Alerts  []resources.AlertResponse `json:"alerts"`
			}
		}{}
		out.Body.Alerts = []resources.AlertResponse{}

		for _, art := range articles {
			body := ""
			if art.Summary != nil && *art.Summary != "" {
				body = *art.Summary
			} else {
				body = art.Content
				if len(body) > 500 {
					body = body[:500]
				}
			}
			user := fmt.Sprintf(
				"Article title: %s\nSummary: %s\n\nReturn JSON: {\"signal\":\"funding_round|new_entrant|regulation|acquisition|expansion|none\",\"severity\":\"low|med|high\",\"title\":\"<=80 char headline\",\"summary\":\"one sentence\"}",
				art.Title, body,
			)

			content, _, err := client.Complete(ctx, system, user)
			if err != nil {
				continue // tolerate per-article failures
			}

			cls, ok := parseClassification(content)
			if !ok || cls.Signal == "" || cls.Signal == "none" {
				continue
			}

			articleID := art.ID
			row, err := models.Alerts(a).Create(ctx, map[string]any{
				"signal":       cls.Signal,
				"severity":     cls.Severity,
				"title":        cls.Title,
				"summary":      cls.Summary,
				"article_id":   articleID,
				"acknowledged": false,
			})
			if err != nil {
				continue
			}
			a.Emit(ctx, "alert.created", row)
			out.Body.Alerts = append(out.Body.Alerts, resources.TransformAlert(*row))
			out.Body.Created++
		}

		return out, nil
	})
}

// classification is the lenient shape we parse from the model's JSON reply.
type classification struct {
	Signal   string `json:"signal"`
	Severity string `json:"severity"`
	Title    string `json:"title"`
	Summary  string `json:"summary"`
}

// parseClassification leniently extracts a JSON object from an LLM reply: it
// strips ```json fences and takes the substring between the first '{' and last '}'.
func parseClassification(raw string) (classification, bool) {
	s := strings.TrimSpace(raw)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	s = strings.TrimSpace(s)

	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start < 0 || end < 0 || end < start {
		return classification{}, false
	}
	s = s[start : end+1]

	var c classification
	if err := json.Unmarshal([]byte(s), &c); err != nil {
		return classification{}, false
	}
	return c, true
}
