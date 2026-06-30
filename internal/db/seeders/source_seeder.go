package seeders

import (
	"context"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/models"
)

// SeedSource loads the v0.1 news/data sources for the ingestion layer (idempotent).
// These feed the harvester pull in M4; `config` holds per-source crawl settings.
func SeedSource(ctx context.Context, a *app.App) error {
	if _, err := a.SQLDB.ExecContext(ctx, "DELETE FROM sources"); err != nil {
		return err
	}
	sources := []map[string]any{
		{"slug": "wamda", "name": "Wamda", "kind": "news", "config": "{\"url\":\"https://www.wamda.com\",\"lang\":\"en\"}", "enabled": true},
		{"slug": "magnitt", "name": "MAGNiTT", "kind": "data", "config": "{\"url\":\"https://magnitt.com\",\"lang\":\"en\"}", "enabled": true},
		{"slug": "argaam", "name": "Argaam", "kind": "news", "config": "{\"url\":\"https://www.argaam.com\",\"lang\":\"ar\"}", "enabled": true},
		{"slug": "arab-news-business", "name": "Arab News — Business", "kind": "news", "config": "{\"url\":\"https://www.arabnews.com/economy\",\"lang\":\"en\"}", "enabled": true},
		{"slug": "saudi-gazette-business", "name": "Saudi Gazette — Business", "kind": "news", "config": "{\"url\":\"https://saudigazette.com.sa/business\",\"lang\":\"en\"}", "enabled": true},
		{"slug": "spa", "name": "Saudi Press Agency", "kind": "official", "config": "{\"url\":\"https://www.spa.gov.sa\",\"lang\":\"both\"}", "enabled": true},
		{"slug": "zawya-ksa", "name": "Zawya — Saudi Arabia", "kind": "news", "config": "{\"url\":\"https://www.zawya.com/en/markets/saudi-arabia\",\"lang\":\"en\"}", "enabled": true},
	}
	for _, src := range sources {
		if _, err := models.Sources(a).Create(ctx, src); err != nil {
			return err
		}
	}
	return nil
}
