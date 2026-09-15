/**
 * lib/lead-health.ts
 *
 * Durable outcome log for the lead pipeline, plus the staleness check that turns
 * it into an alert.
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * Every failure path in the lead pipeline is already handled — nothing throws,
 * leads are never lost to an exception. But "handled" was implemented as
 * "caught and logged to stdout", and stdout on Vercel is a rolling buffer nobody
 * reads. When the spam filter began discarding every lead carrying an email
 * address, the only signal was a `console.log` line per submission, and the
 * outage ran for 19 days before a human noticed the leads had stopped.
 *
 * Handled-but-silent is the dangerous state: it looks identical to "no leads
 * today". This module records what actually happened, durably, so that state
 * becomes distinguishable from a quiet day.
 *
 * TWO INDEPENDENT SINKS
 * ---------------------
 *   1. Supabase row (`lead_pipeline_events`) — queryable, so the health check
 *      can answer "when did each channel last succeed?". Requires the migration
 *      in supabase/migrations; degrades to a no-op when unconfigured.
 *   2. Fleet-ingest event — pushed to the owner's JARVIS hub on every FAILURE.
 *      Already wired for this project and needs no schema, so failures are
 *      visible today even if (1) was never set up.
 *
 * NEITHER SINK MAY BREAK A LEAD. Every operation here is wrapped and returns
 * void; a failure to record is itself logged once and then ignored. This module
 * is observability, and observability must never be load-bearing.
 *
 * `detail` IS NEVER ALLOWED TO CARRY PII. It holds route labels, HTTP statuses
 * and short failure reasons. Never a name, phone, email or message body — the
 * rows are readable by the health endpoint, which is not authenticated.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { emitFleetIngest } from '@/lib/fleet-ingest';

const TABLE = 'lead_pipeline_events';

/** How long a channel may go without a success before it counts as broken. */
const MAX_SILENCE_DAYS = Number(process.env.LEAD_HEALTH_MAX_SILENCE_DAYS || 3);

/** Upper bound on rows pulled into a single health computation. */
const MAX_ROWS = 2000;

/**
 * The independent legs of the pipeline. Each is recorded separately because they
 * fail independently — a GHL outage leaves SMTP working, and the SMS notifier
 * can be broken while both CRM and email are fine.
 */
export type PipelineChannel =
  | 'ghl' // lead upserted into GoHighLevel
  | 'ghl-note' // the lead's enquiry text attached to the contact as a note
  | 'email' // lead emailed via SMTP
  | 'sms' // owner-notification SMS dispatched
  | 'fleet' // JARVIS ingest accepted
  | 'supabase' // browser-side Supabase insert
  | 'filter'; // submission rejected before any sink (spam/validation)

/**
 * `ghl-note` is deliberately separate from `ghl` rather than folded into it.
 *
 * They are two different HTTP calls against two different endpoints, and they
 * fail independently: the upsert carries the contact (name, phone, tags, gclid),
 * the note carries the customer's own words. A contact with no note is the more
 * deceptive failure of the two — it looks like a complete lead — so it needs to
 * be countable on its own. Folding note successes into `ghl` would also
 * double-count every healthy lead in `accepted`, since one lead produces one
 * success on each channel.
 */

export interface PipelineEvent {
  /** Route label, e.g. "send-quote". Safe to store. */
  source: string;
  channel: PipelineChannel;
  ok: boolean;
  /** Short, PII-free reason. See the header note. */
  detail?: string;
  durationMs?: number;
}

let cachedClient: SupabaseClient | null | undefined;
const warned = new Set<string>();

/** Log a warning at most once per process per key. */
function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

/**
 * Supabase client for the health table, or null when the store is not
 * configured. Prefers a service-role key so the write path does not depend on
 * the permissive RLS policy the migration creates for the anon key.
 */
function getStore(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  // Non-public names first. NEXT_PUBLIC_* is INLINED AT BUILD TIME, so a
  // deployment that reads only those cannot be repointed by changing a Vercel
  // env var — it would need a rebuild. It also means reading NEXT_PUBLIC_* here
  // would bake the store location into the client bundle for no benefit, since
  // this module only ever runs on the server.
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!url || !key) {
    cachedClient = null;
    warnOnce(
      'no-store',
      '[lead-health] no Supabase credentials — lead pipeline outcomes are NOT being ' +
        'recorded, so /api/health/lead-pipeline cannot detect a silent outage. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (or ' +
        'SUPABASE_SERVICE_ROLE_KEY) and run the lead_pipeline_events migration. ' +
        'Failure alerts via fleet-ingest still fire.',
    );
    return cachedClient;
  }

  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

