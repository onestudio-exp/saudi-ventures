// PUBLIC Cortex-backed batch translation endpoint. The frontend calls this to
// translate arbitrary data (entity descriptions, narratives, alerts) to Arabic or
// English on demand. It degrades gracefully: when Cortex is not configured, or a
// translation call fails, or the model returns a malformed payload, it returns the
// input texts unchanged (identity passthrough) instead of erroring — the UI must
// keep working without LLM creds. A process-local cache avoids re-billing repeats.
package rest

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"sync"

	"github.com/danielgtaylor/huma/v2"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
	"github.com/saudi-ventures/saudi-ventures/internal/services/cortex"
)

// transCache memoizes translations across requests to avoid re-billing Cortex for
// text we've already translated. Key = normalized target code + US ("\x1f") +
// source text; value = translated text. Guarded by transMu.
var (
	transMu    sync.RWMutex
	transCache = map[string]string{}
)

// transKey builds the cache key for a (target, text) pair. The unit-separator
// (\x1f) can't appear in a language code, so the boundary is unambiguous.
func transKey(targetCode, text string) string {
	return targetCode + "\x1f" + text
}

// maxTexts caps how many strings we translate per request (excess passes through
// unchanged); maxRunes bounds each string sent to the model.
const (
	maxTexts = 50
	maxRunes = 2000
)

// RegisterTranslateRoutes mounts the PUBLIC batch translation endpoint (no auth).
func RegisterTranslateRoutes(api huma.API, a *app.App) {
	huma.Register(api, huma.Operation{
		OperationID: "translate",
		Method:      http.MethodPost,
		Path:        "/api/translate",
		Summary:     "Batch-translate strings to Arabic or English via Cortex",
		Tags:        []string{"Translate"},
	}, func(ctx context.Context, in *struct {
		Body struct {
			Target string   `json:"target"`
			Texts  []string `json:"texts"`
		}
	}) (*struct {
		Body struct {
			Translations []string `json:"translations"`
		}
	}, error) {
		out := &struct {
			Body struct {
				Translations []string `json:"translations"`
			}
		}{}
		// Always return a non-nil slice so the OpenAPI shape is stable and clients
		// never see null.
		out.Body.Translations = []string{}

		// Empty input → empty result (200).
		if len(in.Body.Texts) == 0 {
			return out, nil
		}

		// Normalize the target language into a code + human-readable name.
		targetCode, langName := normalizeTarget(in.Body.Target)

		// Split into the translatable window (first maxTexts) and the pass-through
		// tail (anything beyond the cap, returned unchanged).
		texts := in.Body.Texts
		var passthrough []string
		if len(texts) > maxTexts {
			passthrough = texts[maxTexts:]
			texts = texts[:maxTexts]
		}

		// Truncate each in-window text to maxRunes before it ever hits the cache
		// key or the model.
		window := make([]string, len(texts))
		for i, t := range texts {
			window[i] = truncRunes(t, maxRunes)
		}

		// Result buffer for the window; the tail is appended verbatim at the end.
		result := make([]string, len(window))

		client := cortex.New()
		if !client.Enabled() {
			// Identity passthrough for the whole input — never error.
			copy(result, window)
			out.Body.Translations = append(result, passthrough...)
			return out, nil
		}

		// Partition the window into cache hits vs. misses. uncachedIdx maps each
		// entry of uncachedTexts back to its position in result/window.
		var uncachedTexts []string
		var uncachedIdx []int
		transMu.RLock()
		for i, t := range window {
			if v, ok := transCache[transKey(targetCode, t)]; ok {
				result[i] = v
			} else {
				uncachedIdx = append(uncachedIdx, i)
				uncachedTexts = append(uncachedTexts, t)
			}
		}
		transMu.RUnlock()

		if len(uncachedTexts) > 0 {
			translated := translateBatch(ctx, client, langName, uncachedTexts)
			// translateBatch always returns a slice the same length as its input
			// (falling back to identity on any failure), so this is safe.
			writes := make(map[string]string, len(uncachedTexts))
			for j, idx := range uncachedIdx {
				result[idx] = translated[j]
				writes[transKey(targetCode, uncachedTexts[j])] = translated[j]
			}
			transMu.Lock()
			for k, v := range writes {
				transCache[k] = v
			}
			transMu.Unlock()
		}

		out.Body.Translations = append(result, passthrough...)
		return out, nil
	})
}

// normalizeTarget maps the requested target to a canonical (code, name) pair.
// "ar" → Arabic, "en" → English; anything else defaults to Arabic. The code is
// used for the cache key so equivalent requests collapse regardless of casing.
func normalizeTarget(target string) (code, name string) {
	switch strings.ToLower(strings.TrimSpace(target)) {
	case "en", "english":
		return "en", "English"
	case "ar", "arabic":
		return "ar", "Arabic"
	default:
		return "ar", "Arabic"
	}
}

// translateBatch sends one Cortex call for the uncached texts and returns a slice
// of the same length. On any failure (call error, malformed JSON, length
// mismatch) it falls back to identity (the input texts) rather than erroring.
func translateBatch(ctx context.Context, client *cortex.Client, langName string, texts []string) []string {
	// Single text: translate directly (no JSON wrapping). This is far more robust
	// for long paragraphs with embedded quotes/markdown, which otherwise break the
	// JSON-array round-trip and fall back to the untranslated original.
	if len(texts) == 1 {
		system := "You are a professional translator. Translate the user's text into " + langName +
			". Preserve names, numbers, URLs, and Markdown formatting. Return ONLY the translation — no preamble, no quotes, no commentary."
		out, _, err := client.Chat(ctx, []cortex.Message{
			{Role: "system", Content: system},
			{Role: "user", Content: texts[0]},
		})
		if err != nil {
			return texts
		}
		t := strings.TrimSpace(stripFences(out))
		if t == "" {
			return texts
		}
		return []string{t}
	}

	system := "You are a professional translator. Translate each string in the input JSON array into " + langName +
		". Preserve names, numbers, URLs, and Markdown formatting. Return ONLY a JSON array of translated strings, " +
		"same length and order, no commentary or code fences."

	payload, err := json.Marshal(texts)
	if err != nil {
		return texts
	}

	out, _, err := client.Chat(ctx, []cortex.Message{
		{Role: "system", Content: system},
		{Role: "user", Content: string(payload)},
	})
	if err != nil {
		return texts
	}

	var parsed []string
	if err := json.Unmarshal([]byte(stripFences(out)), &parsed); err == nil && len(parsed) == len(texts) {
		return parsed
	}
	return texts
}

// stripFences removes surrounding Markdown code fences (```json ... ``` or
// ``` ... ```) and whitespace so the inner JSON array can be unmarshaled.
func stripFences(s string) string {
	s = strings.TrimSpace(s)
	if !strings.HasPrefix(s, "```") {
		return s
	}
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimPrefix(s, "json")
	s = strings.TrimPrefix(s, "JSON")
	if i := strings.LastIndex(s, "```"); i >= 0 {
		s = s[:i]
	}
	return strings.TrimSpace(s)
}
