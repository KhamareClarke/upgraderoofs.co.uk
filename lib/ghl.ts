/**
 * lib/ghl.ts
 *
 * Server-side GoHighLevel (GHL) v2 client for upgraderoofs.co.uk.
 * Pushes incoming form leads into GHL Contacts with campaign tags and
 * the captured gclid, so the sales pipeline and Google Ads offline
 * conversions stay in sync.
 *
 * Env (in .env.local):
 *   GHL_LOCATION_ID   location / sub-account id
 *   GHL_API_KEY       Private Integration token (location-scoped)
 *
 * All functions are non-throwing: a GHL outage must never lose a lead,
 * so failures are logged and swallowed (the caller still emails + saves).
 *
 * "Swallowed" means the LEAD survives, not that the failure is silent. Two
 * things here carry data that exists nowhere else — the contact note (the
 * customer's own enquiry text) and the contact itself — so when either fails
 * the outcome is recorded via lib/lead-health, where it is durable and
 * alertable rather than a console line on a rolling buffer.
 */

import { recordPipelineEvent } from '@/lib/lead-health';

const HOST = 'services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

export interface GhlLeadInput {
  name: string;
  email?: string;
  phone?: string;
  postcode?: string;
  /** Campaign tags to apply, e.g. ['google-ads-lead', 'cheshire-roof-quote']. */
  tags: string[];
  /** Click ID captured from the landing URL (Google Ads offline conversions). */
  gclid?: string;
  /** Free-text source label, e.g. 'quote_form', 'contact_form', 'special_offer'. */
  source?: string;
  /** Any extra context to drop into the contact's notes / custom fields. */
  notes?: string;
  customFields?: Record<string, string>;
}

