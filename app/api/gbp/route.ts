import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import * as path from 'path';

import { GBP_LOCATION_ID } from '@/lib/contact';

/**
 * app/api/gbp/route.ts
 *
 * Google Business Profile API — returns profile details + recent reviews for
 * the Upgrade Roofs location, authenticated by a service account
 * (`business.manage` scope). This removes the user OAuth refresh-token loop and
 * the unverified/personal-account wall entirely.
 *
 * GET https://www.upgraderoofs.co.uk/api/gbp
 *
 * Env required (server):
 *   GOOGLE_APPLICATION_CREDENTIALS — path to a service-account JSON key file
 *     (defaults to ./google-service-account.json). The service account must be
 *     added as a Manager on the verified "Upgrade Roofs" Business Profile.
 *   (optional) GBP_ACCOUNT_ID — My Business account id, e.g. accounts/123456789.
 *     When omitted, the route lists the accounts the caller can access and uses
 *     the one that owns the target location (locations/<GBP_LOCATION_ID>).
 *
 * NOTE: TARGET_LOCATION_ID is owned by lib/contact.ts. A previous "correction"
 * replaced it with a 17-digit id that does not exist, which made every request
 * to this route 404 for a reason that looks like a permissions failure.
 *
 * Data returned:
 *   - "profile": name, title, verification + primary category, phone, place/maps
 *     URLs, plus the location resource name.
 *   - "rating": average rating (1–5) and total review count.
 *   - "reviews": array of recent reviews (star rating, reviewer, comment, time,
 *     and any owner reply).
 */

const GBP_SCOPES = ['https://www.googleapis.com/auth/business.manage'];

const TARGET_LOCATION_ID = GBP_LOCATION_ID;

const REVIEW_COUNT = 5;

/** The exact service account that must be granted Manager on the profile. */
const EXPECTED_SERVICE_ACCOUNT =
  'roofing-audit-bot-upgraderoofs@upgraderoofs-api.iam.gserviceaccount.com';

const STAR_VALUE: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function resolveKeyFile(): string {
  return (
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(process.cwd(), 'google-service-account.json')
  );
}

async function getGbpClient(): Promise<{ accessToken: string }> {
  const keyFile = resolveKeyFile();
  let auth;
  try {
    // Load the key as a credential so we can surface the client email early.
    const keyJson = JSON.parse(require('fs').readFileSync(keyFile, 'utf8'));
    if (keyJson.client_email && keyJson.client_email !== EXPECTED_SERVICE_ACCOUNT) {
      console.warn(
        `[gbp] WARNING: key file "${keyFile}" is for "${keyJson.client_email}", ` +
          `expected "${EXPECTED_SERVICE_ACCOUNT}". Reviews will not resolve unless the ` +
          `service account is renamed to match the authorized one.`
      );
    }
    auth = new google.auth.GoogleAuth({ keyFile, scopes: GBP_SCOPES });
  } catch (cause: any) {
    // Key file missing/unreadable — surface as a clear, actionable error.
    throw new Error(
      `GBP service-account key file not found or invalid at "${keyFile}" (` +
        `${cause?.message ?? cause}). Set GOOGLE_APPLICATION_CREDENTIALS to a valid path.`
    );
  }

  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) {
    throw new Error('GBP service-account access token exchange failed');
  }
  return { accessToken: token };
}

/**
 * Return the resolved account id from a location resource name of the form
 * `accounts/{acctId}/locations/{locId}`. Because the service account has only
 * *one* known accessible account, a mismatched leading id cannot happen in
 * practice — but guarding here keeps the legacy personal-account pin from
 * silently corrupting the path.
 */
function pinAccountId(candidate: string): string | null {
  const m = candidate.match(/^(?:accounts\/)?(\d+)(?:\/locations\/|$)/);
  return m ? m[1] : null;
}

