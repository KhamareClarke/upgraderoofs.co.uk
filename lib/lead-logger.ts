/**
 * Local lead audit logger.
 *
 * Appends a single structured record per accepted lead to a local JSON-lines
 * audit file. This is a deliberately minimal, side-effect-only observability
 * helper — it never blocks or fails the primary lead pipeline (GHL/email
 * dispatch). Every filesystem operation is wrapped so a disk write error (full
 * disk, read-only FS on serverless, missing dir) is swallowed and logged, never
 * thrown or returned to the caller.
 *
 * Format is newline-delimited JSON (JSONL), one object per line, so the file is
 * append-only and safe against concurrency without in-process locking. Each
 * record is self-contained: timestamp, source route, contact fields, and the
 * captured gclid (raw, never transformed) for offline-conversion auditing.
 *
 * THIS FILE IS NOT DURABLE IN PRODUCTION — READ BEFORE RELYING ON IT
 * ------------------------------------------------------------------
 * Vercel's serverless filesystem is read-only apart from /tmp, and /tmp is
 * per-instance and discarded. So in production every append below throws
 * EROFS/ENOENT, is caught, and degrades to a console warning: the audit file
 * simply never exists. It is useful locally and useless deployed, and the
 * "never fails the lead" contract in the paragraph above means it fails
 * *silently* — which is why this comment exists rather than a promise.
 *
 * The durable equivalent is `lead_pipeline_events` (lib/lead-health.ts), which
 * records per-channel outcomes in Supabase. This module stays as the local
 * development aid it always effectively was; do not treat it as a backup of a
 * lead. Note also that it writes PII to disk, so it is deliberately NOT wired
 * into the health table, which is PII-free.
 */
import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.join(process.cwd(), 'data');
const AUDIT_FILE = path.join(AUDIT_DIR, 'leads-audit.jsonl');

/**
 * Whether the "this filesystem is not writable" warning has been emitted.
 *
 * Without this guard the degradation warning fires on every single submission
 * and buries the rest of the log — which is how a broken audit trail stays
 * invisible. One line, once per process, is enough to notice.
 */
let unwritableWarned = false;

export interface LeadSubmissionLog {
  timestamp: string;
  route: string;
  name?: string;
  phone?: string;
  email?: string;
  postcode?: string;
  service?: string;
  gclid?: string | null;
}

/**
 * Append one lead record to the local audit file.
 *
 * @param route  The source API route label (e.g. "send-quote").
 * @param payload The validated lead fields. Only the known audit fields are
 *                copied out; anything else is ignored so we never persist
 *                honeypot/turnstile/token values.
 *
 * @returns void — never throws.
 */
export function logLeadSubmission(route: string, payload: Record<string, unknown>): void {
  try {
    const record: LeadSubmissionLog = {
      timestamp: new Date().toISOString(),
      route,
      name: asString(payload.name),
      phone: asString(payload.phone),
      email: asString(payload.email),
      postcode: asString(payload.postcode),
      service: asString(payload.service_type ?? payload.service_needed ?? payload.serviceNeeded ?? payload.roof_type ?? payload.roofType),
      gclid: asString(payload.gclid),
    };

    fs.mkdirSync(AUDIT_DIR, { recursive: true });
    fs.appendFileSync(AUDIT_FILE, JSON.stringify(record) + '\n', 'utf8');
  } catch (err) {
    // Disk write failure must never break the lead response path.
    if (!unwritableWarned) {
      unwritableWarned = true;
      console.warn(
        '[lead-audit] DISABLED — this filesystem is not writable (expected on Vercel). ' +
          'The local audit file is a development aid only; it does not exist in production. ' +
          'Durable pipeline history lives in lead_pipeline_events (lib/lead-health.ts). ' +
          `First error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

/** Coerce an unknown value to a trimmed string, or undefined if it has no text. */
function asString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}
