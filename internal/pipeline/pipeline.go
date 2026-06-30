// Package pipeline holds the reusable Scout->Cortex ingestion + intelligence
// logic, extracted from the admin REST handlers so that both the HTTP endpoints
// and the background scheduler call the exact same code (no behavioral drift).
//
// Three operations are exported:
//   - IngestScout    — pull Scout envelopes into Articles (query/source/capability),
//     with an optional Saudi-relevance gate.
//   - GenerateNarrative — produce a Cortex-written Narrative digest.
//   - ScanAlerts     — classify recent Articles into market-signal Alerts via Cortex.
//
// Cortex-backed operations return ErrCortexDisabled (instead of an HTTP 503) when
// the gateway is not configured, so callers map it to the right transport error.
package pipeline

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	db "github.com/saudi-ventures/saudi-ventures/internal/db/gen"
	"github.com/saudi-ventures/saudi-ventures/internal/models"
	"github.com/saudi-ventures/saudi-ventures/internal/services/cortex"
	"github.com/saudi-ventures/saudi-ventures/internal/services/scout"
)

// ErrCortexDisabled is returned by Cortex-backed operations when the gateway is
// not configured. Transport layers map this to a 503 (the app boots without LLM
// credentials), while the scheduler logs it and keeps running.
var ErrCortexDisabled = errors.New("cortex not configured")

// IngestOpts selects the Scout source-filter for an ingest run. Exactly one of
// Query / Source takes precedence; otherwise the named Capability's configured
// queries drive the run (default capability "news-radar").
type IngestOpts struct {
	Query      string
	Source     string
	Capability string
	Limit      int
	// SaudiOnly, when true, skips any envelope that is not Saudi-relevant per
	// isSaudiRelevant (counted as skipped).
	SaudiOnly bool
}

// IngestResult reports the outcome of an ingest run.
type IngestResult struct {
	Fetched  int
	Ingested int
	Skipped  int
	Queries  []string
}

