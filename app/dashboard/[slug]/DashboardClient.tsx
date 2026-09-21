'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Inbox,
  MapPin,
  MessageCircle,
  MousePointerClick,
  Phone,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';

import type {
  AdsConversionFigures,
  DashboardData,
  FeedEvent,
  LeadPeriod,
  LeadTapSources,
} from '@/lib/dashboard-data';

/**
 * components/DashboardClient.tsx (route-private)
 *
 * The whole dashboard UI. Fetches /api/dashboard/[slug] and renders it.
 *
 * ── Why the data is fetched in the browser rather than server-rendered ───────
 *
 * Three reasons, in order of weight:
 *
 *   1. It must refresh without a reload. A dashboard Marcus leaves open on his
 *      home screen should show the lead that came in ten minutes ago, and a
 *      server-rendered page would need a full navigation to do that.
 *   2. `Cache-Control: no-store` on the API is only meaningful if the browser is
 *      the thing fetching. A server component would put the same figures into
 *      the RSC flight payload, which Vercel may cache at the edge.
 *   3. Every timestamp is formatted client-side, so there is no server/client
 *      locale mismatch to hydrate around — the first paint is a skeleton.
 *
 * ── Nothing here is trusted to be present ───────────────────────────────────
 *
 * Every figure has an unavailable state, because the honest failure modes are
 * real: GBP stops being pulled, the Ads refresh token expires or its quota runs
 * out, the service-role key is Production-only (so Preview renders empty by
 * design). A dashboard that shows a confident zero when it means "I could not
 * read this" is the exact failure this codebase has been bitten by — see the
 * 19-day silent lead outage. So a zero always competes with a note explaining it.
 *
 * ── ONE LIST, ONE TOTAL ─────────────────────────────────────────────────────
 *
 * Every figure that the lead total is made of appears EXACTLY ONCE on this page,
 * in `LeadBreakdown`. It used to appear two and three times over: the same form
 * leads as a headline, again as a CRM/Inbox pair, again under "Where they came
 * from"; the same GA4 taps as breakdown rows AND as a separate "Clicks on the
 * site" panel; the same listing call clicks in the total AND in the listing
 * panel. Nothing was wrong with the arithmetic, but a reader adding up the
 * screen got a much larger number than the headline, which is a far worse
 * failure than a wrong figure — a wrong figure can be corrected, a layout that
 * invites double-counting cannot.
 *
 * So the page has two sections and they do not overlap:
 *
 *   - LEAD BREAKDOWN — the components of the total, summing to it, each once.
 *   - ADDITIONAL CONTEXT — real numbers that are NOT in the total (spend,
 *     listing directions and site clicks, ad-attributed conversion counts).
 *     Labelled as such, and drawn only from fields outside the total's sum.
 *
 * `scripts/verify-dashboard.js` asserts both halves: that the breakdown sums to
 * the headline, and that the context section reads no field the sum uses.
 */

/**
 * Auto-refresh cadence.
 *
 * Stays at a minute because the lead figures come from Supabase and cost nothing
 * to re-read — this is a lead dashboard, and a lead that arrived a minute ago
 * should appear within a minute. What needed slowing down was the GOOGLE side,
 * not the page: see `PANEL_TTL_MS` in lib/dashboard-data.ts, which bounds the
 * Ads/GA4/listing reads by time so polling faster cannot spend more quota.
 */
const REFRESH_MS = 60_000;

// ── Formatting helpers ───────────────────────────────────────────────────────

const NUM = new Intl.NumberFormat('en-GB');

