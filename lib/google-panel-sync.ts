import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * lib/google-panel-sync.ts
 *
 * Durable storage for the two dashboard panels that come from Google — Ads and
 * GA4 — plus the lock that stops a page load from spending API quota.
 *
 * ── Why this module holds no reader logic ───────────────────────────────────
 *
 * It deliberately imports nothing from lib/dashboard-data.ts, which imports IT.
 * Keeping the storage primitives dependency-free is what lets the dashboard read
 * a snapshot and the cron write one without the two modules forming a cycle.
 * Callers pass in the function that produces the payload.
 *
 * ── The three states a row can be in ────────────────────────────────────────
 *
 *   payload NULL, captured_at NULL, last_error NULL   claimed, read in flight
 *   payload NULL, captured_at NULL, last_error set    the read failed
 *   payload set,  captured_at set                     usable
 *
 * `claimed_at` is set BEFORE the Google read, not after. That ordering is the
 * whole rate limiter: a refresh that crashes or fails still holds the row for a
 * full TTL, so a broken credential cannot turn every page load into another
 * attempt against a quota that is already exhausted. Set it afterwards and the
 * failure mode is a retry storm, which is precisely the incident this table
 * exists to prevent.
 *
 * ── What the caller has to check ────────────────────────────────────────────
 *
 * A snapshot is only usable for the window it was captured for. `readLatestSnapshot`
 * returns the row's own window and the caller must compare it with the window it
 * is rendering — a panel read over yesterday's thirty days cannot be summed into
 * today's lead total. This module cannot make that judgement; it only preserves
 * the information needed to make it.
 */

export const SNAPSHOT_TABLE = 'google_panel_snapshots';

/**
 * How long a snapshot is trusted before a page load may refresh it.
 *
 * Three hours. With the daily cron and the window rollover, that bounds the
 * system at ten Google runs a day — 110 Ads operations against a 2,880/day
 * ceiling on the developer token's Explorer access. The number is not a
 * freshness target: Google Ads revises conversions for days, GA4 for a day or
 * two, and the listing data settles five days behind, so the figures being
 * cached are the ones that lag anyway.
 */
export const SNAPSHOT_TTL_MS = 3 * 60 * 60_000;

export type PanelSource = 'ads' | 'clicks';

export const PANEL_SOURCES: readonly PanelSource[] = ['ads', 'clicks'];

/** Structural twin of the readers' `ComparisonWindow`, to avoid the import. */
export interface SnapshotWindow {
  from: string;
  to: string;
}

export interface Snapshot<T> {
  payload: T;
  /** The window the payload was captured for — NOT necessarily the one wanted. */
  window: SnapshotWindow;
  /** When the payload was read from Google. Never null on a returned snapshot. */
  capturedAt: string;
  lastError: string | null;
}

/**
 * Does this PostgREST error mean the table is not there?
 *
 * Worth its own function because the answer decides between "show the figures"
 * and "name the migration to run", and because the codes are not guessable:
 * `42P01` is Postgres' undefined_table, while `PGRST205` is PostgREST failing to
 * find the table in its schema cache — which is what an unapplied migration
 * actually returns here. A message check backs both up, since a schema-cache miss
 * after a fresh migration looks like neither code.
 */
export function isMissingTableError(message: string | null | undefined): boolean {
  if (!message) return false;
  return (
    message.includes('PGRST205') ||
    message.includes('42P01') ||
    /schema cache/i.test(message) ||
    /relation .* does not exist/i.test(message) ||
    /could not find the table/i.test(message)
  );
}

/** The newest row for a source that actually carries figures, or null. */
export async function readLatestSnapshot<T>(
  store: SupabaseClient,
  source: PanelSource,
): Promise<Snapshot<T> | null> {
  const { data, error } = await store
    .from(SNAPSHOT_TABLE)
    .select('payload, window_from, window_to, captured_at, last_error')
    .eq('source', source)
    .not('payload', 'is', null)
    .not('captured_at', 'is', null)
    .order('window_to', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    payload: data.payload as T,
    window: { from: String(data.window_from), to: String(data.window_to) },
    capturedAt: String(data.captured_at),
    lastError: data.last_error ? String(data.last_error) : null,
  };
}

