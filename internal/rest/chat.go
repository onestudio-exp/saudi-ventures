// PUBLIC Cortex-powered chat endpoint. Unauthenticated visitors can chat with a
// section "agent" (each agent has a persona) or ask about a specific entity. The
// handler grounds the model in Saudi ecosystem data: a dataset-size preamble, the
// agent's persona + latest brief, and (optionally) a single entity's full record.
// It returns 503 when Cortex is not configured, so the app boots without LLM creds.
package rest

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/models"
	"github.com/saudi-ventures/saudi-ventures/internal/services/cortex"
)

// persona is the public face a section Agent presents in chat.
type persona struct {
	Name      string
	Character string
}

// personas maps an Agent slug to its chat persona. Kept in sync with the seeded
// agents (internal/db/seeders/agent_seeder.go).
var personas = map[string]persona{
	"news-radar":       {"Raqib", "a sharp, fast-moving news scout who surfaces what just happened in Saudi venture and why it matters"},
	"list-of-startups": {"Rowad", "an encyclopedic guide to Saudi startups — who they are, what they build, and where they stand"},
	"investment":       {"Mustathmir", "a measured investment analyst tracking Saudi VCs, funds, and where capital flows"},
	"funding-deals":    {"Safqa", "a deal-savvy tracker of Saudi funding rounds, M&A, and exits"},
	"sectors-market":   {"Sooq", "a market trend-spotter reading sector momentum across the Saudi economy"},
}

// RegisterChatRoutes mounts the PUBLIC chat endpoint (no auth middleware).
func RegisterChatRoutes(api huma.API, a *app.App) {
	huma.Register(api, huma.Operation{
		OperationID: "chat",
		Method:      http.MethodPost,
		Path:        "/api/chat",
		Summary:     "Chat with a Saudi Ventures Intelligence AI agent",
		Tags:        []string{"Chat"},
	}, func(ctx context.Context, in *struct {
		Body struct {
			Agent    string `json:"agent,omitempty"`
			Entity   string `json:"entity,omitempty"`
			Messages []struct {
				Role    string `json:"role"`
				Content string `json:"content"`
			} `json:"messages"`
		}
	}) (*struct {
		Body struct {
			Reply string `json:"reply"`
		}
	}, error) {
		client := cortex.New()
		if !client.Enabled() {
			return nil, huma.Error503ServiceUnavailable("cortex not configured")
		}
		if len(in.Body.Messages) == 0 {
			return nil, huma.Error400BadRequest("messages required")
		}

		system := buildSystemPrompt(ctx, a, in.Body.Agent, in.Body.Entity)

		// Seed with the system prompt, then append the last 8 user/assistant turns,
		// truncating each content to 2000 runes and normalizing roles.
		msgs := []cortex.Message{{Role: "system", Content: system}}
		turns := in.Body.Messages
		if len(turns) > 8 {
			turns = turns[len(turns)-8:]
		}
		for _, m := range turns {
			role := m.Role
			if role != "user" && role != "assistant" {
				role = "user"
			}
			msgs = append(msgs, cortex.Message{Role: role, Content: truncRunes(m.Content, 2000)})
		}

		reply, _, err := client.Chat(ctx, msgs)
		if err != nil {
			return nil, huma.Error500InternalServerError("chat failed", err)
		}

		out := &struct {
			Body struct {
				Reply string `json:"reply"`
			}
		}{}
		out.Body.Reply = reply
		return out, nil
	})
}

// buildSystemPrompt assembles the grounding system prompt from the dataset size,
// the optional agent persona + brief, and the optional entity record. Nil-safe:
// when a == nil (OpenAPI generation) it returns the base prompt only.
func buildSystemPrompt(ctx context.Context, a *app.App, agentSlug, entitySlug string) string {
	count := 0
	if a != nil && a.SQLDB != nil {
		_ = a.SQLDB.QueryRowContext(ctx, "SELECT count(*) FROM entities").Scan(&count)
	}

	system := "You are an AI analyst for Saudi Ventures Intelligence. Be concise, factual, and grounded ONLY in Saudi ecosystem data. " +
		"The Saudi Ventures Intelligence directory tracks " + itoa(count) + " Saudi ecosystem entities (startups, VCs, accelerators, incubators, and more). " +
		"If you don't know, say so."

	if a == nil {
		return system
	}

	if agentSlug != "" {
		if p, ok := personas[agentSlug]; ok {
			display := agentSlug
			if rows, err := models.Agents(a).Where("slug", "=", agentSlug).Limit(1).Get(ctx); err == nil && len(rows) > 0 {
				display = rows[0].Name
			}
			system = "You are " + p.Name + ", the " + display + " agent — " + p.Character + ". " + system

			// Latest brief for this agent (Narratives where kind == agent slug).
			if briefs, err := models.Narratives(a).
				Where("kind", "=", agentSlug).
				Order("created_at DESC").
				Limit(1).
				Get(ctx); err == nil && len(briefs) > 0 {
				if body := briefs[0].BodyMd; body != "" {
					system += " Reference brief:\n" + truncRunes(body, 1500)
				}
			}
		}
	}

	if entitySlug != "" {
		if rows, err := models.Entities(a).Where("slug", "=", entitySlug).Limit(1).Get(ctx); err == nil && len(rows) > 0 {
			e := rows[0]
			system += " The user is asking about this entity: name=" + e.Name +
				", kind=" + e.Kind +
				", sector=" + deref(e.Sector) +
				", HQ=" + deref(e.Headquarters) +
				", website=" + deref(e.Website) +
				". Full record JSON: " + e.Metadata +
				". Answer questions about it and how it fits the Saudi ecosystem."
		}
	}

	return system
}

// truncRunes returns s truncated to at most n runes (rune-safe).
func truncRunes(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}

// deref returns the pointed-to string, or "" for a nil pointer.
func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// itoa renders a non-negative int without importing strconv at call sites.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
