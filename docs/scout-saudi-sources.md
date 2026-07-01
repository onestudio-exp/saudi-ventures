# Scout — enabling Saudi-scope collection (handoff for the Scout team)

**Status:** Saudi sources/keywords are configured in Scout, but **no Saudi-scope
envelopes are being collected**. The radar therefore shows an honest empty state.
This is a Scout-side collector limitation, not an app bug.

## What Saudi Ventures already configured (via the Scout GraphQL admin API)

Source configs (all `enabled: true`):

| Plugin | Scope | Name | Source ID |
|---|---|---|---|
| `news-tech` | saudi-ventures | Saudi Startup & Funding News (EN) | `7f36d779-32aa-46ba-b7f5-5042d7942014` |
| `news-tech` | saudi-ventures | أخبار الشركات الناشئة (AR) | `15e49023-8db4-43fe-9385-7090c3e0631d` |
| `axon-search` | saudi-ventures | Saudi Axon web search | `13e55874-dfa3-4384-b440-b2e820d4302b` |
| `rss-generic` | global | Saudi Startup & Funding (EN) | `bc8a83f6-4b4e-40e3-bcb8-d9989e3e3252` |
| `rss-generic` | global | أخبار الشركات الناشئة (AR) | `15ca39ec-8d6c-4899-b05b-eb038512f584` |

Active keywords added to `axon-search` (via `promoteTrendToKeyword`):
- `Saudi Arabia startup venture capital funding Riyadh NEOM fintech Vision 2030`
- `شركة ناشئة سعودية تمويل استثمار الرياض تقنية مالية`

The feeds are **proven fetchable**: `testFetch(pluginSlug:"news-tech", input:{url:<Saudi
Google-News RSS>})` returns **100 real Saudi articles** (e.g. "Saudi Arabia, China Hold
Talks on Vision 2030…").

## Why nothing collects (diagnosis)

`collectorWorkers` shows each RSS plugin has **one worker that fetches a single
(primary) config** and ignores additional source configs:

- `news-tech` → idle, **4 items/hr** (only its original "Global Tech News" feed)
- `rss-generic` → idle, **3 items/hr** (only its original Hacker-News feed) — unchanged
  after adding two Saudi feeds
- `axon-search` → busy, **236 items/hr**, but its Saudi query returns bot-walled
  homepages (e.g. `saudia.com` "Pardon Our Interruption"), not startup news

So: creating extra source configs on existing RSS plugins does **not** cause
collection, and the keyword collector's Saudi output is low quality.

## What the Scout team needs to do (any one of these)

1. **Enable per-config fetching on the RSS workers** so `rss-generic` (or `news-tech`)
   fetches *all* enabled source configs, not just the primary one. Then the two
   Saudi Google-News RSS feeds above start collecting immediately.
2. **Add a dedicated Saudi news plugin + worker** (like `news-alarabiya` /
   `news-aawsat` already exist) pointed at a Saudi venture feed — e.g.
   `https://news.google.com/rss/search?q=Saudi+startup+funding+venture&hl=en-US&gl=US&ceid=US:en`.
3. **Assign a worker to the `saudi-ventures` scope** if collection is scope-gated.

Once any of these is done, the app's ingest scheduler (Saudi-gated, runs every 30m)
will pull the new envelopes and the radar's live signals + alerts populate
automatically — no app change required.

## App-side status (already handled)

- The ingest pipeline filters to Saudi-relevant envelopes; the radar shows a truthful
  empty state until real Saudi signals arrive.
- Dataset-grounded intelligence (Cortex narratives, per-entity briefs, agent chat)
  already works and does **not** depend on Scout collection.