function creds(): { locationId: string; token: string } | null {
  const locationId = (process.env.GHL_LOCATION_ID || '').trim();
  const token = (process.env.GHL_API_KEY || '').trim();
  if (!locationId || !token) return null;
  return { locationId, token };
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

async function ghlFetch(
  path: string,
  method: 'GET' | 'POST' | 'PUT',
  token: string,
  bodyObj?: unknown
): Promise<{ status: number; body: any }> {
  const body = bodyObj ? JSON.stringify(bodyObj) : undefined;
  const res = await fetch(`https://${HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: API_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
    cache: 'no-store',
  });
  const text = await res.text();
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: res.status, body: parsed };
}

/**
 * Upsert a lead into GHL Contacts. Uses POST /contacts/upsert which
 * dedupes on email/phone within the location, so repeat submissions
 * update the same contact rather than creating duplicates.
 *
 * Returns the GHL contact id on success, null on any failure.
 */
export async function pushLeadToGhl(input: GhlLeadInput): Promise<string | null> {
  const c = creds();
  if (!c) {
    console.warn('[ghl] skipped — GHL_LOCATION_ID / GHL_API_KEY not set');
    return null;
  }

  const { firstName, lastName } = splitName(input.name);

  // gclid is a NATIVE GHL contact field (contact.gclid) — send it top-level,
  // NOT inside customFields (GHL rejects a custom field named 'gclid').
  //
  // Remaining custom fields must reference their account-specific field IDs in
  // a `customFields: [{id, value}]` array. IDs are configurable via env since
  // they differ per GHL location (created once per account).
  const CUSTOM_FIELD_IDS: Record<string, string | undefined> = {
    gclid: process.env.GHL_CF_GCLID, // readable copy (native gclid is write-only)
    postcode: process.env.GHL_CF_POSTCODE,
    service_type: process.env.GHL_CF_SERVICE_TYPE,
    roof_type: process.env.GHL_CF_ROOF_TYPE,
    service_needed: process.env.GHL_CF_SERVICE_NEEDED,
  };
  const customFieldsArr: Array<{ id: string; value: string }> = [];
  const extra = { ...(input.customFields || {}) };
  if (input.postcode) extra['postcode'] = input.postcode;
  if (input.gclid) extra['gclid'] = input.gclid; // readable custom-field copy
  for (const [key, value] of Object.entries(extra)) {
    const id = CUSTOM_FIELD_IDS[key];
    if (id && value != null && value !== '') customFieldsArr.push({ id, value: String(value) });
  }

  const payload: Record<string, unknown> = {
    locationId: c.locationId,
    firstName,
    lastName,
    name: input.name,
    email: input.email,
    phone: input.phone,
    postalCode: input.postcode,
    tags: input.tags,
    source: input.source || 'website',
  };
  if (input.gclid) payload['gclid'] = input.gclid;
  if (customFieldsArr.length) payload['customFields'] = customFieldsArr;
  // NOTE: 'notes' is NOT accepted by /contacts/upsert (422). Notes are added
  // via the separate contact-notes endpoint after upsert — see below.

  try {
    const res = await ghlFetch('/contacts/upsert', 'POST', c.token, payload);
    if (res.status !== 200 && res.status !== 201) {
      // Detailed diagnostics — a rejected upsert (401/422/etc.) must be loud in
      // the terminal so a lead-capture break is visible during form testing.
      console.error(`[ghl] ❌ CONTACT UPSERT REJECTED — HTTP ${res.status}`);
      console.error(`[ghl]    locationId : ${c.locationId}`);
      console.error(`[ghl]    lead       : name="${input.name}" phone="${input.phone || ''}" email="${input.email || ''}" postcode="${input.postcode || ''}"`);
      console.error(`[ghl]    response   : ${JSON.stringify(res.body)}`);
      if (res.status === 401 || res.status === 403) {
        console.error('[ghl]    hint       : auth failed — check GHL_API_KEY (Private Integration token) and that it is scoped to this location.');
      } else if (res.status === 422) {
        console.error('[ghl]    hint       : validation failed — a field in the payload is malformed (often a customFields id or an unexpected property).');
      }
      return null;
    }
    const contact = res.body.contact || res.body;
    const id = contact.id || contact.contactId || null;
    console.log(`[ghl] lead upserted → contact ${id} (tags: ${input.tags.join(', ')})`);

    // Attach the lead context as a contact note (separate endpoint — upsert
    // rejects a 'notes' property).
    //
    // THIS IS THE ONLY PATH THE ENQUIRY TEXT TAKES INTO GHL. The `notes` string
    // built by the lead routes carries the customer's own words; nothing else
    // does. If this write is lost the contact still appears — name, phone, tags,
    // gclid — so it reads as a perfectly healthy lead whose message is simply
    // absent, which is indistinguishable from a customer who wrote nothing.
    //
    // It used to be fire-and-forget, with failures downgraded to console.warn
    // and a comment calling them "harmless". They are not: the enquiry text has
    // no second carrier, and none of the other legs (upsert, SMTP, SMS, the
    // health endpoint) can tell a dropped note from a written one. A real lead's
    // message was lost exactly this way and nothing anywhere recorded it.
    //
    // So: awaited, and its outcome recorded. Awaited for the same reason as the
    // fleet-ingest and SMS calls — Vercel freezes the invocation once the
    // response is returned, killing any fetch still in flight.
    //
    // A failed note still does NOT fail the lead. The contact exists and is
    // worth keeping; only the loss is now visible.
    if (id && input.notes) {
      const noteSource = input.source || 'website';
      const noteStartedAt = Date.now();
      try {
        const noteRes = await ghlFetch(
          `/contacts/${encodeURIComponent(id)}/notes`,
          'POST',
          c.token,
          // `body` is the only required field on this endpoint; `userId` is
          // optional (author attribution). This previously sent
          // `userId: undefined`, which JSON.stringify drops — so the wire
          // payload was already body-only, but the code implied an author was
          // being set. Removed rather than supplied: a real userId would cost an
          // extra API round trip per lead for attribution GHL already defaults
          // to the token owner.
          { body: input.notes },
        );
        const durationMs = Date.now() - noteStartedAt;
        if (noteRes.status !== 200 && noteRes.status !== 201) {
          console.error(`[ghl] ❌ NOTE WRITE REJECTED — HTTP ${noteRes.status} (contact ${id}) — the lead's message did NOT reach the CRM`);
          console.error(`[ghl]    response   : ${JSON.stringify(noteRes.body)}`);
          // Awaited: this record is the whole point of the fix, and an
          // un-awaited write is exactly what Vercel's freeze kills. Safe to
          // await because recordPipelineEvent never throws.
          await recordPipelineEvent({
            source: noteSource,
            channel: 'ghl-note',
            ok: false,
            detail: `note-write-failed http=${noteRes.status}`,
            durationMs,
          });
        } else {
          await recordPipelineEvent({ source: noteSource, channel: 'ghl-note', ok: true, durationMs });
        }
      } catch (err) {
        // Transport failure — DNS, timeout, fetch threw. Distinct from the HTTP
        // rejection above, and the more dangerous of the two: an un-awaited
        // fetch killed by the freeze lands here as a rejection, never as a
        // response, so this branch is where the original bug would have surfaced.
        console.error('[ghl] ❌ NOTE WRITE FAILED (exception) — the lead\'s message did NOT reach the CRM');
        console.error(`[ghl]    contact    : ${id}`);
        console.error('[ghl]    error      :', err instanceof Error ? (err.stack || err.message) : err);
        await recordPipelineEvent({
          source: noteSource,
          channel: 'ghl-note',
          ok: false,
          detail: 'note-write-failed transport',
          durationMs: Date.now() - noteStartedAt,
        });
      }
    }
    return id;
  } catch (err) {
    // Network/transport failure (DNS, timeout, fetch threw) — distinct from an
    // HTTP rejection above. Log the full error so the cause is diagnosable.
    console.error('[ghl] ❌ CONTACT UPSERT FAILED (exception)');
    console.error(`[ghl]    locationId : ${c.locationId}`);
    console.error(`[ghl]    lead       : name="${input.name}" phone="${input.phone || ''}" email="${input.email || ''}"`);
    console.error('[ghl]    error      :', err instanceof Error ? (err.stack || err.message) : err);
    return null;
  }
}

