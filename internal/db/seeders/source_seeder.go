package seeders

import (
	"context"
	"encoding/json"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/models"
)

// srcCfg is serialized into the Source.config jsonb column. It captures the crawl
// metadata from the curated source registry (saudi_ventures_sources.json) so the
// M4 ingestion layer knows how to fetch each source.
type srcCfg struct {
	URL             string   `json:"url"`
	DataType        []string `json:"data_type,omitempty"`
	RenderMode      string   `json:"render_mode,omitempty"`    // static | js
	DateReliability string   `json:"date_reliability,omitempty"` // high | low | none
	Cadence         string   `json:"cadence,omitempty"`
	ScrapeRisk      string   `json:"scrape_risk,omitempty"` // low | medium | high
	Access          string   `json:"access,omitempty"`      // free | freemium | paid
	Priority        int      `json:"priority,omitempty"`
	Coverage        string   `json:"coverage,omitempty"`
	Notes           string   `json:"notes,omitempty"`
	Unverified      bool     `json:"unverified,omitempty"`
}

type srcSeed struct {
	slug, name, kind string // kind = registry category: news_feed | entity_directory | report | official
	enabled          bool
	cfg              srcCfg
}

// SeedSource loads the curated Saudi/MENA source registry into the sources table
// (idempotent). Verified sources are enabled; unverified ones are stored disabled
// for later confirmation. Mirrors saudi_ventures_sources.json.
func SeedSource(ctx context.Context, a *app.App) error {
	if _, err := a.SQLDB.ExecContext(ctx, "DELETE FROM sources"); err != nil {
		return err
	}
	sources := []srcSeed{
		{"menabytes", "MENAbytes", "news_feed", true, srcCfg{URL: "https://www.menabytes.com", DataType: []string{"funding_deal", "startup_news", "acquisition"}, RenderMode: "static", DateReliability: "high", Cadence: "daily", ScrapeRisk: "medium", Access: "free", Priority: 1, Coverage: "MENA + KSA, deal-by-deal, high frequency", Notes: "Richest per-deal granularity. One post = one deal."}},
		{"wamda-funding", "Wamda — Funding feed", "news_feed", true, srcCfg{URL: "https://www.wamda.com/tag/Funding", DataType: []string{"funding_deal", "startup_news", "market_stat"}, RenderMode: "static", DateReliability: "high", Cadence: "daily", ScrapeRisk: "medium", Access: "free", Priority: 1, Coverage: "MENA + KSA, deal stories + monthly funding roundups", Notes: "Date-based URL pattern /YYYY/MM/slug — easy to enumerate."}},
		{"wamda-monthly-reports", "Wamda — Monthly funding reports", "report", true, srcCfg{URL: "https://www.wamda.com/tag/Funding", DataType: []string{"market_stat"}, RenderMode: "static", DateReliability: "high", Cadence: "monthly", ScrapeRisk: "medium", Access: "free", Priority: 1, Coverage: "Monthly MENA funding totals with KSA split", Notes: "Source of market-size / trend stats (collab with Digital Digest)."}},
		{"magnitt-news", "MAGNiTT — News", "report", true, srcCfg{URL: "https://magnitt.com/news", DataType: []string{"market_stat", "startup_news"}, RenderMode: "js", DateReliability: "high", Cadence: "weekly", ScrapeRisk: "high", Access: "freemium", Priority: 1, Coverage: "Most authoritative MENA/KSA venture data", Notes: "Deep data is paid; STRICT terms on automated access — verify before scraping. JS-rendered."}},
		{"magnitt-research", "MAGNiTT — Research index", "report", true, srcCfg{URL: "https://magnitt.com/research", DataType: []string{"market_stat", "report_metadata"}, RenderMode: "js", DateReliability: "high", Cadence: "monthly", ScrapeRisk: "high", Access: "freemium", Priority: 2, Coverage: "KSA quarterly/annual VC reports (sponsored by SVC)", Notes: "Report discovery + summary figures; full datasets gated."}},
		{"ecosystemsa-vcs", "ecosystemsa.com — VCs module", "entity_directory", true, srcCfg{URL: "https://ecosystemsa.com/modules/vcs", DataType: []string{"entity_profile"}, RenderMode: "js", DateReliability: "none", Cadence: "monthly", ScrapeRisk: "low", Access: "free", Priority: 1, Coverage: "VCs, accelerators, incubators, resources — Saudi/MENA", Notes: "The directory referenced in the build file. Slow-changing reference data."}},
		{"ecosystemsaudi", "ecosystemsaudi.com (official portal)", "official", true, srcCfg{URL: "https://ecosystemsaudi.com", DataType: []string{"entity_profile", "program", "market_stat"}, RenderMode: "js", DateReliability: "low", Cadence: "monthly", ScrapeRisk: "low", Access: "free", Priority: 1, Coverage: "Official Saudi ecosystem portal (operated by StartupBlink)", Notes: "Authoritative on government funds/programs (NTDP, PIF, Jada, Flat6Labs) + ranking data."}},
		{"ntdp", "NTDP", "official", true, srcCfg{URL: "https://ntdp.gov.sa/en", DataType: []string{"program", "entity_profile", "announcement"}, RenderMode: "static", DateReliability: "low", Cadence: "monthly", ScrapeRisk: "low", Access: "free", Priority: 2, Coverage: "National Technology Development Program — Saudi Unicorns, MVPLab", Notes: "Verified government program/org data."}},
		{"mcit-news", "MCIT — News", "official", true, srcCfg{URL: "https://mcit.gov.sa/en/news", DataType: []string{"announcement", "policy"}, RenderMode: "static", DateReliability: "high", Cadence: "weekly", ScrapeRisk: "low", Access: "free", Priority: 2, Coverage: "Ministry of Communications & IT — policy, program launches", Notes: "Dated official announcements. Good for policy/initiative context."}},
		{"incubatorlist-vcs", "IncubatorList — Saudi VCs", "entity_directory", true, srcCfg{URL: "https://incubatorlist.com/top-vcs-in-saudi-arabia", DataType: []string{"entity_profile"}, RenderMode: "static", DateReliability: "none", Cadence: "monthly", ScrapeRisk: "low", Access: "free", Priority: 2, Coverage: "Saudi VCs / corporate VCs / angels", Notes: "Includes ticket-size ranges and HQ."}},
		{"incubatorlist-accelerators", "IncubatorList — Saudi accelerators/incubators", "entity_directory", true, srcCfg{URL: "https://incubatorlist.com/top-startup-accelerators-incubators-and-vcs-in-saudi-arabia", DataType: []string{"entity_profile", "program"}, RenderMode: "static", DateReliability: "low", Cadence: "monthly", ScrapeRisk: "low", Access: "free", Priority: 2, Coverage: "Saudi accelerators/incubators with open cohorts/deadlines", Notes: "Has program deadlines — semi-time-sensitive fields."}},
		{"hussein-attar-accelerators", "Hussein Attar — Saudi accelerators", "entity_directory", true, srcCfg{URL: "https://www.husseinattar.com/en/accelerators-saudi-arabia", DataType: []string{"entity_profile", "program"}, RenderMode: "static", DateReliability: "none", Cadence: "quarterly", ScrapeRisk: "low", Access: "free", Priority: 3, Coverage: "University-backed + regional Saudi accelerators", Notes: "Good city-level + backing-org detail."}},
		{"vision2030-ai-incubators", "Vision2030.ai — Incubators/accelerators", "entity_directory", true, srcCfg{URL: "https://vision2030.ai/encyclopedia/saudi-arabia-incubators-accelerators", DataType: []string{"entity_profile"}, RenderMode: "static", DateReliability: "none", Cadence: "quarterly", ScrapeRisk: "low", Access: "free", Priority: 3, Coverage: "Monsha'at, Flat6Labs, KAUST/TAQADAM, Badir, university programs", Notes: "Narrative profiles — useful for description/blurb enrichment."}},
		{"failory-accelerators", "Failory — Saudi accelerators/incubators", "entity_directory", true, srcCfg{URL: "https://www.failory.com/startups/saudi-arabia-accelerators-incubators", DataType: []string{"entity_profile"}, RenderMode: "static", DateReliability: "low", Cadence: "quarterly", ScrapeRisk: "low", Access: "free", Priority: 3, Coverage: "Curated top Saudi accelerators/incubators", Notes: "Curated shortlist; lighter coverage."}},
		{"rasmal-accelerators", "Rasmal — Saudi accelerators/VCs guide", "entity_directory", true, srcCfg{URL: "https://www.rasmal.com/10-unique-startup-accelerators-and-incubators-in-saudi-arabia", DataType: []string{"entity_profile", "program"}, RenderMode: "static", DateReliability: "low", Cadence: "quarterly", ScrapeRisk: "low", Access: "free", Priority: 3, Coverage: "Saudi accelerators/incubators with program + grant detail", Notes: "Has grant-size and program specifics (The Garage, GAIA)."}},
		{"business-startup-saudi", "Business Start Up Saudi Arabia", "entity_directory", true, srcCfg{URL: "https://www.businessstartupsaudiarabia.com/network/incubators-accelerators", DataType: []string{"entity_profile"}, RenderMode: "static", DateReliability: "none", Cadence: "quarterly", ScrapeRisk: "low", Access: "free", Priority: 3, Coverage: "Saudi incubators/accelerators stakeholder network", Notes: "Supplementary; mostly link directory."}},
		// Unverified — stored disabled; confirm the URL + page structure before enabling.
		{"svc-official", "SVC (Saudi Venture Capital)", "official", false, srcCfg{URL: "https://svc.com.sa", DataType: []string{"fund_data", "announcement"}, Unverified: true, Notes: "Referenced from general knowledge — verify before wiring."}},
		{"monshaat-official", "Monsha'at (SME General Authority)", "official", false, srcCfg{URL: "https://monshaat.gov.sa", DataType: []string{"program", "report"}, Unverified: true, Notes: "Referenced from general knowledge — verify before wiring."}},
		{"misa-official", "MISA (Ministry of Investment)", "official", false, srcCfg{URL: "https://misa.gov.sa", DataType: []string{"announcement", "policy"}, Unverified: true, Notes: "Referenced from general knowledge — verify before wiring."}},
		{"saudi-exchange", "Saudi Exchange / Tadawul (Nomu)", "official", false, srcCfg{URL: "https://saudiexchange.sa", DataType: []string{"ipo", "exit", "listing"}, Unverified: true, Notes: "Referenced from general knowledge — verify before wiring."}},
	}
	for _, s := range sources {
		cfg, err := json.Marshal(s.cfg)
		if err != nil {
			return err
		}
		if _, err := models.Sources(a).Create(ctx, map[string]any{
			"slug":    s.slug,
			"name":    s.name,
			"kind":    s.kind,
			"config":  string(cfg),
			"enabled": s.enabled,
		}); err != nil {
			return err
		}
	}
	return nil
}