export interface ClaimOptions {
  /**
   * Claim regardless of the TTL. The daily cron uses this so a day always gets
   * at least one real read; the on-demand path never does.
   */
  force?: boolean;
}

/**
 * Claim the right to refresh this (source, window). True means "you won — call
 * Google"; false means someone else holds it and the caller must serve what is
 * stored instead.
 *
 * Two statements, both atomic, and neither is a read-then-write:
 *
 *   1. `insert … on conflict do nothing` — and if it inserted, YOU WON, because
 *      the row did not exist a moment ago and a new window is always worth
 *      reading. Returning early here is not an optimisation: the row's
 *      `claimed_at` default is `now()`, so falling through to step 2 would
 *      immediately fail the age test and refuse to ever refresh a new window.
 *      That is the failure this branch exists to prevent, and it would have been
 *      invisible — the dashboard would simply have shown no Ads data, for ever,
 *      with a fresh row sitting in the table looking like a successful claim.
 *   2. `update … where claimed_at < cutoff` is the lock for a row that already
 *      exists. Postgres re-evaluates that predicate against the row version it
 *      locks, so of N concurrent updates exactly one sees a stale `claimed_at`
 *      and returns a row.
 */
export async function claimSnapshot(
  store: SupabaseClient,
  source: PanelSource,
  window: SnapshotWindow,
  now: Date,
  options: ClaimOptions = {},
): Promise<boolean> {
  // `.select()` on an `ignoreDuplicates` upsert returns the rows that were
  // actually inserted — a conflict returns nothing, which is how the two
  // outcomes are told apart without a second query.
  const { data: inserted, error: insertError } = await store
    .from(SNAPSHOT_TABLE)
    .upsert(
      { source, window_from: window.from, window_to: window.to },
      { onConflict: 'source,window_from,window_to', ignoreDuplicates: true },
    )
    .select('source');
  if (insertError) throw new Error(insertError.message);
  if (Array.isArray(inserted) && inserted.length > 0) return true;

  const cutoff = new Date(now.getTime() - SNAPSHOT_TTL_MS).toISOString();

  let query = store
    .from(SNAPSHOT_TABLE)
    .update({ claimed_at: now.toISOString() })
    .eq('source', source)
    .eq('window_from', window.from)
    .eq('window_to', window.to);

  // A forced claim skips the age test only. It still goes through an UPDATE so
  // `claimed_at` moves — otherwise the cron would refresh and the very next page
  // load would immediately refresh again on top of it.
  if (!options.force) query = query.lt('claimed_at', cutoff);

  const { data, error } = await query.select('source');
  if (error) throw new Error(error.message);

  return Array.isArray(data) && data.length > 0;
}

/** Store a successful read. Clears any previous failure. */
export async function writeSnapshot<T>(
  store: SupabaseClient,
  source: PanelSource,
  window: SnapshotWindow,
  payload: T,
  now: Date,
): Promise<void> {
  const { error } = await store
    .from(SNAPSHOT_TABLE)
    .update({
      payload: payload as unknown as Record<string, unknown>,
      captured_at: now.toISOString(),
      last_error: null,
    })
    .eq('source', source)
    .eq('window_from', window.from)
    .eq('window_to', window.to);

  if (error) throw new Error(error.message);
}

/**
 * Record a failed read. `claimed_at` is deliberately NOT touched — it was set by
 * the claim, and leaving it is what holds the TTL so the next page load does not
 * retry immediately.
 */
export async function writeSnapshotError(
  store: SupabaseClient,
  source: PanelSource,
  window: SnapshotWindow,
  message: string,
): Promise<void> {
  const { error } = await store
    .from(SNAPSHOT_TABLE)
    .update({ last_error: message.slice(0, 500) })
    .eq('source', source)
    .eq('window_from', window.from)
    .eq('window_to', window.to);

  if (error) throw new Error(error.message);
}
