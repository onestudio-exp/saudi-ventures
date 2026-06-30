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
		model = "gemini-2.5-flash"
	}
	// Prefer the real Cortex product endpoint (CORTEX_HTTP_ADDR / CORTEX_TOKEN);
	// fall back to any OpenAI-compatible gateway (CORTEX_BASE_URL / CORTEX_API_KEY).
	baseURL := firstNonEmpty(os.Getenv("CORTEX_HTTP_ADDR"), os.Getenv("CORTEX_BASE_URL"))
	apiKey := firstNonEmpty(os.Getenv("CORTEX_TOKEN"), os.Getenv("CORTEX_API_KEY"))
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		model:   model,
		http:    &http.Client{Timeout: 60 * time.Second},
	}
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
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

// Message is a single chat turn (role + content) for multi-turn Chat calls.
type Message struct {
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
// snippet of the response body for debugging. It is a thin wrapper over Chat.
func (c *Client) Complete(ctx context.Context, system, user string) (content string, usage Usage, err error) {
	return c.chat(ctx, []chatMessage{
		{Role: "system", Content: system},
		{Role: "user", Content: user},
	}, 0.4)
}

// Chat sends a multi-turn message list and returns the assistant content plus
// token usage. Non-2xx responses or empty choices yield an error that includes a
// snippet of the response body for debugging.
func (c *Client) Chat(ctx context.Context, messages []Message) (string, Usage, error) {
	msgs := make([]chatMessage, 0, len(messages))
	for _, m := range messages {
		msgs = append(msgs, chatMessage{Role: m.Role, Content: m.Content})
	}
	return c.chat(ctx, msgs, 0.5)
}

// chat is the shared transport used by Complete and Chat.
func (c *Client) chat(ctx context.Context, messages []chatMessage, temperature float64) (content string, usage Usage, err error) {
	reqBody := chatRequest{
		Model:       c.model,
		Messages:    messages,
		Temperature: temperature,
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
