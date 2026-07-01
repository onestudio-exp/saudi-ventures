package seeders

import (
	"context"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/models"
)

// SeedAgent loads the v0.1 module-Agent personas (idempotent). Each Agent fronts a
// section of the site, introduces itself, and carries a contextual lead CTA whose
// submissions are attributed via source_agent = the agent slug.
func SeedAgent(ctx context.Context, a *app.App) error {
	if _, err := a.SQLDB.ExecContext(ctx, "DELETE FROM agents"); err != nil {
		return err
	}
	agents := []map[string]any{
		{"name": "Raqib", "slug": "news-radar", "module": "news", "tagline": "Your real-time pulse on Saudi venture news.", "description": "I track, gather, and surface the latest news across the Saudi startup ecosystem so you never miss a beat.", "cta_text": "Want the News Radar agent?", "cta_subtext": "Get curated Saudi venture news by email + WhatsApp.", "sort_order": int64(1), "active": true},
		{"name": "Rowad", "slug": "list-of-startups", "module": "startups", "tagline": "The living directory of Saudi startups.", "description": "I maintain a comprehensive, up-to-date map of startups across the Kingdom — who they are, what they do, and where they're based.", "cta_text": "Want the Startups agent?", "cta_subtext": "Get the Saudi startup directory and updates.", "sort_order": int64(2), "active": true},
		{"name": "Mustathmir", "slug": "investment", "module": "investment", "tagline": "Investors, funds, and capital in the Kingdom.", "description": "I map the investors, VCs, and funds active in Saudi Arabia and track where capital is flowing.", "cta_text": "Want the Investment agent?", "cta_subtext": "Get Saudi investor and capital intelligence.", "sort_order": int64(3), "active": true},
		{"name": "Safqa", "slug": "funding-deals", "module": "funding", "tagline": "Rounds, deals, and exits as they happen.", "description": "I follow funding rounds, M&A, and exits across the Saudi ecosystem and surface the deals that matter.", "cta_text": "Want the Funding & Deals agent?", "cta_subtext": "Get Saudi funding-round and deal alerts.", "sort_order": int64(4), "active": true},
		{"name": "Sooq", "slug": "sectors-market", "module": "sectors", "tagline": "Sector activity and market trends.", "description": "I analyze sector activity and market trends across the Saudi market — fintech, e-commerce, logistics, and beyond.", "cta_text": "Want the Sectors & Market agent?", "cta_subtext": "Get Saudi sector and market trend briefings.", "sort_order": int64(5), "active": true},
	}
	for _, ag := range agents {
		if _, err := models.Agents(a).Create(ctx, ag); err != nil {
			return err
		}
	}
	return nil
}
