-- Migration: stored snapshots of the dashboard's Google Ads and GA4 panels
--
-- WHY THIS EXISTS
-- ---------------
-- Every dashboard page load used to read Google Ads and GA4 live. One uncached
-- load is sixteen external Google HTTP calls: twelve to the Ads API (one OAuth
-- exchange plus eleven `searchStream` GAQL queries — two account totals, two
-- conversion-action candidate lookups, seven per-window counts) and four to GA4
-- (one service-account exchange plus three `properties.runReport`). The client
-- re-fetched the whole payload every sixty seconds, and the only thing bounding
-- that was an in-process, module-scoped fifteen-minute cache. That cache does not
-- survive a cold start and is not shared between serverless instances, so one
-- dashboard left open across a few cold starts spent the entire developer token.
--
-- The token is on EXPLORER access: 2,880 operations per sliding twenty-four
-- hours. Exhausting it failed the Ads panel and silently shrank the lead total —
-- the bug fixed in cb812cb, which is why the fixture below stores the panels
-- complete with the notes and per-figure errors the UI already renders.
--
-- Measured with this table in place, the ceiling is arithmetic rather than
-- hopeful: at most one refresh per three hours per source (the claim below is
-- atomic), plus one when the rolling window turns over, plus the daily cron — so
-- ten runs a day at eleven Ads operations each, 110 of 2,880, or 3.8%. GA4 is
-- thirty requests and under three hundred tokens against a 200,000/24h ceiling.
-- A page load costs zero. No volume of traffic can change any of that, which is
-- the property the previous cache could not offer.
--
-- NO PII: account-level spend, click counts and event counts. No customer, no
-- message, no query text attributable to a person.

-- ── Panel snapshots ─────────────────────────────────────────────────────────
-- One row per (source, window). `payload` is the ENTIRE resolved panel object as
-- lib/dashboard-data.ts's reader returned it, stored whole rather than shredded
-- into metric rows on purpose: those readers resolve conversion actions by label,
-- discover candidates, and attach the notes and per-figure errors that the card
-- renders. Re-deriving any of that in SQL would duplicate the trickiest logic in
-- the codebase and let the two copies drift.

CREATE TABLE IF NOT EXISTS google_panel_snapshots (
  -- 'ads' | 'clicks'. Deliberately text, not an enum: adding a source should not
  -- need a migration. Same call as gbp_daily_metrics.metric.
  source        text        NOT NULL,
  -- The lead window this snapshot was captured for. Both are stored so a reader
  -- can tell whether a row covers the window it is about to render — a panel from
  -- yesterday's window cannot be summed into today's lead total.
  window_from   date        NOT NULL,
  window_to     date        NOT NULL,
  -- The resolved panel, or NULL for a row that has been claimed but for which no
  -- figures have been stored — a refresh in flight, or one that failed. See
  -- last_error. A panel that came back with `available: false` (a 429, a rejected
  -- token) is a NON-ANSWER and is stored as a failure, never here: this column is
  -- what the dashboard renders, and a non-answer rendered for a full TTL turns a
  -- rate limit measured in minutes into three hours of missing figures.
  payload       jsonb,
  -- When the row was last CLAIMED. This is the rate limiter, and it is set before
  -- the Google read rather than after, on purpose: a refresh that crashes must not
  -- leave the row looking fresh and retry on every subsequent page load. A failed
  -- attempt therefore costs a full TTL before the next one, which is what keeps a
  -- broken credential from becoming a retry storm against the quota.
  claimed_at    timestamptz NOT NULL DEFAULT now(),
  -- When the payload was actually READ from Google. NULL until a read returns
  -- FIGURES — not merely until a read happens. This is what the dashboard reports
  -- as "figures last read at" — it is an observation time, not an ingestion time,
  -- and the two must not be conflated (the same distinction gbp_daily_metrics
  -- draws between metric_date and synced_at).
  captured_at   timestamptz,
  -- Short, PII-free reason from the most recent failed read, cleared on success.
  last_error    text,
  -- The upsert target AND the refresh lock. `insert … on conflict do nothing
  -- returning` is the whole claim protocol: whoever inserts or updates the row
  -- wins the right to call Google, and concurrent page loads cannot stampede.
  -- Without an explicit key PostgREST falls back to inserting a duplicate row on
  -- every sync — the trap gbp_daily_metrics documents on its own constraint.
  CONSTRAINT google_panel_snapshots_source_window_key
    PRIMARY KEY (source, window_from, window_to)
);

COMMENT ON TABLE google_panel_snapshots IS
  'Resolved Google Ads and GA4 dashboard panels, one row per (source, lead window). '
  'Written by the scheduled sync and read by the dashboard, which makes no live Google '
  'call of its own — the row is also the refresh lock, so page loads cannot spend quota. '
  'Commercially sensitive (ad spend): RLS is service-role-only.';

COMMENT ON COLUMN google_panel_snapshots.source IS
  'ads | clicks. One row per source per lead window. Text rather than an enum so a third '
  'source needs no migration.';

COMMENT ON COLUMN google_panel_snapshots.payload IS
  'The whole panel object as the reader returned it, including its note, available flag and '
  'per-figure error strings. NULL means claimed-without-figures: either a read is in flight '
  'or the last one failed — read last_error to tell which. A panel that came back '
  'available:false is treated as a failure and never stored here, so that a rate limit '
  'measured in minutes is not served for a TTL measured in hours. A reader must treat NULL '
  'as "no figures", never as zero figures.';

COMMENT ON COLUMN google_panel_snapshots.claimed_at IS
  'When the row was last claimed for a refresh. Set BEFORE the Google read so a crash or a '
  'failure still rate-limits the next attempt, rather than letting every page load retry.';

COMMENT ON COLUMN google_panel_snapshots.captured_at IS
  'When the payload was read from Google. NULL until a read returns FIGURES, not merely until '
  'a read happens. Reported by the dashboard as the observation time of its Ads and GA4 '
  'figures.';

-- The read path is "the newest usable row for this source". The primary key leads
-- with source but orders by window_from before window_to, so it cannot serve that
-- scan; this index can.
CREATE INDEX IF NOT EXISTS google_panel_snapshots_source_window_idx
  ON google_panel_snapshots (source, window_to DESC);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- No policies, deliberately — the same call as gbp_daily_metrics. RLS enabled
-- with zero policies denies anon and authenticated outright while service_role
-- bypasses it. There is no anonymous reader for ad spend, so none is granted. The
-- consequence to accept knowingly: SUPABASE_SERVICE_ROLE_KEY is Production-only in
-- Vercel, so this table is unreadable from Preview deployments by design.

ALTER TABLE google_panel_snapshots ENABLE ROW LEVEL SECURITY;

-- ── Sizing ──────────────────────────────────────────────────────────────────
-- 2 sources x 365 days = 730 rows a year, each a few KB of JSON. Years of headroom
-- before this is worth thinking about; no pruning job, matching gbp_daily_metrics.
