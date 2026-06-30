// Admin-only intelligence operations powered by the Cortex LLM gateway:
// narrative (digest) generation and alert classification of recent articles.
// Both operations are ADMIN-gated and return 503 when Cortex is not configured,
// so the app boots fine without LLM credentials. The generation/classification
// logic lives in internal/pipeline so the background scheduler shares the exact
// same code; these handlers are thin wrappers over pipeline.GenerateNarrative
// and pipeline.ScanAlerts (mapping pipeline.ErrCortexDisabled -> HTTP 503).
package rest

import (
	"context"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/pipeline"
	"github.com/saudi-ventures/saudi-ventures/internal/resources"
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
			WindowDays int    `json:"window_days,omitempty"`
			Kind       string `json:"kind,omitempty"`
			Topic      string `json:"topic,omitempty"`
		}
	}) (*struct {
		Body resources.NarrativeResponse
	}, error) {
		row, err := pipeline.GenerateNarrative(ctx, a, in.Body.WindowDays, in.Body.Kind, in.Body.Topic)
		if errors.Is(err, pipeline.ErrCortexDisabled) {
			return nil, huma.Error503ServiceUnavailable("cortex not configured")
		}
		if err != nil {
			return nil, huma.Error500InternalServerError("generate narrative failed", err)
		}

		return &struct {
			Body resources.NarrativeResponse
		}{Body: resources.TransformNarrative(*row)}, nil
	})
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
			Created int                       `json:"created"`
			Alerts  []resources.AlertResponse `json:"alerts"`
		}
	}, error) {
		_, rows, err := pipeline.ScanAlerts(ctx, a, in.Body.Limit)
		if errors.Is(err, pipeline.ErrCortexDisabled) {
			return nil, huma.Error503ServiceUnavailable("cortex not configured")
		}
		if err != nil {
			return nil, huma.Error500InternalServerError("scan alerts failed", err)
		}

		out := &struct {
			Body struct {
				Created int                       `json:"created"`
				Alerts  []resources.AlertResponse `json:"alerts"`
			}
		}{}
		out.Body.Alerts = []resources.AlertResponse{}
		for _, r := range rows {
			out.Body.Alerts = append(out.Body.Alerts, resources.TransformAlert(r))
		}
		out.Body.Created = len(out.Body.Alerts)
		return out, nil
	})
}
