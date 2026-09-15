-- Migration: add the lead-detail columns the frontend already writes
--
-- MISMATCH THIS FIXES
-- -------------------
-- These client components insert directly into Supabase from the browser:
--
--   ContactForm.tsx:55 / EnhancedContactSection.tsx:64  -> contact_messages
--     { name, email, phone, subject, message, roof_type, service_needed }
--
--   QuoteForm.tsx:38 / ServiceLeadForm.tsx:41           -> quote_requests
--     { name, email, phone, postcode, service_type, message, roof_type }
--
-- Nothing writes via an API route; the route only calls GHL + SMTP. So these
-- inserts are the *only* copy of a lead that survives a GHL or mail outage.
--
-- No migration ever created `roof_type` (either table) or `service_needed`
-- (contact_messages), even though lib/supabase.ts has always declared those
-- fields on the QuoteRequest and ContactMessage types.
--
-- WHY IT FAILED SILENTLY
-- ----------------------
-- PostgREST rejects a payload containing a column it doesn't know (PGRST204),
-- and supabase-js RESOLVES with `{ data: null, error }` rather than throwing.
-- So the surrounding `try { ... } catch { console.warn(...) }` never fired: the
-- result was awaited and discarded, leaving no trace in the browser console,
-- the server logs, or any table.
--
-- Net effect: any submission where the customer actually selected a roof type
-- (or, on the contact form, a service) failed to persist — the backstop was
-- least reliable precisely on the most detailed leads.
--
-- NOTE: `postcode` is deliberately NOT added to contact_messages. ContactForm
-- folds it into the message body as "Postcode: CW11 4NE" (see ContactForm.tsx),
-- so there is no postcode field in that payload to store.

ALTER TABLE quote_requests   ADD COLUMN IF NOT EXISTS roof_type text;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS roof_type text;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS service_needed text;

COMMENT ON COLUMN quote_requests.roof_type      IS 'Roof type selected on the quote/lead wizard (optional).';
COMMENT ON COLUMN contact_messages.roof_type    IS 'Roof type selected on the contact wizard (optional).';
COMMENT ON COLUMN contact_messages.service_needed IS 'Service category selected on the contact wizard (optional).';