function money(micros: number): string {
  return `£${(micros / 1_000_000).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Percentage change, or null when it is not defined.
 *
 * Returning null when the previous period is zero is deliberate: there is no
 * percentage increase from nothing, and rendering "+100%" (or Infinity) would be
 * a made-up figure on a page whose whole job is to be trusted. The caller
 * renders the raw previous count instead.
 */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function exactTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** Human names for the route labels that appear in `source`. */
const SOURCE_LABELS: Record<string, string> = {
  'send-quote': 'Quote form',
  'send-contact': 'Contact form',
  'send-special-offer': 'Offer form',
  'call-tracking': 'Call tracking',
  'gbp-sync': 'GBP sync',
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] || source;
}

/**
 * The taps counted as leads, in render order, with the icon each is drawn with.
 *
 * These are NOT route labels and never appear in `bySource` — they are Google's
 * own counts of contact-button clicks, from three separate products, and they
 * carry fixed labels rather than a `source` column.
 */
const TAP_ICONS: Record<keyof LeadTapSources, LucideIcon> = {
  callButton: Phone,
  whatsapp: MessageCircle,
  adsTaps: MousePointerClick,
  gbpCalls: MapPin,
};

/** "a", "a and b", "a, b and c" — for naming what could not be read. */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Human names for the pipeline channels. */
const CHANNEL_LABELS: Record<string, string> = {
  ghl: 'CRM',
  'ghl-note': 'CRM note',
  email: 'Email',
  sms: 'SMS',
  fleet: 'Fleet',
  supabase: 'Database',
  filter: 'Filtered',
  gbp: 'GBP',
};

function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] || channel;
}

// ── Small presentational pieces ──────────────────────────────────────────────

/**
 * The site's own section kicker — two orange rules around a tracked label.
 * Reused verbatim from the marketing pages so the dashboard is recognisably the
 * same brand rather than a lookalike.
 */
function Kicker({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-px w-8 ${muted ? 'bg-gray-300' : 'bg-brand-orange'}`} aria-hidden />
      <h2
        className={`text-xs font-semibold uppercase tracking-[0.2em] ${
          muted ? 'text-gray-500' : 'text-brand-orange'
        }`}
      >
        {children}
      </h2>
    </div>
  );
}

/**
 * A caveat.
 *
 * Deliberately quiet: this page is read on a phone, often first thing, and a
 * wall of amber alert boxes trains a reader to skip exactly the lines that
 * matter. The `flag` variant earns its orange icon by marking a figure that is
 * WRONG rather than merely limited — an undercount, or a window that has not
 * settled — which is the distinction the old design lost by shouting all of it.
 */
function Hint({
  children,
  flag = false,
}: {
  children: React.ReactNode;
  flag?: boolean;
}) {
  return (
    <p className="mt-2 flex gap-1.5 text-[11px] leading-relaxed text-gray-500">
      {flag && (
        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0 text-brand-orange" aria-hidden />
      )}
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** A change against the previous window, as an arrow and a percentage. */
function Delta({
  current,
  previous,
  format = (n: number) => NUM.format(n),
  size = 'sm',
}: {
  current: number;
  previous: number;
  format?: (n: number) => string;
  size?: 'sm' | 'md';
}) {
  const change = pctChange(current, previous);
  const text = size === 'md' ? 'text-sm' : 'text-[11px]';

  if (change === null) {
    return <span className={`${text} text-gray-400`}>was {format(previous)}</span>;
  }

  const flat = Math.abs(change) < 1;
  const up = change > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`${text} inline-flex items-baseline gap-0.5 font-medium tabular-nums ${
        flat ? 'text-gray-400' : up ? 'text-emerald-600' : 'text-red-600'
      }`}
    >
      {!flat && <Icon className="h-3.5 w-3.5 shrink-0 self-center" aria-hidden />}
      {flat ? 'flat' : `${Math.abs(change).toFixed(0)}%`}
      <span className="ml-0.5 font-normal text-gray-400">vs {format(previous)}</span>
    </span>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6 p-5">
      <div className="h-4 w-24 rounded bg-gray-200" />
      <div className="h-14 w-32 rounded bg-gray-200" />
      <div className="space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 rounded bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

// ── The breakdown ────────────────────────────────────────────────────────────

interface BreakdownRow {
  key: string;
  label: string;
  /** The qualifier that says where the number came from. */
  origin: string;
  icon: LucideIcon;
  current: number;
  previous: number;
  /** 'form' is a submission that reached the CRM; 'tap' is a button click. */
  tone: 'form' | 'tap';
  /** Set when this figure is already inside another row's count. */
  overlap?: boolean;
}

/**
 * Every component of the headline, each exactly once.
 *
 * Order is fixed and meaningful: the form leads first — those are people who
 * filled something in and reached the CRM — then the taps, which are Google's
 * count of a button being pressed and are a weaker signal dressed as a
 * comparable one. The tone difference in the icon chip is that distinction,
 * carried in the layout rather than only in a footnote.
 */
function breakdownRows(current: LeadPeriod, previous: LeadPeriod): BreakdownRow[] {
  return [
    {
      key: 'form',
      label: 'Form leads',
      origin: 'CRM',
      icon: FileText,
      current: current.accepted,
      previous: previous.accepted,
      tone: 'form',
    },
    {
      key: 'callButton',
      label: 'Call button taps',
      origin: 'GA4',
      icon: TAP_ICONS.callButton,
      current: current.taps.callButton,
      previous: previous.taps.callButton,
      tone: 'tap',
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp taps',
      origin: 'GA4',
      icon: TAP_ICONS.whatsapp,
      current: current.taps.whatsapp,
      previous: previous.taps.whatsapp,
      tone: 'tap',
    },
    {
      key: 'gbpCalls',
      label: 'Google listing calls',
      origin: 'GBP',
      icon: TAP_ICONS.gbpCalls,
      current: current.taps.gbpCalls,
      previous: previous.taps.gbpCalls,
      tone: 'tap',
    },
    {
      key: 'adsTaps',
      label: 'Ads tap conversions',
      origin: 'Google Ads',
      icon: TAP_ICONS.adsTaps,
      current: current.taps.adsTaps,
      previous: previous.taps.adsTaps,
      tone: 'tap',
      overlap: true,
    },
  ];
}

function BreakdownRowView({ row, max }: { row: BreakdownRow; max: number }) {
  const Icon = row.icon;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
          row.tone === 'form' ? 'bg-brand-navy/[0.07] text-brand-navy' : 'bg-brand-orange/10 text-brand-orange'
        }`}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-medium text-brand-navy">
            {row.label}
            <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-gray-400">
              {row.origin}
            </span>
          </span>
          <span className="shrink-0 text-base font-semibold tabular-nums text-brand-navy">
            {NUM.format(row.current)}
          </span>
        </div>
        {/* The bar is a share of the largest row, so a tap that outweighs every
            form looks like it — and the scale is shared across all five. */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${
                row.tone === 'form' ? 'bg-brand-navy' : 'bg-brand-orange/60'
              }`}
              style={{ width: `${max ? Math.max(4, (row.current / max) * 100) : 0}%` }}
            />
          </div>
          <Delta current={row.current} previous={row.previous} />
        </div>
      </div>
    </li>
  );
}

