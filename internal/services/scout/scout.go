// Package scout is a minimal client for the One Studio Scout product's customer
// API (the metered "envelope" data seam). Config is read from the environment
// (SCOUT_HTTP_ADDR, SCOUT_TOKEN) so the source can be swapped without code changes.
//
// Contract (from scout/internal/customerapi): GET {base}/v1/envelopes?limit=&source=
// with `Authorization: Bearer <scout-token>` returns {"data":[envelope...],"count":N}
// where an envelope is {id, source, content, url?, lang?, collected_at}.
package scout

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// Client talks to the Scout customer API.
type Client struct {
	baseURL string
	token   string
	http    *http.Client
}

// New builds a client from the environment.
func New() *Client {
	return &Client{
		baseURL: strings.TrimRight(os.Getenv("SCOUT_HTTP_ADDR"), "/"),
		token:   os.Getenv("SCOUT_TOKEN"),
		http:    &http.Client{Timeout: 30 * time.Second},
	}
}

// Enabled reports whether the client has the minimum config to make calls.
func (c *Client) Enabled() bool { return c.baseURL != "" && c.token != "" }

// Envelope is Scout's customer-facing envelope representation.
type Envelope struct {
	ID          string  `json:"id"`
	Source      string  `json:"source"`
	Content     string  `json:"content"`
	URL         *string `json:"url"`
	Lang        *string `json:"lang"`
	CollectedAt string  `json:"collected_at"` // RFC3339
}

type envelopesResponse struct {
	Data  []Envelope `json:"data"`
	Count int        `json:"count"`
}

// Envelopes pulls the most recent envelopes, optionally filtered by source id.
func (c *Client) Envelopes(ctx context.Context, limit int, source string) ([]Envelope, error) {
	if limit <= 0 {
		limit = 50
	}
	q := url.Values{}
	q.Set("limit", strconv.Itoa(limit))
	if source != "" {
		q.Set("source", source)
	}
	endpoint := c.baseURL + "/v1/envelopes?" + q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("scout: build request: %w", err)
	}
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
	return parsed.Data, nil
}

func snippet(b []byte) string {
	s := strings.TrimSpace(string(b))
	if len(s) > 300 {
		s = s[:300] + "…"
	}
	return s
}
