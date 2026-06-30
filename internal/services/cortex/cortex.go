// Package cortex is a minimal client for the One Studio Cortex LLM gateway, an
// OpenAI-compatible LiteLLM endpoint. Configuration is read from the environment
// at construction time (CORTEX_BASE_URL, CORTEX_API_KEY, CORTEX_MODEL) so the
// gateway can be swapped without code changes (config is dynamic, never hard-coded).
package cortex

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

// Client talks to an OpenAI-compatible chat-completions endpoint.
type Client struct {
	baseURL string
	apiKey  string
	model   string
	http    *http.Client
}

// New builds a client from the environment. CORTEX_MODEL defaults to "gpt-4o"
// when unset. The HTTP timeout is 60s (LLM calls can be slow).
func New() *Client {
	model := os.Getenv("CORTEX_MODEL")
	if model == "" {
		model = "gpt-4o"
	}
	return &Client{
		baseURL: strings.TrimRight(os.Getenv("CORTEX_BASE_URL"), "/"),
		apiKey:  os.Getenv("CORTEX_API_KEY"),
		model:   model,
		http:    &http.Client{Timeout: 60 * time.Second},
	}
}

// Enabled reports whether the client has the minimum config to make calls.
func (c *Client) Enabled() bool { return c.baseURL != "" && c.apiKey != "" }

// Model returns the configured model name.
func (c *Client) Model() string { return c.model }

// Usage captures token accounting from a completion response.
type Usage struct {
	PromptTokens     int
	CompletionTokens int
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
	} `json:"usage"`
}

// Complete sends a system+user prompt and returns the assistant content plus
// token usage. Non-2xx responses or empty choices yield an error that includes a
// snippet of the response body for debugging.
func (c *Client) Complete(ctx context.Context, system, user string) (content string, usage Usage, err error) {
	reqBody := chatRequest{
		Model: c.model,
		Messages: []chatMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
		Temperature: 0.4,
	}
	buf, err := json.Marshal(reqBody)
	if err != nil {
		return "", Usage{}, fmt.Errorf("cortex: marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/chat/completions", bytes.NewReader(buf))
	if err != nil {
		return "", Usage{}, fmt.Errorf("cortex: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", Usage{}, fmt.Errorf("cortex: request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", Usage{}, fmt.Errorf("cortex: status %d: %s", resp.StatusCode, snippet(body))
	}

	var parsed chatResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", Usage{}, fmt.Errorf("cortex: decode response: %w: %s", err, snippet(body))
	}
	if len(parsed.Choices) == 0 {
		return "", Usage{}, fmt.Errorf("cortex: empty choices: %s", snippet(body))
	}

	return parsed.Choices[0].Message.Content, Usage{
		PromptTokens:     parsed.Usage.PromptTokens,
		CompletionTokens: parsed.Usage.CompletionTokens,
	}, nil
}

// snippet returns a bounded, single-line view of a response body for error text.
func snippet(b []byte) string {
	s := strings.TrimSpace(string(b))
	if len(s) > 500 {
		s = s[:500] + "…"
	}
	return s
}