/** A single Google review, normalized to the shape the homepage cards render. */
export interface GhlGoogleReview {
  id: string | null;
  reviewer: string;
  comment: string | null;
  starValue: number | null;
  createTime: string | null;
  ownerReply: string | null;
}

/**
 * Fetch Google reviews for the location via GHL's Reviews API.
 *
 * GHL mirrors Google (and Facebook) reviews once the "Reviews" integration is
 * connected to the location; they surface through `GET /reviews/` with the same
 * location-scoped token used everywhere else. GHL does not expose the aggregate
 * average/count through this endpoint, so callers combine list + local average.
 *
 * Endpoint: GET https://services.leadconnectorhq.com/reviews/?locationId={id}
 * Auth:     Bearer <GHL_API_KEY>, Version: 2021-07-28 (via ghlFetch).
 * Returns:  `reviews` array of `{ id, title, comment, rating, name, source,
 *           productName, createdAt, updatedAt }` (source = 'google' | 'facebook'
 *           | 'reviews_campaign').
 *
 * Non-throwing: a GHL outage or disconnect must never crash the page — failures
 * are logged and an empty list is returned so the caller degrades gracefully.
 */
export async function getGoogleReviews(limit = 5): Promise<GhlGoogleReview[]> {
  const c = creds();
  if (!c) {
    console.warn('[ghl] getGoogleReviews skipped — GHL_LOCATION_ID / GHL_API_KEY not set');
    return [];
  }
  try {
    const res = await ghlFetch(
      `/reviews/?locationId=${encodeURIComponent(c.locationId)}&limit=${limit}`,
      'GET',
      c.token,
    );
    if (res.status !== 200) {
      console.warn(`[ghl] getGoogleReviews returned HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`);
      return [];
    }
    const all = Array.isArray(res.body?.reviews) ? res.body.reviews : [];
    return all
      .filter((r: any) => {
        const src = (r.source || '').toLowerCase();
        return src === 'google' || src === 'reviews_campaign' || !src;
      })
      .slice(0, limit)
      .map((r: any) => {
        const rating = Number(r.rating ?? r.starRating);
        return {
          id: r.id || null,
          reviewer: r.name || 'Anonymous',
          comment: r.comment || null,
          starValue: Number.isFinite(rating) ? rating : null,
          createTime: r.createdAt || r.updatedAt || null,
          ownerReply: r.ownerReply || null,
        };
      });
  } catch (err) {
    console.error('[ghl] getGoogleReviews failed:', err instanceof Error ? (err.stack || err.message) : err);
    return [];
  }
}

/**
 * Fetch pipelines + stages for the location. Used by the webhook to map
 * stage ids → names so it can react to "Job Won" / "Site Visit Booked".
 */
export async function getPipelines(): Promise<Array<{ id: string; name: string; stages: Array<{ id: string; name: string }> }>> {
  const c = creds();
  if (!c) return [];
  try {
    const res = await ghlFetch(`/opportunities/pipelines?locationId=${encodeURIComponent(c.locationId)}`, 'GET', c.token);
    if (res.status !== 200) return [];
    return res.body.pipelines || [];
  } catch {
    return [];
  }
}
