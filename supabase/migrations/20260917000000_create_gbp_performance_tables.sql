-- Migration: persistent Google Business Profile Performance tracking
--
-- WHY THIS EXISTS
-- ---------------
-- Calls, direction requests and website clicks made directly on the Google
-- Business Profile listing are a channel entirely separate from the website.
-- Nothing on the site can observe them: GTM/GA4/Ads only see traffic that
-- reached the site, and lead_pipeline_events only records leads that arrived
-- through a form. So "how many people called us from Google this month" had no
-- answer anywhere.
--
-- The GBP Performance API can answer it, but only in a way that must be
-- persisted rather than fetched on demand, for three measured reasons:
--
--   1. It lags. Verified 2026-09-16: the most recent day carrying data was
--      2026-09-11 — four days behind. Google documents no freshness figure;
--      community reports put stabilisation at 48-72h and direction requests up
--      to ~10 days.
--   2. It revises. Those figures keep changing after they first appear, so a
--      value read once and not revisited is routinely wrong.
--   3. Therefore any live comparison is dishonest: a window ending today is
--      incomplete while the window before it is settled, which renders as a
--      decline that did not happen. Only a stored, re-pulled series makes
--      period-over-period comparison truthful.
--
-- COMMERCIALLY SENSITIVE — the opposite call from lead_pipeline_events.
-- That table is PII-free and anon-readable. These tables are call volumes,
-- direction requests and website clicks: business performance data with no
-- legitimate anonymous reader. RLS is therefore enabled with NO policies at
-- all, which means service_role only. The consequence to accept knowingly:
-- SUPABASE_SERVICE_ROLE_KEY is Production-only in Vercel, so these tables are
-- unreadable from Preview deployments by design.
--
-- NO PII: location-level daily aggregates. No customer, no message, no query
-- text attributable to a person.

-- ── Daily metric series ─────────────────────────────────────────────────────
-- One row per (location, day, metric). Sparse by design: a row exists only for
-- a day the API actually returned a value for. See the note on zeros below.

CREATE TABLE IF NOT EXISTS gbp_daily_metrics (
  id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Supplied by the caller from lib/contact.ts GBP_LOCATION_ID. Deliberately
  -- has no DEFAULT: a literal here would be a second copy of a value that
  -- already caused one outage when it was "corrected" to a plausible-looking
  -- wrong id (a wrong id and a missing permission both 404).
  location_id   text        NOT NULL,
  -- The metric's OWN day (UTC), taken from the API's {year,month,day}. This is
  -- NOT the ingestion time — see first_seen_at/synced_at for that. Keeping them
  -- distinct is the reason this is not a row in lead_pipeline_events, whose
  -- created_at means "when this happened" and feeds staleness arithmetic.
  metric_date   date        NOT NULL,
  -- CALL_CLICKS | BUSINESS_DIRECTION_REQUESTS | WEBSITE_CLICKS |
  -- BUSINESS_IMPRESSIONS_{DESKTOP,MOBILE}_{MAPS,SEARCH}.
  -- Deliberately text, not an enum: adding a metric should not need a migration.
  metric        text        NOT NULL,
  -- Coerced from the API's JSON *string* value (e.g. "3") by the writer.
  value         integer     NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  synced_at     timestamptz NOT NULL DEFAULT now(),
  -- The upsert target. Without this constraint PostgREST's upsert falls back to
  -- the primary key and INSERTS A DUPLICATE ROW on every sync, so every total
  -- double-counts from then on. Named explicitly so it can be asserted by name.
  CONSTRAINT gbp_daily_metrics_location_date_metric_key
    UNIQUE (location_id, metric_date, metric)
);

COMMENT ON TABLE gbp_daily_metrics IS
  'Daily Google Business Profile Performance metrics, one row per (location, day, '
  'metric). SPARSE: a row exists only where the API returned a value, so an absent '
  'day means zero-or-not-yet-published, never "unknown" — read gbp_sync_state.covered_to '
  'to tell which. Commercially sensitive: RLS is service-role-only.';