/**
 * Record one pipeline outcome. Never throws, never rejects, never blocks a lead.
 *
 * On failure it also pushes a fleet-ingest alert, so a broken sink surfaces in
 * the owner's hub rather than only in a log file.
 */
export async function recordPipelineEvent(event: PipelineEvent): Promise<void> {
  try {
    if (!event.ok) {
      // Independent of the durable store: a failure is news the moment it
      // happens, and the hub is already receiving lead events from this project.
      void emitFleetIngest({
        event_type: 'lead_pipeline_failure',
        summary: `Lead pipeline ${event.channel} failed in ${event.source}${event.detail ? ` — ${event.detail}` : ''}`,
        payload: {
          source: event.source,
          channel: event.channel,
          detail: event.detail ?? null,
          duration_ms: event.durationMs ?? null,
        },
      });
    }

    const store = getStore();
    if (!store) return;

    const { error } = await store.from(TABLE).insert({
      source: event.source,
      channel: event.channel,
      ok: event.ok,
      detail: event.detail ? event.detail.slice(0, 500) : null,
      duration_ms: event.durationMs ?? null,
    });

    if (error) throw new Error(error.message);
  } catch (err) {
    warnOnce(
      'write-failed',
      `[lead-health] could not record ${event.channel}/${event.ok ? 'ok' : 'fail'}: ` +
        (err instanceof Error ? err.message : String(err)),
    );
  }
}

/**
 * Record a lead that was rejected before it reached any sink.
 *
 * These are the dangerous ones. Every rejection branch in the lead routes
 * returns a decoy `200 {success:true}` so bots cannot tell they were filtered —
 * which means a filter that is too strict is indistinguishable from a quiet day
 * from the outside. That is exactly how a bad TLD regex discarded 19 days of
 * leads while every response said "Quote request received".
 *
 * Logged at ERROR level, not info, with a stable `[lead-dropped]` prefix so a
 * Vercel log drain (or any log-search alert) can key on the volume of this line
 * without parsing route-specific prose.
 *
 * @param source      route label, e.g. "send-quote"
 * @param reason      short cause stored durably — MUST NOT contain PII
 * @param logContext  extra text for the console line ONLY (names/phones are fine
 *                    here; they never reach the database). Omit if not needed.
 */
export function recordSilentDrop(source: string, reason: string, logContext?: string): void {
  console.error(
    `[lead-dropped] ${source} — ${reason}${logContext ? ` — ${logContext}` : ''}`,
  );
  void recordPipelineEvent({ source, channel: 'filter', ok: false, detail: reason });
}

export interface ChannelHealth {
  channel: PipelineChannel;
  lastSuccess: string | null;
  lastFailure: string | null;
  successesInWindow: number;
  failuresInWindow: number;
}

export interface PipelineHealth {
  /** "unavailable" means no durable store — treat the report as inconclusive. */
  store: 'ok' | 'unavailable';
  healthy: boolean;
  windowDays: number;
  checkedAt: string;
  /** Human-readable problems. Empty when healthy. */
  alerts: string[];
  channels: ChannelHealth[];
}

interface EventRow {
  channel: string;
  ok: boolean;
  created_at: string;
}

/**
 * Compute pipeline health from the durable event log.
 *
 * Emits an alert when any of:
 *   - no lead has been accepted at all in the window (the intake is broken —
 *     the exact signature of the 19-day spam-filter outage),
 *   - leads ARE being accepted but the SMS channel has not succeeded in the
 *     window (the notifier is silently broken), or
 *   - a contact note failed to write (the lead was captured but the customer's
 *     enquiry text is missing from the CRM — see lib/ghl.ts).
 *
 * Returns `store: 'unavailable'` rather than a false "healthy" when there is no
 * durable store, because "I cannot tell" must not render as "all fine".
 */