/**
 * The lead section: the headline, its components, and how the form leads were
 * delivered. Everything that is added together to make the headline lives in
 * here and nowhere else.
 */
function LeadSection({ data }: { data: DashboardData }) {
  const { current, previous, previousFull } = data;
  const rows = breakdownRows(current, previous);
  const max = rows.reduce((a, r) => Math.max(a, r.current), 0);
  // The rows must sum to the headline. They are drawn from the same payload, so
  // this cannot fail unless the payload itself is inconsistent — which is worth
  // noticing rather than papering over with a separate arithmetic.
  const rowSum = rows.reduce((a, r) => a + r.current, 0);
  const rowsMatchTotal = rowSum === current.total;
  const taps = current.taps.callButton + current.taps.whatsapp + current.taps.gbpCalls + current.taps.adsTaps;

  return (
    <section className="px-5 pt-5 pb-4 sm:px-6">
      <Kicker>Leads</Kicker>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-5xl font-bold leading-none tabular-nums text-brand-navy sm:text-6xl">
          {NUM.format(current.total)}
        </span>
        <Delta current={current.total} previous={previous.total} size="md" />
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-gray-500">
        {shortDate(current.from)} – {shortDate(current.to)} · {NUM.format(current.accepted)} form
        submission{current.accepted === 1 ? '' : 's'} + {NUM.format(taps)} contact tap
        {taps === 1 ? '' : 's'}
      </p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">
        Compared with the previous 30 days, {shortDate(previous.from)} – {shortDate(previous.to)}
        {' · '}
        {NUM.format(previousFull.total)} in the 30 days before that
      </p>

      {/* ── The one list ─────────────────────────────────────────────────── */}
      <ul className="mt-4 divide-y divide-gray-100 border-y border-gray-100">
        {rows.map((row) => (
          <BreakdownRowView key={row.key} row={row} max={max} />
        ))}
      </ul>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
          Total
        </span>
        <span className="text-lg font-bold tabular-nums text-brand-navy">
          {NUM.format(current.total)}
        </span>
      </div>
      {!rowsMatchTotal && (
        <Hint flag>
          The rows above sum to {NUM.format(rowSum)}, not the headline{' '}
          {NUM.format(current.total)} — treat the headline as the authoritative figure and this
          page as broken.
        </Hint>
      )}

      {/* ── How the form leads were delivered ────────────────────────────── */}
      <div className="mt-5 rounded-lg bg-brand-grey p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
          Form leads, by delivery
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'CRM', value: current.crmOk, tone: 'ok' as const },
            { label: 'Inbox', value: current.emailOk, tone: 'ok' as const },
            {
              label: 'CRM failed',
              value: current.crmFailed,
              tone: current.crmFailed ? ('bad' as const) : ('muted' as const),
            },
            {
              label: 'Filtered',
              value: current.filtered,
              tone: current.filtered ? ('warn' as const) : ('muted' as const),
            },
          ].map((s) => (
            <div key={s.label}>
              <div
                className={`text-base font-semibold tabular-nums ${
                  s.tone === 'bad'
                    ? 'text-red-600'
                    : s.tone === 'warn'
                      ? 'text-brand-orange'
                      : s.tone === 'muted'
                        ? 'text-gray-300'
                        : 'text-brand-navy'
                }`}
              >
                {NUM.format(s.value)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
        <Hint>
          These four describe the form leads only — a tap has no CRM leg and no inbox leg, so it is
          counted in none of them. CRM and Inbox are the same{' '}
          {NUM.format(current.accepted)} submission{NUM.format(current.accepted) === '1' ? '' : 's'}{' '}
          reaching two places, not two sets of leads.
        </Hint>
        {current.filtered > 0 && (
          <Hint>
            {NUM.format(current.filtered)} submission{current.filtered === 1 ? '' : 's'} were
            rejected before reaching the CRM or the inbox — spam, a failed validation, or a
            too-fast submit. Shown rather than hidden, because a filter that is too strict removes
            real customers and looks exactly like a quiet week.
          </Hint>
        )}
      </div>

      {/* ── What the taps are, and are not ───────────────────────────────── */}
      <Hint>
        A form lead is someone who filled something in and reached the CRM. A tap is Google&apos;s
        count of a button being pressed — interest, not a conversation. Nobody has spoken to these
        people; a call that rang out and a WhatsApp message never sent both count. The taps are
        browser events gated on cookie consent, so a visitor who declined cookies and tapped is
        missing from them.
      </Hint>
      {current.tapsOverlap && (
        <Hint>
          The Ads row is the one overlap: a tap on an ad-driven visit fires both the GA4 event and
          the Ads conversion, so those {NUM.format(current.taps.adsTaps)} tap
          {current.taps.adsTaps === 1 ? '' : 's'} {current.taps.adsTaps === 1 ? 'is' : 'are'}{' '}
          already inside the call and WhatsApp rows above and counted a second time in the total.
        </Hint>
      )}

      {/* An unread tap source makes the headline SMALLER, which is
          indistinguishable from a quiet period unless it is said out loud. */}
      {current.tapsMissing.length > 0 && (
        <Hint flag>
          The total is an undercount: {joinNames(current.tapsMissing)} could not be read, so those
          contacts are missing from it rather than counted as zero.
        </Hint>
      )}

      {current.note && <Hint flag>{current.note}</Hint>}
    </section>
  );
}

// ── Additional context ───────────────────────────────────────────────────────

/** A label/value/change triple for the context grid. */
function Figure({
  label,
  current,
  previous,
  format = (n: number) => NUM.format(n),
  hint,
}: {
  label: string;
  current: number;
  previous: number;
  format?: (n: number) => string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[11px] text-gray-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-brand-navy">
        {format(current)}
      </div>
      <div className="mt-0.5">
        <Delta current={current} previous={previous} format={format} />
      </div>
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

function ContextSection({ data }: { data: DashboardData }) {
  const { ads, gbp, clicks } = data;
  const cpc = (t: { costMicros: number; clicks: number }) =>
    t.clicks > 0 ? t.costMicros / t.clicks : 0;

  const calls = ads.calls;
  const leadForm = ads.leadForm;
  const callLabel = calls?.minimumSeconds ? `Calls (${calls.minimumSeconds}s+)` : 'Calls';

  // Every website action on this account is Secondary, so one sentence covers
  // all of them rather than three identical ones.
  const secondaryNames = [
    calls?.secondary ? callLabel : null,
    leadForm?.secondary ? 'Lead form' : null,
    ads.taps?.secondary ? 'Tap clicks' : null,
  ].filter((n): n is string => n !== null);

  const missing = [
    !gbp.available ? 'the Google listing figures' : null,
    !ads.available ? 'every Google Ads figure' : null,
    !clicks.available ? 'the GA4 site figures' : null,
  ].filter((n): n is string => n !== null);

  return (
    <section className="border-t border-gray-200 px-5 pt-5 pb-4 sm:px-6">
      <Kicker muted>Additional context</Kicker>
      <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
        Nothing in this section is part of the lead count above. It is spend, and activity that is
        not a contact — shown because it explains the lead numbers, not because it adds to them.
      </p>

      {missing.length > 0 && (
        <Hint flag>
          Missing here: {joinNames(missing)} could not be read, so this section is incomplete —
          the figures shown are real, the gaps are not zeros.
        </Hint>
      )}

      {/* ── Google Ads ───────────────────────────────────────────────────── */}
      <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
        Google Ads
      </h3>
      {ads.available ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Figure
              label="Spend"
              current={ads.currentTotals.costMicros}
              previous={ads.previousTotals.costMicros}
              format={money}
            />
            <Figure
              label="Clicks"
              current={ads.currentTotals.clicks}
              previous={ads.previousTotals.clicks}
            />
            <Figure
              label="Cost / click"
              current={cpc(ads.currentTotals)}
              previous={cpc(ads.previousTotals)}
              format={(n) => (n ? money(n) : '—')}
            />
          </div>
          <Hint>
            Spend, clicks and cost-per-click are account-wide. Everything else on this page that
            comes from Ads is read against one specific conversion action, so it counts only ad
            traffic and only what Google was able to see.
          </Hint>

          {/* Ad-attributed conversion counts. These LOOK like the lead figures
              above and are not: Google counts the tag firing, not the lead
              arriving, and it cannot see organic or cookie-declined visitors. */}
          {(calls || leadForm) && (
            <>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {calls && (
                  <Figure
                    label={callLabel}
                    current={calls.currentConversions}
                    previous={calls.previousConversions}
                  />
                )}
                {leadForm && (
                  <Figure
                    label="Lead form conversions"
                    current={leadForm.currentConversions}
                    previous={leadForm.previousConversions}
                  />
                )}
              </div>
              <Hint>
                These are Google&apos;s counts, not the dashboard&apos;s. A lead-form conversion is
                the tag firing on an ad click — Google sees only ad traffic, only where advertising
                cookies were accepted, and it counts the tag rather than the lead arriving. It is
                not the form-lead figure above and the two are not meant to agree
                {leadForm
                  ? ` (they differ by ${NUM.format(
                      Math.abs(leadForm.currentConversions - data.current.accepted),
                    )} in this window)`
                  : ''}
                . The CRM figure counts every submission that passed the spam filter, from every
                source.
              </Hint>
              {calls && calls.currentConversions === 0 && calls.previousConversions === 0 && (
                <Hint>
                  No ad calls recorded. Google only registers one when an ad click shows the
                  forwarding number and the call runs for{' '}
                  {calls.minimumSeconds
                    ? `at least ${calls.minimumSeconds} seconds`
                    : 'long enough'}
                  , so zero here is expected rather than a broken read.
                </Hint>
              )}
              {secondaryNames.length > 0 && (
                <Hint>
                  {secondaryNames.length === 1 ? 'One of these actions is' : 'These actions are'}{' '}
                  set to SECONDARY for the account&apos;s goals ({joinNames(secondaryNames)}), so
                  Smart Bidding is not optimising toward
                  {secondaryNames.length === 1 ? ' it' : ' them'}. The counts are still what Google
                  recorded, which is the honest number either way.
                </Hint>
              )}
            </>
          )}

          {[
            ads.callsError && `Calls: ${ads.callsError}`,
            ads.leadFormError && `Lead form: ${ads.leadFormError}`,
            ads.tapsError && `Tap clicks: ${ads.tapsError}`,
            calls?.note,
            leadForm?.note,
            ads.taps?.note,
          ]
            .filter((n): n is string => Boolean(n))
            .map((n) => (
              <Hint key={n} flag>
                {n}
              </Hint>
            ))}

          <Hint>
            Still left out: the account&apos;s offline actions (Job Won, Site Visit Booked), which
            are uploaded from the CRM rather than recorded from an ad click. An account-wide
            conversions total would add those to the figures here and mean nothing in particular,
            which is why each is read against its own action id.
          </Hint>
        </>
      ) : (
        <Hint flag>{ads.note || 'Google Ads data is unavailable.'}</Hint>
      )}

      {/* ── Google listing ───────────────────────────────────────────────── */}
      <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
        Google listing
      </h3>
      {gbp.available ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Figure
              label="Direction requests"
              current={gbp.currentTotals.directionRequests}
              previous={gbp.previousTotals.directionRequests}
            />
            <Figure
              label="Site clicks"
              current={gbp.currentTotals.websiteClicks}
              previous={gbp.previousTotals.websiteClicks}
            />
          </div>
          {/* The listing's CALL clicks are deliberately absent: they are already
              a row of the breakdown above, and showing them again here is what
              made the same number look like two different things. */}
          <Hint>
            Actions taken on the Google listing itself, over {shortDate(gbp.current.from)} –{' '}
            {shortDate(gbp.current.to)} compared with {shortDate(gbp.previous.from)} –{' '}
            {shortDate(gbp.previous.to)}. The window ends {shortDate(gbp.current.to)}, a few days
            behind, because Google keeps revising the most recent days and comparing unsettled days
            against settled ones invents a decline. Last pulled{' '}
            {gbp.coveredTo ? shortDate(gbp.coveredTo) : 'unknown'}.
            {gbp.currentTotals.callClicks > 0 &&
              ` The listing's own call clicks (${NUM.format(
                gbp.currentTotals.callClicks,
              )}) are in the lead breakdown above, over a different window.`}
          </Hint>
          {gbp.note && <Hint flag>{gbp.note}</Hint>}
        </>
      ) : (
        <Hint flag>{gbp.note || 'Google listing data is unavailable.'}</Hint>
      )}

      {/* ── Site ─────────────────────────────────────────────────────────── */}
      <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
        Site
      </h3>
      {clicks.available ? (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3">
            {/* Email clicks were the one figure in the old "Clicks on the site"
                panel with no home in the breakdown — the call and WhatsApp
                figures there were duplicates of rows above. Kept because it is
                genuinely recorded, and labelled because it is not a lead. */}
            <Figure
              label="Email link clicks"
              current={clicks.currentTotals.email}
              previous={clicks.previousTotals.email}
              hint="Not counted as a lead — an email link is not a tracked contact."
            />
          </div>
          <Hint>
            Tallied by GA4 over {shortDate(clicks.current.from)} – {shortDate(clicks.current.to)},
            compared with {shortDate(clicks.previous.from)} – {shortDate(clicks.previous.to)}. The
            newest day is still filling in, so treat today as provisional.
          </Hint>
          {clicks.note && <Hint flag>{clicks.note}</Hint>}
        </>
      ) : (
        <Hint flag>{clicks.note || 'Click data is unavailable.'}</Hint>
      )}

      {data.googleAsOf && (
        <Hint>
          Ads, listing and GA4 figures last read at {clockTime(data.googleAsOf)}; the lead figures
          above are re-read every minute. Google revises all three for days after the fact, so
          these are deliberately not chased minute by minute.
        </Hint>
      )}
    </section>
  );
}

// ── Activity feed ────────────────────────────────────────────────────────────

function ActivitySection({ events }: { events: FeedEvent[] }) {
  return (
    <section className="border-t border-gray-200 px-5 pt-5 pb-5 sm:px-6">
      <Kicker muted>Latest activity</Kicker>
      {events.length === 0 ? (
        <p className="mt-3 text-[13px] text-gray-400">Nothing recorded yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-100">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-3 py-2.5">
              <span
                aria-hidden
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  e.ok ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] text-brand-navy">
                    {sourceLabel(e.source)}
                    <span className="text-gray-400"> · {channelLabel(e.channel)}</span>
                  </span>
                  <span
                    className="shrink-0 text-[11px] text-gray-400"
                    title={exactTime(e.createdAt)}
                  >
                    {timeAgo(e.createdAt)}
                  </span>
                </div>
                {!e.ok && e.detail && (
                  <p className="mt-0.5 break-words text-[11px] leading-snug text-red-500/80">
                    {e.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Install hint ─────────────────────────────────────────────────────────────

/**
 * iOS never fires an install prompt, so the only way to get the app onto a home
 * screen there is to tell the user the gesture. Shown only on an iPhone/iPad
 * that is not already running standalone, and dismissible for good.
 */
function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isIos = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
      if (isIos && !standalone && localStorage.getItem('dash-install-hint') !== 'off') {
        setShow(true);
      }
    } catch {
      // A browser that blocks matchMedia or storage simply does not get the hint.
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mx-5 mb-4 mt-1 flex items-start gap-2 rounded-lg bg-brand-grey px-3 py-2 text-[12px] text-gray-600">
      <span className="flex-1">
        To keep this on your home screen: tap <span className="text-brand-navy">Share</span>, then{' '}
        <span className="text-brand-navy">Add to Home Screen</span>.
      </span>
      <button
        type="button"
        className="-mr-1 shrink-0 px-1 text-gray-400 hover:text-brand-navy"
        aria-label="Dismiss"
        onClick={() => {
          setShow(false);
          try {
            localStorage.setItem('dash-install-hint', 'off');
          } catch {
            // Non-fatal: the hint returns next visit at worst.
          }
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function DashboardClient({ slug }: { slug: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    // Guard against overlapping fetches: the interval and a manual tap can
    // otherwise land on top of each other and the slower response can win.
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard/${slug}`, { cache: 'no-store' });
      if (res.status === 404) {
        setNotFound(true);
        setError(null);
        return;
      }
      if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
      setData((await res.json()) as DashboardData);
      setError(null);
      setNotFound(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    // Coming back to the app should show current numbers immediately rather than
    // whatever the last tick happened to fetch.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // Register the service worker so the app is installable. Production only: in
  // `next dev` a worker sits in front of HMR and serves confusing stale shells.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const register = () =>
      navigator.serviceWorker
        .register(`/dashboard/${slug}/sw.js`, { scope: `/dashboard/${slug}/` })
        .catch((err) => console.warn('[dashboard] service worker registration failed', err));
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, [slug]);

  if (notFound) {
    return (
      <Shell>
        <div className="p-5">
          <p className="text-sm leading-relaxed text-brand-navy">
            This dashboard URL is not active.
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-gray-500">
            The link is the only key, and it changes when the slug is rotated. Ask for the current
            one.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      onRefresh={() => void load()}
      refreshing={refreshing}
      updated={data ? exactTime(data.generatedAt) : undefined}
    >
      <div className="rounded-lg border border-gray-200 bg-white shadow-md">
        {!data && !error && <Skeleton />}

        {error && (
          <div className="p-5">
            <p className="text-[13px] text-red-600">Could not load the numbers: {error}</p>
          </div>
        )}

        {data && (
          <>
            {data.storeNote && (
              <div className="border-b border-gray-200 px-5 py-3">
                <Hint flag>{data.storeNote}</Hint>
              </div>
            )}
            <LeadSection data={data} />
            <ContextSection data={data} />
            <ActivitySection events={data.feed} />
            <InstallHint />
            <p className="border-t border-gray-100 px-5 py-3 text-[10px] leading-relaxed text-gray-400">
              Lead figures refresh every minute. Ads, listing and GA4 figures are re-read every 15
              minutes — Google revises all three for days, so they are not chased faster than that.
              Read-only.
            </p>
          </>
        )}
      </div>
    </Shell>
  );
}

/**
 * The app frame.
 *
 * Built from the marketing site's own tokens — `brand-navy` for text,
 * `brand-orange` for the accent, Poppins through the inherited `font-sans`, and
 * `brand-grey` for the recessed blocks — so this reads as the same brand rather
 * than a lookalike. It was previously a self-contained dark navy app; that made
 * it visibly a different product from the site it reports on, and the numbers
 * here are the site's.
 */
function Shell({
  children,
  onRefresh,
  refreshing,
  updated,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  updated?: string;
}) {
  return (
    <div className="min-h-screen bg-brand-grey text-brand-navy">
      <div className="mx-auto max-w-2xl px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold leading-tight text-brand-navy">Leads</h1>
            <p className="text-[11px] text-gray-500">
              {updated ? `Updated ${updated}` : 'Loading…'}
            </p>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-navy/20 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden
              />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}
