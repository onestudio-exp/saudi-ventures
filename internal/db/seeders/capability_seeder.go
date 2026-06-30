package seeders

import (
	"context"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/models"
)

// SeedCapability loads the v0.1 module personas as registry rows (idempotent).
// Each is a pluggable capability — enabled/configured from data, Sentra-style —
// that drives a public section and its contextual lead CTA.
func SeedCapability(ctx context.Context, a *app.App) error {
	if _, err := a.SQLDB.ExecContext(ctx, "DELETE FROM capabilities"); err != nil {
		return err
	}
	caps := []map[string]any{
		{"slug": "news-radar", "name_en": "News Radar", "name_ar": "رادار الأخبار", "kind": "capability", "enabled": true, "nav_order": int64(1), "nav_icon": "radar", "route": "/modules/news-radar", "description_en": "Tracks and surfaces the latest Saudi venture-ecosystem news.", "description_ar": "يرصد آخر أخبار منظومة ريادة الأعمال السعودية.", "config": `{"queries":["Saudi","Saudi Arabia","Riyadh","Saudi investment","venture capital","Saudi tech"],"per_query_limit":6}`, "workflow_steps": "[]"},
		{"slug": "startups", "name_en": "List of Startups", "name_ar": "قائمة الشركات الناشئة", "kind": "capability", "enabled": true, "nav_order": int64(2), "nav_icon": "rocket", "route": "/entities", "description_en": "Maintains the directory of Saudi startups and ecosystem entities.", "description_ar": "يحافظ على دليل الشركات الناشئة وكيانات المنظومة في السعودية.", "config": "{}", "workflow_steps": "[]"},
		{"slug": "investment", "name_en": "Investment", "name_ar": "الاستثمار", "kind": "capability", "enabled": true, "nav_order": int64(3), "nav_icon": "trending-up", "route": "/modules/investment", "description_en": "Maps investors, funds, and capital active in the Kingdom.", "description_ar": "يرسم خريطة المستثمرين والصناديق ورؤوس الأموال النشطة في المملكة.", "config": "{}", "workflow_steps": "[]"},
		{"slug": "funding", "name_en": "Funding & Deals", "name_ar": "التمويل والصفقات", "kind": "capability", "enabled": true, "nav_order": int64(4), "nav_icon": "handshake", "route": "/modules/funding", "description_en": "Follows funding rounds, deals, and exits across the ecosystem.", "description_ar": "يتابع جولات التمويل والصفقات وعمليات الخروج في المنظومة.", "config": "{}", "workflow_steps": "[]"},
		{"slug": "sectors", "name_en": "Sectors & Market", "name_ar": "القطاعات والسوق", "kind": "capability", "enabled": true, "nav_order": int64(5), "nav_icon": "layers", "route": "/modules/sectors", "description_en": "Analyzes sector activity and market trends in the Saudi market.", "description_ar": "يحلل نشاط القطاعات واتجاهات السوق في السوق السعودي.", "config": "{}", "workflow_steps": "[]"},
	}
	for _, c := range caps {
		if _, err := models.Capabilities(a).Create(ctx, c); err != nil {
			return err
		}
	}
	return nil
}
