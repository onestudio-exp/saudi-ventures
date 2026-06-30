// Command ingest_eco imports the public Saudi ecosystem directory from
// ecosystemsa.com into our Entities table. The site is a Supabase app whose data
// is served by public RPCs (anon key, public read) named get_<type>s_paginated,
// each returning {"entities":[ {id,name,name_ar,website,description,logo_url,
// industry/sector,region/…} ]}. We sweep every module and upsert (dedup by slug).
//
// Run:  DB_DRIVER=pgx DATABASE_URL=... go run ./cmd/ingest_eco
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/togo-framework/togo"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/models"
)

// ecosystemsa.com Supabase project — anon key is public (embedded in their frontend).
const (
	ecoBase = "https://lyacndabmtldhavdgaqn.supabase.co/rest/v1"
	ecoAnon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5YWNuZGFibXRsZGhhdmRnYXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NTc4MjAsImV4cCI6MjA4NDIzMzgyMH0.R8fE--DrJdh77ccgnWylRf8tiaFi78N7f7Mr7CU8w8Q"
)

// module = an ecosystemsa list RPC + the clean `kind` we store it under.
var modules = []struct{ RPC, Kind string }{
	{"get_saudi_startups_paginated", "Startup"},
	{"get_venture_capitalists_paginated", "VC"},
	{"get_angel_groups_paginated", "Angel Group"},
	{"get_venture_debt_paginated", "Venture Debt"},
	{"get_venture_builders_paginated", "Venture Builder"},
	{"get_crowdfunding_paginated", "Crowdfunding"},
	{"get_loan_funding_paginated", "Loan Funding"},
	{"get_accelerators_paginated", "Accelerator"},
	{"get_incubators_paginated", "Incubator"},
	{"get_lawyers_paginated", "Legal"},
	{"get_payment_gateways_paginated", "Payments"},
	{"get_coworking_spaces_paginated", "Coworking"},
	{"get_courses_paginated", "Course"},
	{"get_podcasts_paginated", "Podcast"},
	{"get_newsletters_paginated", "News Media"},
	{"get_events_paginated", "Event"},
	{"get_groups_paginated", "Community"},
	{"get_supporting_orgs_paginated", "Supporting Org"},
	{"get_resources_paginated", "Resource"},
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

// str returns the first present, non-empty string value among keys.
func str(m map[string]any, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != nil {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				return strings.TrimSpace(s)
			}
		}
	}
	return ""
}

func fetchModule(httpc *http.Client, rpc string) ([]map[string]any, error) {
	body, _ := json.Marshal(map[string]any{"p_limit": 5000, "p_offset": 0})
	req, _ := http.NewRequest(http.MethodPost, ecoBase+"/rpc/"+rpc, bytes.NewReader(body))
	req.Header.Set("apikey", ecoAnon)
	req.Header.Set("Authorization", "Bearer "+ecoAnon)
	req.Header.Set("Content-Type", "application/json")
	resp, err := httpc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("status %d: %.140s", resp.StatusCode, raw)
	}
	// Response is either {"entities":[...]} or a bare array.
	var obj struct {
		Entities []map[string]any `json:"entities"`
	}
	if json.Unmarshal(raw, &obj) == nil && obj.Entities != nil {
		return obj.Entities, nil
	}
	var arr []map[string]any
	if err := json.Unmarshal(raw, &arr); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	return arr, nil
}

func main() {
	k := togo.New()
	ctx := context.Background()
	a := app.New(ctx, k)
	defer k.Close()
	if a.SQLDB == nil {
		k.Log.Error("ingest_eco: database unavailable")
		return
	}

	// Refresh: clear previously-imported rows (our kinds only; curated lowercase
	// kinds like "startup"/"investor" are untouched), so re-runs update the data.
	var quoted []string
	for _, m := range modules {
		quoted = append(quoted, "'"+strings.ReplaceAll(m.Kind, "'", "''")+"'")
	}
	if _, err := a.SQLDB.ExecContext(ctx, "DELETE FROM entities WHERE kind IN ("+strings.Join(quoted, ",")+")"); err != nil {
		k.Log.Warn("ingest_eco: clear failed", "err", err)
	}

	httpc := &http.Client{Timeout: 60 * time.Second}
	seen := map[string]bool{}
	totalIn, totalSkip := 0, 0

	for _, m := range modules {
		rows, err := fetchModule(httpc, m.RPC)
		if err != nil {
			k.Log.Warn("ingest_eco: module skipped", "rpc", m.RPC, "err", err)
			continue
		}
		in, skip := 0, 0
		for _, e := range rows {
			name := str(e, "name", "title")
			if name == "" {
				skip++
				continue
			}
			slug := slugify(name)
			if slug == "" {
				slug = slugify(m.Kind)
			}
			if id := str(e, "id"); id != "" && (seen[slug]) {
				slug = slug + "-" + strings.SplitN(id, "-", 2)[0] // disambiguate collisions
			}
			if seen[slug] {
				skip++
				continue
			}
			// Dedup against the DB (so curated rows + re-runs don't duplicate).
			if existing, _ := models.Entities(a).Where("slug", "=", slug).Limit(1).Get(ctx); len(existing) > 0 {
				seen[slug] = true
				skip++
				continue
			}
			seen[slug] = true

			fields := map[string]any{
				"name":    name,
				"slug":    slug,
				"kind":    m.Kind,
				"claimed": false,
			}
			desc := str(e, "description")
			if desc == "" { // startups often have no description — synthesize from stage + tags
				var parts []string
				for _, p := range []string{str(e, "stage"), str(e, "tags")} {
					if p != "" {
						parts = append(parts, p)
					}
				}
				desc = strings.Join(parts, " · ")
			}
			if desc != "" {
				fields["description"] = desc
			}
			if v := str(e, "industry", "sector", "category", "focus"); v != "" {
				fields["sector"] = v
			}
			if v := str(e, "region", "startup_hq", "location", "city", "headquarters"); v != "" {
				fields["headquarters"] = v
			}
			if v := str(e, "website", "url"); v != "" {
				fields["website"] = v
			}
			if v := str(e, "logo_url"); v != "" {
				fields["logo_url"] = v
			}
			// Store the full source record so the profile shows ALL info, not just
			// the mapped columns.
			if b, mErr := json.Marshal(e); mErr == nil {
				fields["metadata"] = string(b)
			}
			if _, err := models.Entities(a).Create(ctx, fields); err != nil {
				skip++
				continue
			}
			in++
		}
		totalIn += in
		totalSkip += skip
		k.Log.Info("ingest_eco: module done", "kind", m.Kind, "ingested", in, "skipped", skip)
	}
	k.Log.Info("ingest_eco: complete", "ingested", totalIn, "skipped", totalSkip)
}