// IngestScout pulls Scout envelopes (query / source / capability filtered) and
// upserts them into Articles. The selection switch mirrors the original admin
// handler exactly; when opts.SaudiOnly is set, non-Saudi-relevant envelopes are
// additionally skipped. The caller is responsible for checking scout.Enabled()
// (and returning a 503) before calling this.
func IngestScout(ctx context.Context, a *app.App, opts IngestOpts) (IngestResult, error) {
	limit := opts.Limit
	if limit <= 0 {
		limit = 20
	}

	client := scout.New()

	var envs []scout.Envelope
	var usedQueries []string

	switch {
	case opts.Query != "":
		es, err := client.Search(ctx, opts.Query, limit)
		if err != nil {
			return IngestResult{}, fmt.Errorf("scout search failed: %w", err)
		}
		envs, usedQueries = es, []string{opts.Query}

	case opts.Source != "":
		es, err := client.Envelopes(ctx, limit, opts.Source)
		if err != nil {
			return IngestResult{}, fmt.Errorf("scout fetch failed: %w", err)
		}
		envs = es

	default:
		// Capability-driven: the capability's config.queries are the source-filter
		// (default "news-radar"). Each query runs a Scout keyword search.
		slug := opts.Capability
		if slug == "" {
			slug = "news-radar"
		}
		queries, perQuery := capabilityQueries(ctx, a, slug)
		if len(queries) == 0 {
			es, err := client.Envelopes(ctx, limit, "")
			if err != nil {
				return IngestResult{}, fmt.Errorf("scout fetch failed: %w", err)
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

	fetched, ingested, skipped := ingestEnvelopes(ctx, a, envs, opts.SaudiOnly)
	return IngestResult{
		Fetched:  fetched,
		Ingested: ingested,
		Skipped:  skipped,
		Queries:  usedQueries,
	}, nil
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
// against the DB, skipping JSON collection-metadata content). When saudiOnly is
// set, non-Saudi-relevant envelopes are skipped. Returns counts.
func ingestEnvelopes(ctx context.Context, a *app.App, envs []scout.Envelope, saudiOnly bool) (fetched, ingested, skipped int) {
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

		if saudiOnly && !isSaudiRelevant(e.Content+"\n"+u+"\n"+e.SourceID) {
			skipped++
			continue
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

// saudiTerms is the case-insensitive Saudi-relevance vocabulary applied to an
// envelope's combined content+url+sourceId. Note the trailing space on "sar " to
// avoid matching unrelated words.
var saudiTerms = []string{
	"saudi", "ksa", "riyadh", "jeddah", "dammam", "makkah", "mecca", "medina",
	"neom", "pif", "vision 2030", "monsha", "tadawul", "aramco", "kaust", "misa",
	"sar ", "kingdom",
}

// isSaudiRelevant reports whether text mentions any Saudi-relevance term (case-
// insensitive). It is applied to each envelope's content+url+sourceId during a
// Saudi-gated ingest run.
func isSaudiRelevant(text string) bool {
	lower := strings.ToLower(text)
	for _, t := range saudiTerms {
		if strings.Contains(lower, t) {
			return true
		}
	}
	return false
}

// GenerateNarrative produces a Cortex-written Narrative grounded in the real
// directory dataset (entity counts by kind + a rich roster) and recent articles.
// `topic` focuses the brief and becomes the title (default: an overall digest).
// Returns ErrCortexDisabled when Cortex is not configured.
func GenerateNarrative(ctx context.Context, a *app.App, windowDays int, kind, topic string) (*db.Narrative, error) {
	if windowDays <= 0 {
		windowDays = 7
	}
	if kind == "" {
		kind = "digest"
	}

	client := cortex.New()
	if !client.Enabled() {
		return nil, ErrCortexDisabled
	}

	articles, err := models.Articles(a).Order("created_at DESC").Limit(25).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("load articles failed: %w", err)
	}
	entities, err := models.Entities(a).Order("created_at DESC").Limit(140).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("load entities failed: %w", err)
	}
	total, kindCounts := entityStats(ctx, a)

	title := strings.TrimSpace(topic)
	if title == "" {
		title = "Saudi Venture Economy Digest"
	}

	system := "You are a senior analyst of the Saudi venture economy. Write an insight-dense, factual markdown brief for executives — grounded ONLY in the dataset and articles provided. Reference real entities and the sector mix. No preamble, no invented figures."
	user := buildDigestPrompt(windowDays, topic, total, kindCounts, articles, entities)

	content, usage, err := client.Complete(ctx, system, user)
	if err != nil {
		return nil, fmt.Errorf("cortex completion failed: %w", err)
	}

	model := modelName(client)
	row, err := models.Narratives(a).Create(ctx, map[string]any{
		"title":             title,
		"kind":              kind,
		"body_md":           content,
		"window_days":       int64(windowDays),
		"model":             model,
		"prompt_tokens":     int64(usage.PromptTokens),
		"completion_tokens": int64(usage.CompletionTokens),
		"status":            "published",
	})
	if err != nil {
		return nil, fmt.Errorf("create narrative failed: %w", err)
	}
	a.Emit(ctx, "narrative.created", row)
	return row, nil
}

// entityStats returns the total entity count and a compact "676 Startup, 361 VC, …"
// breakdown by kind, used to ground the narrative prompt in the real dataset.
func entityStats(ctx context.Context, a *app.App) (int, string) {
	rows, err := a.SQLDB.QueryContext(ctx, "SELECT kind, count(*) FROM entities GROUP BY kind ORDER BY count(*) DESC")
	if err != nil {
		return 0, ""
	}
	defer rows.Close()
	total := 0
	var parts []string
	for rows.Next() {
		var kind string
		var n int
		if rows.Scan(&kind, &n) == nil {
			total += n
			parts = append(parts, fmt.Sprintf("%d %s", n, kind))
		}
	}
	return total, strings.Join(parts, ", ")
}

// modelName returns the configured model for persistence: prefer the env value,
// falling back to the client's resolved model.
func modelName(c *cortex.Client) string {
	if m := os.Getenv("CORTEX_MODEL"); m != "" {
		return m
	}
	return c.Model()
}

// buildDigestPrompt assembles a dataset-grounded prompt: the full directory scale
// (total + counts by kind), a rich entity roster (name · sector · HQ grouped by
// kind), and recent articles — then the writing instruction (focused by `topic`).
func buildDigestPrompt(windowDays int, topic string, total int, kindCounts string, articles []db.Article, entities []db.Entity) string {
	var b strings.Builder

	if total > 0 {
		fmt.Fprintf(&b, "DATASET — the Saudi Ventures Intelligence directory tracks %d ecosystem entities.\nBreakdown by kind: %s.\n\n", total, kindCounts)
	}

	// Rich roster grouped by kind (name · sector · HQ), capped per kind.
	byKind := map[string][]string{}
	order := []string{}
	for _, e := range entities {
		if _, ok := byKind[e.Kind]; !ok {
			order = append(order, e.Kind)
		}
		if len(byKind[e.Kind]) >= 10 {
			continue
		}
		line := e.Name
		if e.Sector != nil && *e.Sector != "" {
			line += " (" + *e.Sector + ")"
		}
		if e.Headquarters != nil && *e.Headquarters != "" {
			line += " — " + *e.Headquarters
		}
		byKind[e.Kind] = append(byKind[e.Kind], line)
	}
	if len(order) > 0 {
		b.WriteString("SAMPLE ENTITIES (by kind):\n")
		for _, k := range order {
			fmt.Fprintf(&b, "- %s: %s\n", k, strings.Join(byKind[k], "; "))
		}
	}

	if len(articles) > 0 {
		b.WriteString("\nRECENT NEWS:\n")
		for _, art := range articles {
			fmt.Fprintf(&b, "- %s", art.Title)
			if art.Summary != nil && *art.Summary != "" {
				fmt.Fprintf(&b, ": %s", *art.Summary)
			}
			b.WriteString("\n")
		}
	}

	b.WriteString("\n")
	if strings.TrimSpace(topic) != "" {
		fmt.Fprintf(&b, "Write an executive intelligence brief focused on: %q, for the Saudi venture economy. ", topic)
	} else {
		fmt.Fprintf(&b, "Write an executive intelligence brief on the state of the Saudi venture economy (last %d days). ", windowDays)
	}
	b.WriteString("Use markdown with clear sections (Overview, Funding & Investment, Notable Players, Sector Trends, Outlook). ~450-650 words. Ground every claim in the dataset and news above; cite real entity names and the sector mix; do NOT invent specific dollar figures.")
	return b.String()
}

// ScanAlerts classifies the most recent `limit` Articles into market-signal Alerts
// via Cortex. Returns ErrCortexDisabled when Cortex is not configured. Per-article
// failures are tolerated (skipped). Returns the count created and the new rows.
func ScanAlerts(ctx context.Context, a *app.App, limit int) (created int, alerts []db.Alert, err error) {
	if limit <= 0 {
		limit = 5
	}

	client := cortex.New()
	if !client.Enabled() {
		return 0, nil, ErrCortexDisabled
	}

	articles, err := models.Articles(a).Order("created_at DESC").Limit(limit).Get(ctx)
	if err != nil {
		return 0, nil, fmt.Errorf("load articles failed: %w", err)
	}

	system := "You classify Saudi startup/VC news into a market signal. Respond with ONLY a compact JSON object, no markdown fences."

	alerts = []db.Alert{}
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

		content, _, cerr := client.Complete(ctx, system, user)
		if cerr != nil {
			continue // tolerate per-article failures
		}

		cls, ok := parseClassification(content)
		if !ok || cls.Signal == "" || cls.Signal == "none" {
			continue
		}

		articleID := art.ID
		row, rerr := models.Alerts(a).Create(ctx, map[string]any{
			"signal":       cls.Signal,
			"severity":     cls.Severity,
			"title":        cls.Title,
			"summary":      cls.Summary,
			"article_id":   articleID,
			"acknowledged": false,
		})
		if rerr != nil {
			continue
		}
		a.Emit(ctx, "alert.created", row)
		alerts = append(alerts, *row)
		created++
	}

	return created, alerts, nil
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