COMMENT ON COLUMN gbp_daily_metrics.metric IS
  'CALL_CLICKS | BUSINESS_DIRECTION_REQUESTS | WEBSITE_CLICKS | '
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS | BUSINESS_IMPRESSIONS_DESKTOP_SEARCH | '
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS | BUSINESS_IMPRESSIONS_MOBILE_SEARCH. '
  'BUSINESS_CONVERSATIONS is deliberately NOT collected: Google retired Business '
  'Profile messaging on 2024-07-31, so it is a permanently-zero metric that a future '
  'reader would mistake for "no messages came in".';

COMMENT ON COLUMN gbp_daily_metrics.first_seen_at IS
  'When this (location, day, metric) was first written. Never updated by the writer — '
  'it is omitted from the upsert payload, so it survives UPDATE and only the INSERT '
  'default sets it.';

COMMENT ON COLUMN gbp_daily_metrics.synced_at IS
  'When the row was last written. Google revises these figures for days after they first '
  'appear, so synced_at > first_seen_at records that the value has been revised at least '
  'once.';

-- The read path is "metric(s) over a date range". The UNIQUE index leads with
-- location_id, so it cannot serve a metric-first scan; this one can.
CREATE INDEX IF NOT EXISTS gbp_daily_metrics_metric_date_idx
  ON gbp_daily_metrics (metric, metric_date DESC);

-- ── Sync state ──────────────────────────────────────────────────────────────
-- Sparse rows cannot answer "is this quiet, or is the pull broken?" — a genuinely
-- quiet 30 days may legitimately hold only a handful of rows, and nothing in the
-- metric table distinguishes that from a cron that stopped running. This row
-- answers it factually, as the last day a successful pull COVERED (which is not
-- the same as the last day that had activity).

CREATE TABLE IF NOT EXISTS gbp_sync_state (
  location_id  text        PRIMARY KEY,
  -- The oldest day the most recent successful pull covered.
  covered_from date,
  -- The newest day it covered. A consumer anchors its comparisons to this,
  -- minus a settling lag, rather than to today.
  covered_to   date,
  last_ok_at   timestamptz,
  -- Short, PII-free reason from the most recent FAILED pull, cleared on success.
  last_error   text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE gbp_sync_state IS
  'One row per location: what window the most recent successful GBP Performance pull '
  'covered, and the last failure if any. Exists because sparse metric rows cannot '
  'distinguish "no activity" from "not pulled". Commercially sensitive: service-role only.';

COMMENT ON COLUMN gbp_sync_state.covered_to IS
  'Newest day the last successful pull REQUESTED. Data for recent days is still settling '
  'and may never appear, so consumers must subtract a settling lag before comparing.';

-- ── Row Level Security ──────────────────────────────────────────────────────
-- No policies, deliberately. RLS enabled with zero policies denies anon and
-- authenticated outright, while service_role bypasses RLS. This is the opposite
-- of lead_pipeline_events (which grants anon INSERT + a 30-day SELECT because it
-- is PII-free and read by an unauthenticated health endpoint); there is no
-- anonymous reader for call volumes, so none is granted.

ALTER TABLE gbp_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_sync_state  ENABLE ROW LEVEL SECURITY;

-- ── Keep the channel list honest ────────────────────────────────────────────
-- The 'gbp' channel is written to lead_pipeline_events by lib/gbp-performance.ts.
-- The applied migration that created that table lists its channels in a column
-- comment; this re-states it rather than editing an already-applied file.

COMMENT ON COLUMN lead_pipeline_events.channel IS
  'ghl | ghl-note | email | sms | fleet | supabase | filter | gbp';

-- ── Sizing ──────────────────────────────────────────────────────────────────
-- 7 metrics x at most 365 days a year, and only days with activity are stored,
-- so well under 3,000 rows a year. No pruning needed.
