-- Migration: durable outcome log for the lead pipeline
--
-- WHY THIS EXISTS
-- ---------------
-- Every lead-route failure path is already handled: nothing throws, and a lead
-- is only reported lost when GHL *and* SMTP both fail. But handled was
-- implemented as "caught + console.log", and stdout on Vercel is a rolling
-- buffer nobody reads.
--
-- When lib/spam-filter.ts began rejecting every submission that carried an email
-- address, the only signal was one log line per submission. The outage ran
-- undetected for 19 days because a broken pipeline and a quiet week look
-- identical from the outside.
--
-- This table makes the difference visible: one row per pipeline outcome, so
-- /api/health/lead-pipeline can answer "when did each channel last succeed?" and
-- alert when the answer is "too long ago, despite traffic".
--
-- NO PII. `detail` holds route labels, HTTP statuses and short failure reasons
-- only — never a name, phone, email or message body. This is enforced by
-- convention in lib/lead-health.ts and matters because the anon role can read
-- this table (see the RLS note below).

CREATE TABLE IF NOT EXISTS lead_pipeline_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Route label that produced the outcome, e.g. 'send-quote'. Not user input.
  source      text        NOT NULL,
  -- One of: ghl | ghl-note | email | sms | fleet | supabase | filter.
  -- Deliberately text, not an enum: adding a channel should not need a migration.
  channel     text        NOT NULL,
  ok          boolean     NOT NULL,
  -- Short, PII-free reason. Truncated to 500 chars by the writer.
  detail      text,
  duration_ms integer
);

COMMENT ON TABLE lead_pipeline_events IS
  'Durable per-outcome log for the lead pipeline (GHL / email / SMS / fleet). '
  'Contains NO PII by design — read by the unauthenticated health endpoint.';

COMMENT ON COLUMN lead_pipeline_events.channel IS
  'ghl | ghl-note | email | sms | fleet | supabase | filter';

-- The health check reads "recent rows, newest first, grouped by channel" and the
-- staleness query filters on created_at alone, so this composite covers both.
CREATE INDEX IF NOT EXISTS lead_pipeline_events_created_at_channel_idx
  ON lead_pipeline_events (created_at DESC, channel);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- The health endpoint may run on the anon key (SUPABASE_SERVICE_ROLE_KEY is
-- preferred but optional), so anon needs INSERT to record outcomes and SELECT to
-- compute health. Both are safe here precisely because the table is PII-free:
--   * INSERT — worst case an attacker pollutes health metrics, and the health
--     check would then report a *healthy* pipeline. That is a real limitation;
--     set SUPABASE_SERVICE_ROLE_KEY to close it. Deliberately no UPDATE/DELETE
--     for anon, so existing evidence cannot be rewritten.
--   * SELECT — bounded to the last 30 days, which is well beyond the staleness
--     window the health check uses, and exposes nothing about any customer.
ALTER TABLE lead_pipeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_pipeline_events_anon_insert ON lead_pipeline_events;
CREATE POLICY lead_pipeline_events_anon_insert
  ON lead_pipeline_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS lead_pipeline_events_recent_select ON lead_pipeline_events;
CREATE POLICY lead_pipeline_events_recent_select
  ON lead_pipeline_events
  FOR SELECT
  TO anon, authenticated
  USING (created_at > now() - interval '30 days');

-- ── Retention ───────────────────────────────────────────────────────────────
-- This table grows by roughly (leads x 4 channels) rows per day — a few hundred
-- rows a year at current volume, so it needs no pruning yet. If volume grows,
-- delete rows older than 90 days from a scheduled job rather than adding a
-- trigger here.
