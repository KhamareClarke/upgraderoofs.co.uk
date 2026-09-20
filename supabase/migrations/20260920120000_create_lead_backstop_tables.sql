-- Migration: create the two lead tables the browser backstop writes to
--
-- WHY THIS EXISTS
-- ---------------
-- 20250930164244_create_roofing_tables.sql declares `quote_requests` and
-- `contact_messages`, but it was never applied to the live project. Verified
-- 2026-09-20 against the production project with the anon key:
--
--     lead_pipeline_events   -> HTTP 200   (exists; created 20260916000000)
--     quote_requests         -> HTTP 404   (does not exist)
--     contact_messages       -> HTTP 404   (does not exist)
--
-- The consequence is worth stating plainly, because it is not obvious from the
-- code: the "Supabase backstop" that eight client components call after a form
-- submit has never written a single row. Every `insert` returned PGRST205
-- ("Could not find the table in the schema cache") and supabase-js RESOLVES
-- with `{ error }` rather than throwing — so the surrounding try/catch never
-- fired, the form still showed its success state, and the only trace was a
-- console.error nobody reads. The backstop was decorative.
--
-- So the tables are created here, and 20260915000000's column additions are
-- folded in rather than assumed to have run.
--
-- WHAT THE BACKSTOP IS FOR
-- ------------------------
-- Nothing writes these tables from an API route. The routes call GHL + SMTP and
-- nothing else. So a row here is the ONLY copy of a lead that survives a GHL or
-- mail outage — which is exactly why the client writes it when the route
-- reports 5xx, not just when it reports success.
--
-- That purpose dictates the column constraints below. A brief earlier version
-- of 20250930164244 made `email`, `postcode`, `service_type` and `subject`
-- NOT NULL; a later migration had to drop two of those. A NOT NULL that
-- rejects a payload does not produce a validation error a customer can act on —
-- it silently discards the last surviving copy of a real lead, in a code path
-- whose entire reason for existing is that it must not. So the only NOT NULLs
-- here are the two fields that make a row identifiable as a lead at all.
-- Every other column is nullable on purpose; validate in the form, not in the
-- backstop.
--
-- Idempotent throughout: safe to re-run, and safe to run against a project
-- where some of this already exists by hand.

-- ── quote_requests ─────────────────────────────────────────────────────────
-- Written by: QuoteForm, ServiceLeadForm, ServiceHero, AreaHero,
--             app/special-offer, app/offer-sandbach  (all -> /api/send-quote
--             or /api/send-special-offer, then this table).
CREATE TABLE IF NOT EXISTS quote_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  phone             text NOT NULL,
  email             text,
  postcode          text,
  service_type      text,
  roof_type         text,
  message           text,
  -- Carried by ServiceHero, AreaHero and both offer forms. Not a column in the
  -- original DDL, and not a GHL field either — folded into the CRM note text.
  -- Without it here, those four inserts would be rejected for an unknown key
  -- and the backstop would stay broken for exactly the pages added last.
  same_day_callback boolean DEFAULT false,
  status            text DEFAULT 'pending',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Fold in 20260915000000 in case this runs on a project that somehow has an
-- older shape of the table.
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS roof_type text;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS same_day_callback boolean DEFAULT false;

-- ── contact_messages ───────────────────────────────────────────────────────
-- Written by: ContactForm, EnhancedContactSection -> /api/send-contact.
--
-- No `postcode` column, deliberately: ContactForm folds it into the message
-- body as "Postcode: CW11 4NE" and sends no separate field, so adding one here
-- would be a column nothing ever populates.
CREATE TABLE IF NOT EXISTS contact_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  phone          text,
  email          text,
  subject        text,
  message        text,
  roof_type      text,
  service_needed text,
  is_read        boolean DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS roof_type text;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS service_needed text;

COMMENT ON TABLE quote_requests IS
  'Browser-side lead backstop. Written by the client after a form submit, not by any API route, so it survives a GHL/SMTP outage. See 20260920120000.';
COMMENT ON TABLE contact_messages IS
  'Browser-side lead backstop for the contact form. See 20260920120000.';

-- ── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE quote_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- DROP-then-CREATE because CREATE POLICY has no IF NOT EXISTS. This is what
-- makes the migration re-runnable; without it a second run aborts on 42710.
--
-- The INSERT policy carries no TO clause, which means PUBLIC — i.e. it
-- includes `anon`. That is required, not an oversight: the write comes from the
-- browser holding the public anon key, so a policy scoped TO authenticated
-- would reject every legitimate submission. What that costs is stated in
-- .env.example — anyone holding the anon key can also insert here. It buys a
-- copy of the lead that a GHL outage cannot destroy, which is the trade this
-- table exists to make.
DROP POLICY IF EXISTS "Anyone can submit quote requests" ON quote_requests;
CREATE POLICY "Anyone can submit quote requests"
  ON quote_requests FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own quote requests" ON quote_requests;
CREATE POLICY "Users can view own quote requests"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can update quote requests" ON quote_requests;
CREATE POLICY "Authenticated users can update quote requests"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can submit contact messages" ON contact_messages;
CREATE POLICY "Anyone can submit contact messages"
  ON contact_messages FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view contact messages" ON contact_messages;
CREATE POLICY "Authenticated users can view contact messages"
  ON contact_messages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can update contact messages" ON contact_messages;
CREATE POLICY "Authenticated users can update contact messages"
  ON contact_messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Indexes ────────────────────────────────────────────────────────────────
-- IF NOT EXISTS, so this is a no-op on a project where an earlier partial
-- application already created them.
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_contact_messages_read ON contact_messages(is_read, created_at);
