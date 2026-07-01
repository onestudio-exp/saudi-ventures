// Command enrich_entities builds a structured knowledge record for every directory
// entity and stores it in metadata->'knowledge', and backfills the sector column
// when empty. One Cortex call per entity returns a compact JSON object:
//   { sector, tags[], positioning, business_model, target_market, offerings[],
//     strengths[], risks[], opportunities[] }
// Guardrails: classify/analyze ONLY from the record + category; never invent hard
// facts (dates, amounts, headcounts, named partners). Resumable — skips entities
// that already have a knowledge record. Requires Cortex env.
//
// Run:  <db + CORTEX env> go run ./cmd/enrich_entities
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/togo-framework/togo"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/services/cortex"
)

type row struct {
	id, name, kind             string
	sector, hq, website, meta  sql.NullString
}

const taxonomy = "Fintech, E-commerce, Healthtech, Edtech, Logistics, SaaS & AI, Foodtech, Proptech, Cleantech & Energy, Gaming, Media & Content, Govtech, HR & Talent, Traveltech, Mobility, Agritech, Deep Tech, Cybersecurity, Marketplace, Web3, Real Estate, Retail, Manufacturing, Professional Services, Other"

func main() {
	k := togo.New()
	ctx := context.Background()
	a := app.New(ctx, k)
	defer k.Close()
	if a.SQLDB == nil {
		k.Log.Error("enrich_entities: database unavailable")
		return
	}
	client := cortex.New()
	if !client.Enabled() {
		k.Log.Error("enrich_entities: cortex not configured")
		return
	}

	rows, err := a.SQLDB.QueryContext(ctx, `
		SELECT id, name, kind, sector, headquarters, website, metadata::text
		FROM entities
		WHERE coalesce(metadata->'knowledge'->>'positioning','') = ''
		ORDER BY name`)
	if err != nil {
		k.Log.Error("enrich_entities: query failed", "err", err)
		return
	}
	var todo []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.name, &r.kind, &r.sector, &r.hq, &r.website, &r.meta); err == nil {
			todo = append(todo, r)
		}
	}
	rows.Close()
	k.Log.Info("enrich_entities: starting", "pending", len(todo))

	const workers = 6
	system := "You are an analyst enriching a Saudi venture-ecosystem knowledge base. " +
		"Output ONLY a compact JSON object (no markdown, no commentary, no code fences) with EXACTLY these keys: " +
		`{"sector":"single best-fit vertical from [` + taxonomy + `]","tags":["up to 6 short lowercase keywords"],` +
		`"positioning":"one concise sentence on what it is/does","business_model":"short phrase","target_market":"short phrase",` +
		`"offerings":["up to 3 short items"],"strengths":["3 short items"],"risks":["3 short items"],"opportunities":["3 short items"]}. ` +
		"Rules: base everything ONLY on the given record and the entity's category. NEVER invent dates, funding amounts, headcounts, revenue, or named partners. " +
		"If something is unknown, use a general phrase. Each string under 120 chars. Return valid JSON only."

	var done, failed int64
	jobs := make(chan row)
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for r := range jobs {
				user := "Entity: name=" + r.name + ", kind=" + r.kind + ", current_sector=" + r.sector.String +
					", HQ=" + r.hq.String + ", website=" + r.website.String + ". Record JSON: " + truncate(r.meta.String, 2200)
				out, _, cerr := client.Complete(ctx, system, user)
				if cerr != nil {
					atomic.AddInt64(&failed, 1)
					continue
				}
				clean := stripFences(out)
				// Validate it parses and carries a sector, so we never store junk.
				var parsed struct {
					Sector      string `json:"sector"`
					Positioning string `json:"positioning"`
				}
				if json.Unmarshal([]byte(clean), &parsed) != nil || parsed.Sector == "" || parsed.Positioning == "" {
					atomic.AddInt64(&failed, 1)
					continue
				}
				// Store the whole object under metadata.knowledge; backfill sector when empty.
				if _, uerr := a.SQLDB.ExecContext(ctx, `
					UPDATE entities SET
					  metadata = jsonb_set(coalesce(metadata,'{}'::jsonb), '{knowledge}', $1::jsonb, true),
					  sector = CASE WHEN coalesce(sector,'') = '' THEN $2 ELSE sector END
					WHERE id = $3`, clean, parsed.Sector, r.id); uerr != nil {
					atomic.AddInt64(&failed, 1)
					continue
				}
				n := atomic.AddInt64(&done, 1)
				if n%50 == 0 {
					k.Log.Info("enrich_entities: progress", "done", n, "failed", atomic.LoadInt64(&failed), "of", len(todo))
				}
			}
		}()
	}
	for _, r := range todo {
		jobs <- r
	}
	close(jobs)
	wg.Wait()
	k.Log.Info("enrich_entities: complete", "done", done, "failed", failed)
}

func stripFences(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```JSON")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	s = strings.TrimSpace(s)
	// Guard against leading/trailing prose around the object.
	if i := strings.Index(s, "{"); i > 0 {
		s = s[i:]
	}
	if j := strings.LastIndex(s, "}"); j >= 0 && j < len(s)-1 {
		s = s[:j+1]
	}
	return s
}

func truncate(s string, n int) string {
	rs := []rune(s)
	if len(rs) <= n {
		return s
	}
	return string(rs[:n])
}
