// Command seed_entity_briefs pre-generates a concise Cortex intelligence brief for
// every directory entity and stores it in metadata->>'ai_brief', so entity profiles
// load their brief instantly instead of generating it on view. Resumable: it only
// processes entities that don't already have a stored brief. Requires Cortex env.
//
// Run:  <db + CORTEX env> go run ./cmd/seed_entity_briefs
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
	id, name, kind string
	sector, hq, website, metadata sql.NullString
}

func main() {
	k := togo.New()
	ctx := context.Background()
	a := app.New(ctx, k)
	defer k.Close()
	if a.SQLDB == nil {
		k.Log.Error("seed_entity_briefs: database unavailable")
		return
	}
	client := cortex.New()
	if !client.Enabled() {
		k.Log.Error("seed_entity_briefs: cortex not configured")
		return
	}

	rows, err := a.SQLDB.QueryContext(ctx, `
		SELECT id, name, kind, sector, headquarters, website, metadata::text
		FROM entities
		WHERE coalesce(metadata->>'ai_brief','') = ''
		ORDER BY name`)
	if err != nil {
		k.Log.Error("seed_entity_briefs: query failed", "err", err)
		return
	}
	var todo []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.name, &r.kind, &r.sector, &r.hq, &r.website, &r.metadata); err == nil {
			todo = append(todo, r)
		}
	}
	rows.Close()
	k.Log.Info("seed_entity_briefs: starting", "pending", len(todo))

	const workers = 6
	system := "You are an AI analyst for Saudi Ventures Intelligence. Write a concise 2-3 sentence intelligence brief on the entity, grounded ONLY in the given record — what it does and its role in the Saudi venture ecosystem. No preamble, no markdown headings."

	var done, failed int64
	jobs := make(chan row)
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for r := range jobs {
				user := "Entity: name=" + r.name + ", kind=" + r.kind +
					", sector=" + r.sector.String + ", HQ=" + r.hq.String + ", website=" + r.website.String +
					". Full record JSON: " + truncate(r.metadata.String, 2500) + ". Write the brief."
				brief, _, cerr := client.Complete(ctx, system, user)
				brief = strings.TrimSpace(brief)
				if cerr != nil || brief == "" {
					atomic.AddInt64(&failed, 1)
					continue
				}
				b, _ := json.Marshal(brief) // safely JSON-encode the string value
				if _, uerr := a.SQLDB.ExecContext(ctx,
					`UPDATE entities SET metadata = jsonb_set(coalesce(metadata,'{}'::jsonb), '{ai_brief}', $1::jsonb, true) WHERE id = $2`,
					string(b), r.id); uerr != nil {
					atomic.AddInt64(&failed, 1)
					continue
				}
				n := atomic.AddInt64(&done, 1)
				if n%50 == 0 {
					k.Log.Info("seed_entity_briefs: progress", "done", n, "failed", atomic.LoadInt64(&failed), "of", len(todo))
				}
			}
		}()
	}
	for _, r := range todo {
		jobs <- r
	}
	close(jobs)
	wg.Wait()
	k.Log.Info("seed_entity_briefs: complete", "done", done, "failed", failed)
}

func truncate(s string, n int) string {
	rs := []rune(s)
	if len(rs) <= n {
		return s
	}
	return string(rs[:n])
}
