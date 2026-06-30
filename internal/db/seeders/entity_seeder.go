package seeders

import (
	"context"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/models"
)

// SeedEntity loads a hand-curated starter set of Saudi ecosystem entities.
// Idempotent: it clears the table first, so re-running yields the same set.
// (Replaces the generator's fake factory data.)
func SeedEntity(ctx context.Context, a *app.App) error {
	if _, err := a.SQLDB.ExecContext(ctx, "DELETE FROM entities"); err != nil {
		return err
	}
	entities := []map[string]any{
		// Investors / capital
		{"name": "Saudi Venture Capital (SVC)", "slug": "svc", "kind": "investor", "sector": "Fund of funds", "headquarters": "Riyadh", "founded_year": int64(2018), "website": "https://svc.com.sa", "description": "Government-backed fund-of-funds stimulating the Saudi VC and private-equity ecosystem.", "claimed": false},
		{"name": "Sanabil Investments", "slug": "sanabil", "kind": "investor", "sector": "Investment", "headquarters": "Riyadh", "founded_year": int64(2009), "website": "https://sanabil.com", "description": "PIF-owned investment company; an active LP and direct investor in Saudi and global venture.", "claimed": false},
		{"name": "STV", "slug": "stv", "kind": "investor", "sector": "Venture capital", "headquarters": "Riyadh", "founded_year": int64(2018), "website": "https://stv.vc", "description": "One of MENA's largest tech VC funds, backing growth-stage technology companies.", "claimed": false},
		{"name": "Raed Ventures", "slug": "raed-ventures", "kind": "investor", "sector": "Venture capital", "headquarters": "Riyadh", "founded_year": int64(2015), "website": "https://raed.vc", "description": "Early-stage VC investing across MENA, anchored in Saudi Arabia.", "claimed": false},
		{"name": "Wa'ed Ventures", "slug": "waed-ventures", "kind": "investor", "sector": "Venture capital", "headquarters": "Dhahran", "founded_year": int64(2011), "website": "https://waedventures.com", "description": "Aramco's venture arm investing in technology startups in the Kingdom and beyond.", "claimed": false},
		// Accelerators / programs / enablers
		{"name": "Monsha'at", "slug": "monshaat", "kind": "government", "sector": "SME enablement", "headquarters": "Riyadh", "founded_year": int64(2016), "website": "https://monshaat.gov.sa", "description": "The Small and Medium Enterprises General Authority supporting SMEs and entrepreneurship.", "claimed": false},
		{"name": "Misk Innovation", "slug": "misk-innovation", "kind": "accelerator", "sector": "Innovation", "headquarters": "Riyadh", "founded_year": int64(2017), "website": "https://misk.org.sa", "description": "Misk Foundation's programs accelerating founders and early-stage Saudi startups.", "claimed": false},
		{"name": "The Garage", "slug": "the-garage", "kind": "accelerator", "sector": "Startup hub", "headquarters": "Riyadh", "founded_year": int64(2022), "website": "https://thegarage.sa", "description": "Riyadh's flagship startup district and innovation hub for scaleups and investors.", "claimed": false},
		{"name": "Flat6Labs Saudi", "slug": "flat6labs-saudi", "kind": "accelerator", "sector": "Seed accelerator", "headquarters": "Riyadh", "founded_year": int64(2022), "website": "https://flat6labs.com", "description": "Seed-stage accelerator and early-stage fund operating across the Kingdom.", "claimed": false},
		// Startups
		{"name": "Tamara", "slug": "tamara", "kind": "startup", "sector": "Fintech / BNPL", "headquarters": "Riyadh", "founded_year": int64(2020), "website": "https://tamara.co", "description": "Buy-now-pay-later and shopping platform; one of the Kingdom's first fintech unicorns.", "claimed": false},
		{"name": "Foodics", "slug": "foodics", "kind": "startup", "sector": "Restaurant SaaS", "headquarters": "Riyadh", "founded_year": int64(2014), "website": "https://foodics.com", "description": "Cloud restaurant-management and POS platform serving F&B businesses across MENA.", "claimed": false},
		{"name": "Salla", "slug": "salla", "kind": "startup", "sector": "E-commerce enablement", "headquarters": "Jeddah", "founded_year": int64(2016), "website": "https://salla.com", "description": "E-commerce platform enabling merchants to launch and run online stores.", "claimed": false},
		{"name": "Lean Technologies", "slug": "lean-technologies", "kind": "startup", "sector": "Fintech infrastructure", "headquarters": "Riyadh", "founded_year": int64(2019), "website": "https://leantech.me", "description": "Open-finance API infrastructure connecting apps to bank accounts and payments.", "claimed": false},
		{"name": "Jahez", "slug": "jahez", "kind": "startup", "sector": "Food delivery", "headquarters": "Riyadh", "founded_year": int64(2016), "website": "https://jahez.net", "description": "On-demand food-delivery platform; listed on the Saudi Exchange (Nomu).", "claimed": false},
		{"name": "Nana", "slug": "nana", "kind": "startup", "sector": "E-grocery", "headquarters": "Riyadh", "founded_year": int64(2016), "website": "https://nana.sa", "description": "Online grocery and daily-needs delivery marketplace.", "claimed": false},
	}
	for _, e := range entities {
		if _, err := models.Entities(a).Create(ctx, e); err != nil {
			return err
		}
	}
	return nil
}