export async function getLeadPipelineHealth(): Promise<PipelineHealth> {
  const checkedAt = new Date().toISOString();
  const base: PipelineHealth = {
    store: 'ok',
    healthy: true,
    windowDays: MAX_SILENCE_DAYS,
    checkedAt,
    alerts: [],
    channels: [],
  };

  const store = getStore();
  if (!store) {
    return {
      ...base,
      store: 'unavailable',
      healthy: false,
      alerts: [
        'No durable store configured — cannot tell whether the lead pipeline is working. ' +
          'Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY and run the ' +
          'lead_pipeline_events migration.',
      ],
    };
  }

  const since = new Date(Date.now() - MAX_SILENCE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let rows: EventRow[];
  try {
    const { data, error } = await store
      .from(TABLE)
      .select('channel, ok, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS);
    if (error) throw new Error(error.message);
    rows = (data || []) as EventRow[];
  } catch (err) {
    return {
      ...base,
      store: 'unavailable',
      healthy: false,
      alerts: [
        `Could not read ${TABLE}: ${err instanceof Error ? err.message : String(err)}. ` +
          'If the table is missing, run the lead_pipeline_events migration.',
      ],
    };
  }

  // ── Aggregate per channel ────────────────────────────────────────────────
  const byChannel = new Map<string, ChannelHealth>();
  for (const row of rows) {
    let entry = byChannel.get(row.channel);
    if (!entry) {
      entry = {
        channel: row.channel as PipelineChannel,
        lastSuccess: null,
        lastFailure: null,
        successesInWindow: 0,
        failuresInWindow: 0,
      };
      byChannel.set(row.channel, entry);
    }
    if (row.ok) {
      entry.successesInWindow += 1;
      // Rows arrive newest-first, so the first one seen is the most recent.
      if (!entry.lastSuccess) entry.lastSuccess = row.created_at;
    } else {
      entry.failuresInWindow += 1;
      if (!entry.lastFailure) entry.lastFailure = row.created_at;
    }
  }

  // Array.from rather than spread — the project's tsconfig target does not
  // enable downlevelIteration, so spreading a Map iterator fails to compile.
  const channels = Array.from(byChannel.values());
  const alerts: string[] = [];

  const accepted =
    (byChannel.get('ghl')?.successesInWindow || 0) +
    (byChannel.get('email')?.successesInWindow || 0);
  const smsSuccesses = byChannel.get('sms')?.successesInWindow || 0;
  const smsFailures = byChannel.get('sms')?.failuresInWindow || 0;

  // Intake is broken: the site is up but nothing is landing. This is the
  // silent-drop signature that ran undetected for 19 days.
  if (accepted === 0) {
    alerts.push(
      `No lead has been captured in ${MAX_SILENCE_DAYS} day(s). Either there was genuinely ` +
        'no traffic, or leads are being silently dropped before reaching GHL/SMTP — ' +
        'check for rejections in the lead routes.',
    );
  }

  // Notifier is broken: leads are flowing but the owner is not being told.
  if (accepted > 0 && smsSuccesses === 0) {
    alerts.push(
      `SMS owner notification has not succeeded in ${MAX_SILENCE_DAYS} day(s) despite ` +
        `${accepted} accepted lead(s)${smsFailures ? ` and ${smsFailures} recorded failure(s)` : ''}. ` +
        'Check SMS_SENDER_PHONE is provisioned in SMS_LOCATION_ID — see lib/sms-notify.ts.',
    );
  }

  // Enquiry text is being lost: contacts are landing, their notes are not.
  //
  // Keyed on the MOST RECENT note outcome rather than a count within the window.
  // A count would keep this endpoint red for the full window after a single
  // transient blip had already been recovered from, and the caller is asking
  // about the pipeline's CURRENT state. Every individual failure still raises its
  // own fleet alert at the moment it happens, and leaves its own durable row, so
  // nothing is lost by not re-reporting history here.
  const note = byChannel.get('ghl-note');
  const asTime = (iso: string | null): number => (iso ? Date.parse(iso) : 0);
  const noteIsCurrentlyFailing =
    !!note?.lastFailure && asTime(note.lastFailure) > asTime(note.lastSuccess);
  if (noteIsCurrentlyFailing) {
    alerts.push(
      'The most recent contact note write FAILED — recent leads were captured but their ' +
        'enquiry messages are NOT in the CRM. The contacts look complete and are not. ' +
        'See pushLeadToGhl in lib/ghl.ts.',
    );
  }

  return {
    store: 'ok',
    healthy: alerts.length === 0,
    windowDays: MAX_SILENCE_DAYS,
    checkedAt,
    alerts,
    channels,
  };
}
