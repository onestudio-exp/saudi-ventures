// PUBLIC platform-wide RAG endpoint. Unauthenticated visitors ask a free-form
// question about the Saudi venture ecosystem and get an answer grounded in the
// enriched entity knowledge base. Retrieval is Postgres full-text (no embeddings):
// a plainto_tsquery over name/description/sector/positioning/tags, ranked by
// ts_rank, top 8. The retrieved entities (plus a few recent published narratives)
// form the CONTEXT the model must answer from. It returns 503 when Cortex is not
// configured, and is nil-safe for OpenAPI generation (a == nil).
package rest

import (
	"context"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/services/cortex"
)

// askSource is one cited entity in the answer's provenance list.
type askSource struct {
	Name   string `json:"name"`
	Slug   string `json:"slug"`
	Sector string `json:"sector"`
}

// retrievedEntity is a full-text hit used to build the grounding CONTEXT.
type retrievedEntity struct {
	Slug        string
	Name        string
	Kind        string
	Sector      string
	Positioning string
}

// RegisterAskRoutes mounts the PUBLIC platform-wide RAG endpoint (no auth).
func RegisterAskRoutes(api huma.API, a *app.App) {
	huma.Register(api, huma.Operation{
		OperationID: "ask",
		Method:      http.MethodPost,
		Path:        "/api/ask",
		Summary:     "Ask a question about the Saudi venture ecosystem (grounded RAG)",
		Tags:        []string{"Ask"},
	}, func(ctx context.Context, in *struct {
		Body struct {
			Question string `json:"question"`
			Lang     string `json:"lang,omitempty"`
		}
	}) (*struct {
		Body struct {
			Answer  string      `json:"answer"`
			Sources []askSource `json:"sources"`
		}
	}, error) {
		out := &struct {
			Body struct {
				Answer  string      `json:"answer"`
				Sources []askSource `json:"sources"`
			}
		}{}
		// Always a non-nil slice so the OpenAPI shape is stable / never null.
		out.Body.Sources = []askSource{}

		client := cortex.New()
		if !client.Enabled() {
			return nil, huma.Error503ServiceUnavailable("cortex not configured")
		}
		if strings.TrimSpace(in.Body.Question) == "" {
			return nil, huma.Error400BadRequest("question required")
		}
		// Nil-safe path for OpenAPI generation: no DB, no LLM call.
		if a == nil || a.SQLDB == nil {
			return out, nil
		}

		// RETRIEVE: Postgres full-text over the enriched knowledge base, top 8.
		entities := retrieveEntities(ctx, a, in.Body.Question)

		// Build the grounding context + provenance from the retrieved rows.
		var ctxBuilder strings.Builder
		sources := make([]askSource, 0, len(entities))
		for _, e := range entities {
			ctxBuilder.WriteString("- " + e.Name + " (" + e.Kind + ", sector " + e.Sector + "): " + e.Positioning + "\n")
			sources = append(sources, askSource{Name: e.Name, Slug: e.Slug, Sector: e.Sector})
		}

		// Extra context: up to 3 recent published narratives (best-effort).
		if narr := recentNarratives(ctx, a); narr != "" {
			ctxBuilder.WriteString("\nRecent ecosystem narratives:\n" + narr)
		}
		contextStr := ctxBuilder.String()

		langLine := ""
		if strings.HasPrefix(strings.ToLower(in.Body.Lang), "ar") {
			langLine = " Reply ONLY in Arabic."
		}
		system := "You are the Saudi Ventures Intelligence analyst. Answer the user's question using ONLY the CONTEXT below (tracked Saudi ecosystem entities and narratives). Cite entity names inline. If the context doesn't contain the answer, say what IS known and that more detail isn't tracked yet. Be concise and factual — do not invent funding numbers, dates, or facts not in the context." + langLine
		user := "CONTEXT:\n" + contextStr + "\n\nQUESTION: " + truncRunes(in.Body.Question, 1000)

		reply, _, err := client.Chat(ctx, []cortex.Message{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("ask failed", err)
		}

		out.Body.Answer = reply
		out.Body.Sources = sources
		return out, nil
	})
}

// retrieveEntities runs the full-text search (top 8, ts_rank-ordered). If the
// full-text query yields zero rows, it falls back to a broad LIKE match. Both
// stages are best-effort — any error yields an empty result rather than failing
// the request (the model then answers from whatever context it has).
func retrieveEntities(ctx context.Context, a *app.App, question string) []retrievedEntity {
	// OR the query terms (plainto_tsquery ANDs them, which a natural-language
	// question never satisfies) and use the english config for stopword removal +
	// stemming. ts_rank then orders by how many terms an entity matches.
	const ftsQuery = `
WITH q AS (SELECT nullif(replace(plainto_tsquery('english', $1)::text, '&', '|'), '')::tsquery AS tsq)
SELECT slug, name, kind, coalesce(sector,'') AS sector,
       coalesce(metadata->'knowledge'->>'positioning', left(coalesce(description,''),200)) AS positioning,
       coalesce(metadata->'knowledge'->>'tags','') AS tags
FROM entities e, q
WHERE q.tsq IS NOT NULL
  AND q.tsq @@ to_tsvector('english',
        coalesce(name,'')||' '||coalesce(description,'')||' '||coalesce(sector,'')||' '||
        coalesce(metadata->'knowledge'->>'positioning','')||' '||coalesce(metadata->'knowledge'->>'tags',''))
ORDER BY ts_rank(
        to_tsvector('english',
          coalesce(name,'')||' '||coalesce(description,'')||' '||coalesce(sector,'')||' '||
          coalesce(metadata->'knowledge'->>'positioning','')||' '||coalesce(metadata->'knowledge'->>'tags','')),
        q.tsq) DESC
LIMIT 8;`

	entities := scanEntities(ctx, a, ftsQuery, question)
	if len(entities) > 0 {
		return entities
	}

	// Zero full-text hits → broad LIKE fallback (best-effort; ignore errors).
	const likeQuery = `
SELECT slug, name, kind, coalesce(sector,'') AS sector,
       coalesce(metadata->'knowledge'->>'positioning', left(coalesce(description,''),200)) AS positioning,
       ''::text AS tags
FROM entities
WHERE lower(name||' '||coalesce(description,'')) LIKE '%'||lower($1)||'%'
LIMIT 8;`
	return scanEntities(ctx, a, likeQuery, question)
}

// scanEntities runs a retrieval query and scans rows into retrievedEntity. The
// query must select (slug, name, kind, sector, positioning, tags); tags is read
// and discarded (it exists only to keep both queries' shapes aligned). Any error
// returns nil.
func scanEntities(ctx context.Context, a *app.App, query, arg string) []retrievedEntity {
	rows, err := a.SQLDB.QueryContext(ctx, query, arg)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var out []retrievedEntity
	for rows.Next() {
		var e retrievedEntity
		var tags string
		if err := rows.Scan(&e.Slug, &e.Name, &e.Kind, &e.Sector, &e.Positioning, &tags); err != nil {
			return out
		}
		out = append(out, e)
	}
	return out
}

// recentNarratives returns up to 3 recent published narratives as lines
// "- <title>: <snippet>". Best-effort: any error yields an empty string.
func recentNarratives(ctx context.Context, a *app.App) string {
	const q = `SELECT title, left(body_md, 500) FROM narratives WHERE status='published' ORDER BY created_at DESC LIMIT 3;`
	rows, err := a.SQLDB.QueryContext(ctx, q)
	if err != nil {
		return ""
	}
	defer rows.Close()

	var b strings.Builder
	for rows.Next() {
		var title, snippet string
		if err := rows.Scan(&title, &snippet); err != nil {
			break
		}
		b.WriteString("- " + title + ": " + snippet + "\n")
	}
	return b.String()
}
