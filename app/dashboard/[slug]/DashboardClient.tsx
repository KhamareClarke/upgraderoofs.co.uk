'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  ClickTotals,
  DashboardData,
  FeedEvent,
  GbpActionTotals,
  LeadPeriod,
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
 * Every panel has an unavailable state, because the honest failure modes are
 * real: GBP stops being pulled, the Ads refresh token expires, the service-role
 * key is Production-only (so Preview renders empty by design). A dashboard that
 * shows a confident zero when it means "I could not read this" is the exact
 * failure this codebase has been bitten by — see the 19-day silent lead outage.
 * So a zero always competes with a note explaining it.
 */

/** Auto-refresh cadence. A lead dashboard does not need to be faster than this. */
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
 * renders "—" and the raw counts instead.
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

function Card({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-white/50">
          {title}
        </h2>
        {meta ? <span className="text-[11px] text-white/40">{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * A current-vs-previous figure.
 *
 * `invert` marks metrics where down is good — none today, but the helper exists
 * so a future "cost per lead" tile does not get coloured backwards.
 */
function Stat({
  label,
  current,
  previous,
  format = (n: number) => NUM.format(n),
  invert = false,
  below,
}: {
  label: string;
  current: number;
  previous: number;
  format?: (n: number) => string;
  invert?: boolean;
  /**
   * An optional line under the comparison, for context the delta cannot carry —
   * a second measurement of the same thing, for instance.
   */
  below?: React.ReactNode;
}) {
  const change = pctChange(current, previous);
  const up = change !== null && change > 0;
  const good = invert ? !up : up;
  return (
    <div className="min-w-0">
      <div className="truncate text-[11px] uppercase tracking-wide text-white/40">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums text-white">
        {format(current)}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5 text-[11px]">
        {change === null ? (
          <span className="text-white/35">no prior data</span>
        ) : (
          <span
            className={
              Math.abs(change) < 1
                ? 'text-white/45'
                : good
                  ? 'font-medium text-emerald-400'
                  : 'font-medium text-red-400'
            }
          >
            {change > 0 ? '+' : ''}
            {change.toFixed(0)}%
          </span>
        )}
        <span className="text-white/30">vs {format(previous)}</span>
      </div>
      {below && <div className="mt-0.5 text-[11px] text-white/30">{below}</div>}
    </div>
  );
}

function Note({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'warn' }) {
  return (
    <p
      className={
        tone === 'warn'
          ? 'mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] leading-relaxed text-amber-200'
          : 'mt-3 text-[12px] leading-relaxed text-white/45'
      }
    >
      {children}
    </p>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-28 rounded-2xl bg-white/[0.06]" />
      <div className="h-24 rounded-2xl bg-white/[0.06]" />
      <div className="h-40 rounded-2xl bg-white/[0.06]" />
    </div>
  );
}

// ── Panels ───────────────────────────────────────────────────────────────────

function LeadHeadline({ data }: { data: DashboardData }) {
  const { current, previous, previousFull } = data;
  const change = pctChange(current.accepted, previous.accepted);

  return (
    <Card
      title="Leads this month"
      meta={`${shortDate(current.from)} – ${shortDate(current.to)}`}
    >
      <div className="flex items-end gap-3">
        <div className="text-5xl font-semibold leading-none tabular-nums text-white">
          {NUM.format(current.accepted)}
        </div>
        {change !== null && (
          <div
            className={`pb-1 text-sm font-medium ${
              Math.abs(change) < 1 ? 'text-white/50' : change > 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {change > 0 ? '▲' : change < 0 ? '▼' : ''} {Math.abs(change).toFixed(0)}%
          </div>
        )}
      </div>

      {/* The comparison is like-for-like on purpose. Comparing a month in
          progress against a whole month always reads as a collapse on the 1st. */}
      <p className="mt-2 text-[12px] leading-relaxed text-white/45">
        vs {NUM.format(previous.accepted)} over the same {shortDate(previous.from)} –{' '}
        {shortDate(previous.to)}
        {change === null && ' · no leads in that window, so no % to show'}
      </p>
      <p className="mt-1 text-[11px] text-white/30">
        All of last month: {NUM.format(previousFull.accepted)} leads
      </p>

      {/* Delivery: a lead is only genuinely lost when BOTH sinks fail, so this
          is reported as coverage rather than as a single pass/fail. */}
      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/10 pt-3">
        {[
          { label: 'CRM', value: current.crmOk, tone: 'ok' as const },
          { label: 'Inbox', value: current.emailOk, tone: 'ok' as const },
          { label: 'CRM failed', value: current.crmFailed, tone: current.crmFailed ? ('bad' as const) : ('muted' as const) },
          { label: 'Filtered', value: current.filtered, tone: current.filtered ? ('warn' as const) : ('muted' as const) },
        ].map((s) => (
          <div key={s.label}>
            <div
              className={`text-lg font-semibold tabular-nums ${
                s.tone === 'bad'
                  ? 'text-red-400'
                  : s.tone === 'warn'
                    ? 'text-amber-300'
                    : s.tone === 'muted'
                      ? 'text-white/35'
                      : 'text-white'
              }`}
            >
              {NUM.format(s.value)}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-white/35">{s.label}</div>
          </div>
        ))}
      </div>

      {current.filtered > 0 && (
        <Note>
          {NUM.format(current.filtered)} submission{current.filtered === 1 ? '' : 's'} were
          rejected before reaching the CRM or the inbox — spam, a failed validation, or a
          too-fast submit. They are counted here rather than hidden, because a filter that is
          too strict removes real customers and looks exactly like a quiet week.
        </Note>
      )}
    </Card>
  );
}

function SourceBreakdown({ current, previous }: { current: LeadPeriod; previous: LeadPeriod }) {
  const prevBySource = new Map(previous.bySource.map((s) => [s.source, s.count]));
  const max = current.bySource.reduce((a, s) => Math.max(a, s.count), 0);

  return (
    <Card title="Where they came from" meta={`${shortDate(current.from)} – ${shortDate(current.to)}`}>
      {current.bySource.length === 0 ? (
        <p className="text-[13px] text-white/40">No leads captured in this window.</p>
      ) : (
        <ul className="space-y-3">
          {current.bySource.map((s) => {
            const prev = prevBySource.get(s.source) || 0;
            const change = pctChange(s.count, prev);
            return (
              <li key={s.source}>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="truncate text-white/80">{sourceLabel(s.source)}</span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    {change !== null && (
                      <span
                        className={`text-[11px] ${
                          Math.abs(change) < 1
                            ? 'text-white/35'
                            : change > 0
                              ? 'text-emerald-400'
                              : 'text-red-400'
                        }`}
                      >
                        {change > 0 ? '+' : ''}
                        {change.toFixed(0)}%
                      </span>
                    )}
                    <span className="font-semibold tabular-nums text-white">
                      {NUM.format(s.count)}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand-orange"
                    style={{ width: `${max ? Math.max(6, (s.count / max) * 100) : 0}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Note>
        Form leads only. Calls from the call-tracking webhook are not written to the
        pipeline log, so they cannot appear here — they would read as zero rather than
        as missing.
      </Note>
    </Card>
  );
}

function GbpPanel({ gbp }: { gbp: DashboardData['gbp'] }) {
  const row = (label: string, key: keyof GbpActionTotals) => (
    <Stat label={label} current={gbp.currentTotals[key]} previous={gbp.previousTotals[key]} />
  );

  return (
    <Card
      title="Google listing"
      meta={
        gbp.available
          ? `${shortDate(gbp.current.from)} – ${shortDate(gbp.current.to)}`
          : undefined
      }
    >
      {gbp.available ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {row('Calls', 'callClicks')}
            {row('Directions', 'directionRequests')}
            {row('Site clicks', 'websiteClicks')}
          </div>
          <Note>
            These are actions taken on the Google listing itself, compared against the
            previous {shortDate(gbp.previous.from)} – {shortDate(gbp.previous.to)}.
            {/* The window ends before the last covered day because Google keeps
                revising recent days — comparing them against settled ones invents
                a decline. Saying so prevents "why is today missing?". */}
            {' '}It ends {shortDate(gbp.current.to)}, a few days behind, because Google
            keeps revising the most recent days. Last pulled{' '}
            {gbp.coveredTo ? shortDate(gbp.coveredTo) : 'unknown'}.
          </Note>
          {gbp.note && <Note tone="warn">{gbp.note}</Note>}
        </>
      ) : (
        <Note>{gbp.note || 'Google listing data is unavailable.'}</Note>
      )}
    </Card>
  );
}

function ClicksPanel({ clicks }: { clicks: DashboardData['clicks'] }) {
  const row = (label: string, key: keyof ClickTotals) => (
    <Stat label={label} current={clicks.currentTotals[key]} previous={clicks.previousTotals[key]} />
  );

  return (
    <Card
      title="Clicks on the site"
      meta={
        clicks.available
          ? `${shortDate(clicks.current.from)} – ${shortDate(clicks.current.to)}`
          : undefined
      }
    >
      {clicks.available ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {row('Call button', 'phone')}
            {row('WhatsApp', 'whatsapp')}
            {row('Email', 'email')}
          </div>
          <Note>
            Taps recorded by GA4, compared against the previous{' '}
            {shortDate(clicks.previous.from)} – {shortDate(clicks.previous.to)}. The newest
            day is still filling in and Google keeps revising the last day or two, so treat
            today as provisional — the same caution the Google listing panel applies to its
            own window.
          </Note>
          {/* The honest limit of this panel, stated rather than implied: none of
              these three events can observe what happened after the tap. */}
          <Note>
            These measure intent, not delivery. A tap opens the dialler, WhatsApp or a mail
            client, and nothing on the site can see whether the call was placed or the
            message was sent. A call that rings out and a WhatsApp message that is never
            sent both count here, so this is a leading indicator — never a count of
            conversations.
          </Note>
          {clicks.note && <Note tone="warn">{clicks.note}</Note>}
        </>
      ) : (
        <Note>{clicks.note || 'Click data is unavailable.'}</Note>
      )}
    </Card>
  );
}

function AdsPanel({
  ads,
  leads,
}: {
  ads: DashboardData['ads'];
  /** The dashboard's own lead window, for the count shown beside the lead-form figure. */
  leads: DashboardData['current'];
}) {
  const cpc = (t: { costMicros: number; clicks: number }) =>
    t.clicks > 0 ? t.costMicros / t.clicks : 0;

  const calls = ads.calls;
  const leadForm = ads.leadForm;
  const taps = ads.taps;

  // The threshold is read from the conversion action rather than written here, so
  // the label cannot drift from what Google is actually enforcing.
  const callLabel = calls?.minimumSeconds ? `Calls (${calls.minimumSeconds}s+)` : 'Calls';

  // Google counts a form conversion when the browser fires the tag; the CRM count
  // is what actually arrived. The gap is shown rather than resolved, because
  // neither number is the other one being wrong — see the note below.
  const formGap = leadForm ? leadForm.currentConversions - leads.accepted : 0;

  // Stated once for the panel rather than once per figure: every website action on
  // this account is Secondary, so three separate sentences would be the same
  // sentence three times.
  const secondaryNames = [
    calls?.secondary ? callLabel : null,
    leadForm?.secondary ? 'Lead form' : null,
    taps?.secondary ? 'Tap clicks' : null,
  ].filter((n): n is string => n !== null);
  const joinNames = (xs: string[]) =>
    xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

  return (
    <Card
      title="Google Ads"
      meta={ads.available ? `${shortDate(ads.current.from)} – ${shortDate(ads.current.to)}` : undefined}
    >
      {ads.available ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Spend" current={ads.currentTotals.costMicros} previous={ads.previousTotals.costMicros} format={money} />
            <Stat label="Clicks" current={ads.currentTotals.clicks} previous={ads.previousTotals.clicks} />
            <div className="min-w-0">
              <div className="truncate text-[11px] uppercase tracking-wide text-white/40">
                Cost / click
              </div>
              <div className="mt-0.5 text-xl font-semibold tabular-nums text-white">
                {cpc(ads.currentTotals) ? money(cpc(ads.currentTotals)) : '—'}
              </div>
              <div className="mt-0.5 text-[11px] text-white/30">
                vs {cpc(ads.previousTotals) ? money(cpc(ads.previousTotals)) : '—'}
              </div>
            </div>
            {calls && (
              <Stat
                label={callLabel}
                current={calls.currentConversions}
                previous={calls.previousConversions}
              />
            )}
            {leadForm && (
              <Stat
                label="Lead form"
                current={leadForm.currentConversions}
                previous={leadForm.previousConversions}
                below={`CRM: ${NUM.format(leads.accepted)} this period`}
              />
            )}
            {taps && (
              <Stat
                label="Tap clicks"
                current={taps.currentConversions}
                previous={taps.previousConversions}
              />
            )}
          </div>

          <Note>
            Spend, clicks and cost-per-click are account-wide. The three figures below them
            are not — each is what Google recorded against one specific conversion action, so
            each counts only ad traffic, and only what Google was able to see.
          </Note>

          {/* Said once, for the reason in the component above. */}
          {secondaryNames.length > 0 && (
            <Note tone="warn">
              {secondaryNames.length === 1 ? 'One of these actions' : 'All of these actions'}{' '}
              — {joinNames(secondaryNames)} —{' '}
              {secondaryNames.length === 1 ? 'is' : 'are'} set to SECONDARY for the
              account&apos;s goals, so Smart Bidding is not optimising toward
              {secondaryNames.length === 1 ? ' it' : ' them'}. The counts below are still what
              Google recorded, which is the honest number either way.
            </Note>
          )}

          {/* The zero state, said out loud. An empty cell here would read as a
              fault or as "nobody is calling", when in fact Google cannot record a
              call until ad traffic has seen the forwarding number. */}
          {calls && calls.currentConversions === 0 && calls.previousConversions === 0 && (
            <Note>
              No calls recorded yet. Google only registers one when an ad click shows the
              forwarding number and the call runs for{' '}
              {calls.minimumSeconds ? `at least ${calls.minimumSeconds} seconds` : 'long enough'},
              so this stays at zero until real ad traffic produces calls. Zero here is
              expected, not a broken panel.
            </Note>
          )}

          {calls?.note && <Note tone="warn">{calls.note}</Note>}

          {calls && calls.currentInConversionsColumn < calls.currentConversions && (
            <Note>
              Only {NUM.format(calls.currentInConversionsColumn)} of these{' '}
              {NUM.format(calls.currentConversions)} appear in the Conversions column inside
              Google Ads itself, because the action is Secondary. The number above is the
              count of calls Google recorded.
            </Note>
          )}

          {ads.callsError && (
            <Note tone="warn">
              The call figures could not be read, so they are missing rather than zero:{' '}
              {ads.callsError}
            </Note>
          )}

          {leadForm && (
            <Note>
              Lead form is the count of form-fill conversions Google recorded against the{' '}
              <span className="text-white/70">{leadForm.actionName}</span> action. It is not
              the lead count: Google sees only ad traffic, only where advertising cookies
              were accepted, and it counts the tag firing rather than the lead arriving.{' '}
              {formGap === 0
                ? 'The two agree in this window.'
                : `They differ by ${NUM.format(Math.abs(formGap))} this window. The CRM
                   figure beside it counts every submission that passed the spam filter,
                   from every source, so neither is the other one being wrong.`}
            </Note>
          )}

          {leadForm?.note && <Note tone="warn">{leadForm.note}</Note>}

          {ads.leadFormError && (
            <Note tone="warn">
              The lead-form figures could not be read, so they are missing rather than
              zero: {ads.leadFormError}
            </Note>
          )}

          {taps && (
            <Note>
              Tap clicks are recorded presses of the phone and WhatsApp links, against the{' '}
              <span className="text-white/70">{taps.actionName}</span> action. A tap is
              intent, not a conversation: it says a button was pressed, not that the call
              connected or the message was sent.
            </Note>
          )}

          {taps?.note && <Note tone="warn">{taps.note}</Note>}

          {ads.tapsError && (
            <Note tone="warn">
              The tap figures could not be read, so they are missing rather than zero:{' '}
              {ads.tapsError}
            </Note>
          )}

          {/* Both read zero for the same reason, and two empty cells would read as
              "this never worked" rather than as "Google cannot see it". */}
          {leadForm &&
            taps &&
            leadForm.currentConversions === 0 &&
            taps.currentConversions === 0 && (
              <Note>
                Neither figure has recorded anything this period. Google only counts one when
                a visitor arrives from an ad click with advertising cookies accepted and the
                tag fires — organic and direct visitors are invisible to it by design, and a
                form submitted with cookies declined is a real lead Google never sees. Zero
                here means Google saw none, not that none happened.
              </Note>
            )}

          <Note>
            Still left out: the account&apos;s offline actions (Job Won, Site Visit Booked),
            which are uploaded from the CRM rather than recorded from an ad click. An
            account-wide conversions total would add those to the three above and mean
            nothing in particular, which is why every figure here is read against its own
            action id.
          </Note>
        </>
      ) : (
        <Note>{ads.note || 'Google Ads data is unavailable.'}</Note>
      )}
    </Card>
  );
}

function Feed({ events }: { events: FeedEvent[] }) {
  return (
    <Card title="Latest activity" meta={`${events.length} most recent`}>
      {events.length === 0 ? (
        <p className="text-[13px] text-white/40">Nothing recorded yet.</p>
      ) : (
        <ul className="divide-y divide-white/[0.07]">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <span
                aria-hidden
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  e.ok ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] text-white/85">
                    {sourceLabel(e.source)}
                    <span className="text-white/35"> · {channelLabel(e.channel)}</span>
                  </span>
                  <span
                    className="shrink-0 text-[11px] text-white/40"
                    title={exactTime(e.createdAt)}
                  >
                    {timeAgo(e.createdAt)}
                  </span>
                </div>
                {!e.ok && e.detail && (
                  <p className="mt-0.5 break-words text-[11px] leading-snug text-red-300/70">
                    {e.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
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
    <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white/60">
      <span className="flex-1">
        To keep this on your home screen: tap <span className="text-white/85">Share</span>, then{' '}
        <span className="text-white/85">Add to Home Screen</span>.
      </span>
      <button
        type="button"
        className="-mr-1 shrink-0 px-1 text-white/40 hover:text-white/80"
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
        <p className="text-sm leading-relaxed text-white/70">
          This dashboard URL is not active.
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-white/40">
          The link is the only key, and it changes when the slug is rotated. Ask for the
          current one.
        </p>
      </Shell>
    );
  }

  return (
    <Shell
      onRefresh={() => void load()}
      refreshing={refreshing}
      updated={data ? exactTime(data.generatedAt) : undefined}
    >
      {!data && !error && <Skeleton />}

      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-[13px] text-red-200">
          Could not load the numbers: {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {data.storeNote && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[12px] leading-relaxed text-amber-200">
              {data.storeNote}
            </div>
          )}
          <LeadHeadline data={data} />
          <SourceBreakdown current={data.current} previous={data.previous} />
          <GbpPanel gbp={data.gbp} />
          <ClicksPanel clicks={data.clicks} />
          <AdsPanel ads={data.ads} leads={data.current} />
          <Feed events={data.feed} />
          <InstallHint />
          <p className="pb-2 text-center text-[10px] leading-relaxed text-white/25">
            Figures refresh every minute. Read-only.
          </p>
        </div>
      )}
    </Shell>
  );
}

/** The dark app frame. Deliberately self-contained: the site's body is white. */
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
    <div className="min-h-screen bg-brand-navy text-white">
      <div className="mx-auto max-w-2xl px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight">Leads</h1>
            <p className="text-[11px] text-white/40">
              {updated ? `Updated ${updated}` : 'Loading…'}
            </p>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[12px] font-medium text-white/80 transition-colors hover:bg-white/[0.12] disabled:opacity-50"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}