/** Raw GET helper enforcing JSON parse + throwing on non-2xx status. */
function jsonGet(
  host: string,
  path: string,
  accessToken: string,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const https = require('https') as typeof import('https');
    const req = https.request(
      {
        host,
        path,
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = { raw: data };
          }
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const err = new Error(
              `GBP API HTTP ${res.statusCode}: ${data.slice(0, 400)}`
            ) as Error & { status?: number };
            err.status = res.statusCode;
            reject(err);
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

/**
 * List `accountName`'s locations and find the one matching TARGET_LOCATION_ID.
 * Returns the location resource name, or null if not present.
 */
async function resolveLocation(
  accessToken: string,
  accountName: string,
): Promise<string | null> {
  const locRes: any = await jsonGet(
    'mybusinessbusinessinformation.googleapis.com',
    `/v1/${accountName}/locations?readMask=name&pageSize=100`,
    accessToken,
  );
  const locations: any[] = locRes.locations || [];
  for (const loc of locations) {
    if (loc.name && loc.name.includes(`locations/${TARGET_LOCATION_ID}`)) {
      return loc.name;
    }
  }
  return null;
}

/** Resolve the live accounts/{acctId}/locations/{locId} for the target location. */
async function resolveLocationName(accessToken: string): Promise<string> {
  const pinnedId = pinAccountId(process.env.GBP_ACCOUNT_ID?.trim() ?? '');

  // Fast path: pinned account id, direct location lookup.
  if (pinnedId) {
    const name = await resolveLocation(accessToken, `accounts/${pinnedId}`);
    if (name) return name;
    console.warn(
      `[gbp] GBP_ACCOUNT_ID=${pinnedId} has no matching location ` +
        `locations/${TARGET_LOCATION_ID}; falling back to account discovery.`
    );
  }

  // Otherwise: list all accessible accounts, then each account's locations and
  // match the target location id. Most accounts expose a single location.
  const acctRes: any = await jsonGet(
    'mybusinessaccountmanagement.googleapis.com',
    '/v1/accounts',
    accessToken,
  );
  const accounts: any[] = acctRes.accounts || [];

  for (const acct of accounts) {
    const accountName: string = acct.name; // accounts/{id}
    const found = await resolveLocation(accessToken, accountName);
    if (found) return found;
  }

  // Author the most useful diagnosis: account types + verification state tell us
  // exactly why the Manager grant is still missing.
  const summary = accounts
    .map((a) => `${a.name || '?'}(${a.type || 'UNKNOWN'}/${a.verificationState || '?'})`)
    .join(', ') || '(no accounts visible)';
  throw new Error(
    `Target location locations/${TARGET_LOCATION_ID} not found in accessible accounts ` +
      `[${summary}]. The service account must be added as a Manager on the verified ` +
      `"Upgrade Roofs" profile in business.google.com.`
  );
}

export async function GET(_request: NextRequest) {
  try {
    const { accessToken } = await getGbpClient();

    const locationName = await resolveLocationName(accessToken);
    const accountId = locationName.split('/')[1];
    const locationId = locationName.split('/').pop();

    // 1. Business profile details (Business Information API v1).
    const detail: any = await jsonGet(
      'mybusinessbusinessinformation.googleapis.com',
      `/v1/${locationName}?readMask=name,title,metadata,profile,phoneNumbers,categories,websiteUri`,
      accessToken,
    );

    // 2. Reviews + rating (legacy My Business v4, the only endpoint exposing
    //    the average rating + review count). This is the endpoint most likely
    //    to 404 while the Manager grant is still propagating — degrade to an
    //    empty review set rather than failing the whole request, so the
    //    profile/rating fields are still usable and the client falls back
    //    gracefully.
    let reviewsRes: any = {};
    try {
      reviewsRes = await jsonGet(
        'mybusiness.googleapis.com',
        `/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=${REVIEW_COUNT}&orderBy=updateTime%20desc`,
        accessToken,
      );
    } catch (reviewsErr: any) {
      console.warn(
        `[gbp] reviews fetch failed (status ${reviewsErr?.status ?? 'n/a'}): ` +
          `${reviewsErr?.message ?? reviewsErr} — continuing without reviews.`
      );
      reviewsRes = {};
    }

    const metadata = detail.metadata || {};
    const profile = {
      name: locationName,
      title: detail.title || null,
      primaryCategory: detail.categories?.primaryCategory?.displayName || null,
      phone: detail.phoneNumbers?.primaryPhone || null,
      websiteUri: detail.websiteUri || null,
      placeId: metadata.placeId || null,
      mapsUri: metadata.mapsUri || null,
      newReviewUri: metadata.newReviewUri || null,
      hasVoiceOfMerchant: metadata.hasVoiceOfMerchant ?? null,
      hasPendingEdits: metadata.hasPendingEdits ?? null,
    };

    const rating = {
      average: reviewsRes.averageRating != null ? Number(reviewsRes.averageRating) : null,
      totalReviews: reviewsRes.totalReviewCount != null ? Number(reviewsRes.totalReviewCount) : null,
    };

    const reviews: any[] = (reviewsRes.reviews || []).map((r: any) => ({
      reviewId: r.reviewId || null,
      starRating: r.starRating || null,
      starValue: r.starRating ? STAR_VALUE[r.starRating] ?? null : null,
      reviewer: r.reviewer?.displayName || 'Anonymous',
      comment: r.comment || null,
      createTime: r.createTime || null,
      updateTime: r.updateTime || null,
      ownerReply: r.reviewReply?.comment || null,
    }));

    return NextResponse.json({
      success: true,
      locationId,
      accountId,
      profile,
      rating,
      reviews,
    });
  } catch (error: any) {
    const message = error?.message || String(error);
    const status = error?.status && Number(error.status) ? Number(error.status) : 500;

    // Classify for a clean, greppable console trail. The two real-world failure
    // classes are (a) auth/permission — Manager grant, scopes — and (b) location
    // resolution — the account can't see the verified profile yet.
    const lower = message.toLowerCase();
    const category = /permission|forbidden|unauthorized|scope|access token|credential/i.test(lower)
      ? 'permissions'
      : /not found|404|no accessible accounts|not found in accessible/i.test(lower)
        ? 'location-resolution'
        : 'unknown';

    console.error(`[gbp] error (${category}):`, message);
    if (status >= 400 && status < 500 && error?.status) {
      console.error(`[gbp] HTTP status ${error.status}`);
    }

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
