// Background scheduler: runs the Scout->Cortex pipeline unattended on two tickers
// (a fast ingest+scan ticker and a slow digest ticker). Disabled by default; it
// only launches when INGEST_ENABLED is "1"/"true". All intervals come from the
// environment (config is dynamic). The scheduler never panics — it logs and
// continues, tolerating a disabled Cortex / unconfigured Scout.
package pipeline

import (
	"context"
	"os"
	"strings"
	"time"

	"github.com/saudi-ventures/saudi-ventures/internal/app"
)

const (
	defaultIngestInterval = "30m"
	defaultDigestInterval = "24h"
)

// StartScheduler launches the unattended ingestion loop when INGEST_ENABLED is
// truthy ("1"/"true", case-insensitive). When disabled it logs at INFO and
// returns immediately (no goroutine). Tickers do not fire on start (they wait for
// the first tick) to avoid a burst at boot. The loop stops cleanly on ctx.Done().
func StartScheduler(ctx context.Context, a *app.App) {
	if !truthy(os.Getenv("INGEST_ENABLED")) {
		a.Log.Info("ingest scheduler disabled", "reason", "INGEST_ENABLED not set")
		return
	}

	ingestEvery := parseDurationOr(os.Getenv("INGEST_INTERVAL"), defaultIngestInterval)
	digestEvery := parseDurationOr(os.Getenv("INGEST_DIGEST_INTERVAL"), defaultDigestInterval)

	a.Log.Info("ingest scheduler enabled",
		"ingest_interval", ingestEvery.String(),
		"digest_interval", digestEvery.String(),
	)

	go func() {
		fast := time.NewTicker(ingestEvery)
		slow := time.NewTicker(digestEvery)
		defer fast.Stop()
		defer slow.Stop()

		for {
			select {
			case <-ctx.Done():
				a.Log.Info("ingest scheduler stopping", "err", ctx.Err())
				return

			case <-fast.C:
				runIngestCycle(ctx, a)

			case <-slow.C:
				runDigestCycle(ctx, a)
			}
		}
	}()
}

// runIngestCycle performs one Saudi-gated Scout ingest followed by an alert scan.
func runIngestCycle(ctx context.Context, a *app.App) {
	res, err := IngestScout(ctx, a, IngestOpts{SaudiOnly: true, Limit: 20})
	if err != nil {
		a.Log.Warn("scheduled ingest failed", "err", err)
	} else {
		a.Log.Info("scheduled ingest ok",
			"fetched", res.Fetched,
			"ingested", res.Ingested,
			"skipped", res.Skipped,
		)
	}

	created, _, err := ScanAlerts(ctx, a, 10)
	switch {
	case err == ErrCortexDisabled:
		a.Log.Info("scheduled alert scan skipped", "reason", "cortex not configured")
	case err != nil:
		a.Log.Warn("scheduled alert scan failed", "err", err)
	default:
		a.Log.Info("scheduled alert scan ok", "created", created)
	}
}

// runDigestCycle generates a 7-day narrative digest.
func runDigestCycle(ctx context.Context, a *app.App) {
	row, err := GenerateNarrative(ctx, a, 7, "digest", "")
	switch {
	case err == ErrCortexDisabled:
		a.Log.Info("scheduled digest skipped", "reason", "cortex not configured")
	case err != nil:
		a.Log.Warn("scheduled digest failed", "err", err)
	default:
		a.Log.Info("scheduled digest ok", "narrative_id", row.ID)
	}
}

// truthy reports whether s is "1" or "true" (case-insensitive, trimmed).
func truthy(s string) bool {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "1", "true":
		return true
	default:
		return false
	}
}

// parseDurationOr parses a Go duration string, falling back to fallback (itself a
// duration string) when raw is empty or invalid.
func parseDurationOr(raw, fallback string) time.Duration {
	if d, err := time.ParseDuration(strings.TrimSpace(raw)); err == nil && d > 0 {
		return d
	}
	d, _ := time.ParseDuration(fallback)
	return d
}
