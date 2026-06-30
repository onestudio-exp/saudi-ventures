// Package scout is a client for the One Studio Scout product. On dev, Scout's
// metered REST /v1 customer API is not routed, but its GraphQL admin API
// (POST {SCOUT_HTTP_ADDR}/graphql) is reachable with a Fort/GoTrue service_role
// JWT — so this client reads envelopes over GraphQL. Config is from the env:
//
//	SCOUT_HTTP_ADDR        base URL (…/products/scout/api)
//	SCOUT_GRAPHQL_TOKEN    Bearer for /graphql (falls back to SUPABASE_SERVICE_KEY)
package scout

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// Client talks to Scout's GraphQL admin API.
type Client struct {
	baseURL string
	token   string
	http    *http.Client
}

// New builds a client from the environment.
func New() *Client {
	return &Client{
		baseURL: strings.TrimRight(os.Getenv("SCOUT_HTTP_ADDR"), "/"),
		token:   firstNonEmpty(os.Getenv("SCOUT_GRAPHQL_TOKEN"), os.Getenv("SUPABASE_SERVICE_KEY")),
		http:    &http.Client{Timeout: 30 * time.Second},
	}
}

// Enabled reports whether the client has the minimum config to make calls.
func (c *Client) Enabled() bool { return c.baseURL != "" && c.token != "" }

// Envelope is the subset of Scout's GraphQL Envelope we ingest.
type Envelope struct {
	ID          string  `json:"id"`
	SourceID    string  `json:"sourceId"`
	Content     string  `json:"content"`
	URL         *string `json:"url"`
	Lang        *string `json:"lang"`
	CollectedAt string  `json:"collectedAt"`
	PublishedAt *string `json:"publishedAt"`
}

const envelopesQuery = `query($limit:Int,$sourceId:String){ envelopes(limit:$limit, sourceId:$sourceId){ id sourceId content url lang collectedAt publishedAt } }`

type graphqlRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables"`
}

type envelopesResponse struct {
	Data struct {
		Envelopes []Envelope `json:"envelopes"`
	} `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

// Envelopes pulls recent envelopes via GraphQL, optionally filtered by source id.
func (c *Client) Envelopes(ctx context.Context, limit int, sourceID string) ([]Envelope, error) {
	if limit <= 0 {
		limit = 50
	}
	vars := map[string]any{"limit": limit}
	if sourceID != "" {
		vars["sourceId"] = sourceID
	}
	buf, err := json.Marshal(graphqlRequest{Query: envelopesQuery, Variables: vars})
	if err != nil {
		return nil, fmt.Errorf("scout: marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/graphql", bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("scout: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("scout: request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("scout: status %d: %s", resp.StatusCode, snippet(body))
	}

	var parsed envelopesResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("scout: decode response: %w: %s", err, snippet(body))
	}
	if len(parsed.Errors) > 0 {
		return nil, fmt.Errorf("scout: graphql error: %s", parsed.Errors[0].Message)
	}
	return parsed.Data.Envelopes, nil
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func snippet(b []byte) string {
	s := strings.TrimSpace(string(b))
	if len(s) > 300 {
		s = s[:300] + "…"
	}
	return s
}
