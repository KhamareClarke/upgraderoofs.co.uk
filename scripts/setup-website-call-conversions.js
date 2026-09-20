/**
 * scripts/setup-website-call-conversions.js
 *
 * Account-side setup for Google Ads WEBSITE CALL conversions — the feature that
 * turns "someone tapped the call button" into "someone phoned, and here is
 * whether it was answered and how long it lasted".
 *
 * What it does:
 *   1. READS the account and prints everything the site's config depends on:
 *      call-reporting settings, any existing WEBSITE_CALL action, the CALL
 *      assets, and the conversion LABEL — read from the API rather than
 *      transcribed from the UI, which is the only way to be sure.
 *   2. With --apply only: enables call reporting if it is off, and creates the
 *      WEBSITE_CALL conversion action if it does not already exist.
 *
 *   node scripts/setup-website-call-conversions.js            # dry run (reads + validateOnly)
 *   node scripts/setup-website-call-conversions.js --apply    # writes
 *
 * ── Why a dry run is the default ────────────────────────────────────────────
 *
 * The mutate is first sent with `validateOnly: true`, which performs the full
 * server-side validation — permissions, developer-token level, every field
 * value — and writes nothing. So the dry run answers "would this be accepted?"
 * definitively, at zero risk.
 *
 * ── Two traps this script exists to steer around ────────────────────────────
 *
 * 1. `value_settings.always_use_default_value` MUST be true for WEBSITE_CALL.
 *    Google rejects `false` with INVALID_VALUE for call conversions, because a
 *    phone call has no cart value to read from the page. The sibling script
 *    `_create-website-conversion-actions.js` sets it false, which is correct for
 *    WEBPAGE actions and wrong here. This is not a style preference.
 *
 * 2. A conversion LABEL is only valid for the ACCOUNT it was minted in. The
 *    label this script prints goes into NEXT_PUBLIC_GADS_CALL_CONV_ID, whose
 *    account half must equal the site's NEXT_PUBLIC_GADS_ID. A label from
 *    another account configures cleanly and records nothing; Analytics.tsx
 *    refuses such a value and warns.
 *
 * ── What this script deliberately does NOT do ───────────────────────────────
 *
 * It does not touch the CALL assets. Their `call_conversion_reporting_state`
 * decides whether the asset reports at all, and editing an asset mutates
 * something that is serving live ads right now. When the state is wrong the
 * script says so and names the UI path, rather than making an outward-facing
 * change to a live ad from a setup script.
 *
 * It also does not set a monetary value for a call. `--value=N` exists for when
 * that becomes a business decision; the default is 0, and the default is
 * printed loudly because a primary-for-goal action valued at £0 tells Smart
 * Bidding these calls are worth nothing (it still counts them).
 *
 * ── One honest unknown ──────────────────────────────────────────────────────
 *
 * `phone_call_duration_seconds` is the API field for the minimum call duration.
 * If the account's API version does not accept it, validateOnly reports that
 * here rather than the script claiming a success it did not achieve — and the
 * re-read afterwards prints what the account actually stored, so the value is
 * confirmed and never assumed.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { google } = require('googleapis');
const https = require('https');

const API_VERSION = 'v22';
const HOST = 'googleads.googleapis.com';
const APPLY = process.argv.includes('--apply');

/** Minimum call duration, in seconds. 60 = Google's own default; chosen deliberately. */
const MIN_CALL_DURATION_SECONDS = 60;

/** Name must not collide: Google enforces unique conversion-action names account-wide. */
const ACTION_NAME = 'Phone Call (Website)';

/** Category for a call that is a lead. ValidateOnly rejects anything invalid. */
const ACTION_CATEGORY = 'PHONE_CALL_LEAD';

/** Business decision, not a technical one — see the header. */
const VALUE_ARG = process.argv.find((a) => a.startsWith('--value='));
const CALL_VALUE = VALUE_ARG ? Number(VALUE_ARG.split('=')[1]) : 0;

const {
  GOOGLE_ADS_CUSTOMER_ID,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
  GOOGLE_ADS_REFRESH_TOKEN,
  GOOGLE_ADS_LOGIN_CUSTOMER_ID,
} = process.env;

function post(path, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(bodyObj);
    const req = https.request(
      {
        host: HOST,
        path,
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = { raw: data }; }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function errLines(body) {
  const errs = (body && body.error && body.error.details
    ? body.error.details.flatMap((d) => d.errors || [])
    : []) || [];
  if (!errs.length) return [body && body.error ? body.error.message : JSON.stringify(body)];
  return errs.map((e) => {
    const code = e.errorCode ? Object.entries(e.errorCode).map(([k, v]) => `${k}=${v}`).join(',') : '';
    const loc = e.location ? ` @${(e.location.fieldPathElements || []).map((f) => f.fieldName).join('.')}` : '';
    return `${e.message}${code ? `  [${code}]` : ''}${loc}`;
  });
}

/** GAQL searchStream → flat array of result rows. */
async function search(headers, customerId, query) {
  const res = await post(`/${API_VERSION}/customers/${customerId}/googleAds:searchStream`, headers, { query });
  if (res.status !== 200) return { error: errLines(res.body).join(' | ') };
  return { body: res.body };
}

function rowsOf(body, key) {
  return (Array.isArray(body) ? body : [body])
    .flatMap((b) => b.results || [])
    .map((r) => r[key] || {});
}

/** Pull `AW-<id>/<label>` targets out of a tag snippet's generated code. */
function labelsFromTagSnippets(snippets) {
  const found = new Set();
  for (const s of snippets || []) {
    const text = [s.globalSiteTag, s.eventSnippet].filter(Boolean).join('\n');
    for (const m of text.matchAll(/AW-\d+\/[\w-]+/g)) found.add(m[0]);
  }
  return [...found];
}

/** The number the site renders, read from the single source of truth. */
function siteDisplayNumber() {
  try {
    const src = readFileSync(join(__dirname, '..', 'lib', 'contact.ts'), 'utf8');
    const m = /export const PHONE_DISPLAY\s*=\s*'([^']+)'/.exec(src);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/**
 * Reduce a number to comparable digits. The site renders `01270 897 606`, the
 * asset may hold `+441270897606` — same line, and a naive string compare would
 * report a mismatch and send someone editing a correct asset.
 */
function digits(v) {
  const d = String(v || '').replace(/\D/g, '');
  const national = d.startsWith('44') ? d.slice(2) : d;
  return national.replace(/^0/, '');
}

(async () => {
  const missing = ['GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN']
    .filter((k) => !process.env[k]);
  if (missing.length) {
    console.error('Missing env in .env.local: ' + missing.join(', '));
    process.exit(2);
  }

  const customerId = GOOGLE_ADS_CUSTOMER_ID.replace(/\D/g, '');

  const oauth2 = new google.auth.OAuth2(GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: GOOGLE_ADS_REFRESH_TOKEN });
  const { token } = await oauth2.getAccessToken();

  const headers = { Authorization: `Bearer ${token}`, 'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN };
  if (GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    headers['login-customer-id'] = GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');
  }

  console.log(`\nCustomer ${customerId}  |  login ${(GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/\D/g, '') || '<none>'}  |  API ${API_VERSION}`);
  console.log(`mode: ${APPLY ? 'APPLY (writes)' : 'DRY RUN (reads + validateOnly)'}`);
  console.log(`would create: "${ACTION_NAME}"  type=WEBSITE_CALL  category=${ACTION_CATEGORY}  minCallDuration=${MIN_CALL_DURATION_SECONDS}s  value=£${CALL_VALUE}`);

  // ── 1. Call reporting settings ─────────────────────────────────────────────
  console.log('\n[1/4] Call reporting settings …');
  const settingsRes = await search(
    headers,
    customerId,
    `SELECT customer.id,
            customer.call_reporting_setting.call_reporting_enabled,
            customer.call_reporting_setting.call_conversion_reporting_enabled,
            customer.call_reporting_setting.call_conversion_action
     FROM customer`,
  );
  if (settingsRes.error) {
    console.error('  ✘ ' + settingsRes.error);
    process.exit(1);
  }
  const cs = (rowsOf(settingsRes.body, 'customer')[0] || {}).callReportingSetting || {};
  console.log(`  call_reporting_enabled            : ${cs.callReportingEnabled}`);
  console.log(`  call_conversion_reporting_enabled : ${cs.callConversionReportingEnabled}`);
  console.log(`  call_conversion_action (default)  : ${cs.callConversionAction || '<none>'}`);
  const currentDefaultActionId = cs.callConversionAction
    ? cs.callConversionAction.split('/').pop()
    : null;

  // ── 2. Existing call conversion actions ────────────────────────────────────
  console.log('\n[2/4] Existing call conversion actions …');
  const caRes = await search(
    headers,
    customerId,
    // `conversion_action.value_settings` is PROHIBITED_FIELD_IN_SELECT_CLAUSE —
    // confirmed against the live API. It is readable on the mutation result and
    // in the UI, but it cannot be selected. Not a missing field, a forbidden one.
    `SELECT conversion_action.id, conversion_action.name, conversion_action.status,
            conversion_action.type, conversion_action.category,
            conversion_action.counting_type, conversion_action.primary_for_goal,
            conversion_action.phone_call_duration_seconds,
            conversion_action.tag_snippets
     FROM conversion_action
     WHERE conversion_action.type IN ('WEBSITE_CALL', 'AD_CALL')`,
  );
  if (caRes.error) {
    console.error('  ✘ ' + caRes.error);
    process.exit(1);
  }
  const callActions = rowsOf(caRes.body, 'conversionAction');

  const existing = callActions.find(
    (a) => a.type === 'WEBSITE_CALL' && a.status !== 'REMOVED',
  );

  // The account-level default action is what a call ASSET reports through when
  // its state is USE_ACCOUNT_LEVEL_CALL_CONVERSION_ACTION — which is the state
  // the live asset is in (see step 3). So a default pointing at a REMOVED action
  // means calls routed by that asset report into nothing, no matter how correct
  // the site is. This is checked here because it is invisible from the site.
  const defaultActionRow = callActions.find((a) => a.id === currentDefaultActionId);
  const defaultIsDead =
    currentDefaultActionId && (!defaultActionRow || defaultActionRow.status === 'REMOVED');
  if (defaultIsDead) {
    console.log(
      `  ✘ The account-level call conversion action (${currentDefaultActionId}) is ` +
        `${defaultActionRow ? 'REMOVED' : 'not a call action'}.`,
    );
    console.log('    It is the default that call assets report through. Left as-is, calls');
    console.log('    routed by the asset record nothing. Step 4 repoints it.');
  }

  if (!callActions.length) {
    console.log('  (none)');
  }
  for (const a of callActions) {
    console.log(`  • AW-${a.id}  ${a.status}  ${a.type}  category=${a.category}  counting=${a.countingType}  primaryForGoal=${a.primaryForGoal}`);
    console.log(`      name: ${a.name}`);
    console.log(`      minCallDurationSeconds: ${a.phoneCallDurationSeconds === undefined ? '<unset>' : a.phoneCallDurationSeconds}`);
    const labels = labelsFromTagSnippets(a.tagSnippets);
    console.log(`      labels: ${labels.length ? labels.join(', ') : '<none published>'}`);
  }

  // ── 3. CALL assets ─────────────────────────────────────────────────────────
  console.log('\n[3/4] Call assets (Google requires one carrying the same number) …');
  // `asset.call_asset.phone_number` is not present in every API version; fall
  // back to the fields that are, rather than failing the whole run over a
  // diagnostic.
  let assetRows = [];
  const assetQueryFull = `SELECT asset.id, asset.name, asset.type,
                                 asset.call_asset.country_code,
                                 asset.call_asset.phone_number,
                                 asset.call_asset.call_conversion_reporting_state
                          FROM asset WHERE asset.type = 'CALL'`;
  const assetQuerySafe = `SELECT asset.id, asset.name, asset.type,
                                 asset.call_asset.country_code,
                                 asset.call_asset.call_conversion_reporting_state
                          FROM asset WHERE asset.type = 'CALL'`;
  let assetRes = await search(headers, customerId, assetQueryFull);
  if (assetRes.error) {
    console.log('  (phone_number field unavailable in this API version — retrying without it)');
    assetRes = await search(headers, customerId, assetQuerySafe);
  }
  if (assetRes.error) {
    console.log('  ✘ could not read assets: ' + assetRes.error);
    console.log('    Check in the UI: Tools → Assets → Call assets.');
  } else {
    assetRows = rowsOf(assetRes.body, 'asset');
    const siteNumber = siteDisplayNumber();
    console.log(`  site renders PHONE_DISPLAY = ${siteNumber === null ? '<unreadable>' : siteNumber}`);
    if (!assetRows.length) {
      console.log('  ✘ NO call asset found. Google requires one carrying the same number,');
      console.log('    or website call conversions cannot report. Create it in:');
      console.log('    Tools → Assets → Call assets (phone number = the number above).');
    }
    for (const a of assetRows) {
      const ca = a.callAsset || {};
      const num = ca.phoneNumber;
      const matches = num && siteNumber ? digits(num) === digits(siteNumber) : null;
      console.log(`  • asset ${a.id}  ${a.name || '<unnamed>'}  country=${ca.countryCode || '?'}  state=${ca.callConversionReportingState || '?'}`);
      if (num) {
        console.log(`      phone: ${num}${matches === null ? '' : matches ? '   ✔ matches the site' : '   ✖ DOES NOT MATCH the site number — call conversions will not report'}`);
      }
      if (ca.callConversionReportingState === 'NOT_CALL_CONVERSION_ACTION') {
        console.log('      ✘ this asset is NOT set to report call conversions. NOT changed by this');
        console.log('        script (it is serving live ads). Fix in the UI: Assets → select the call');
        console.log('        asset → "Conversion reporting" → use the account-level call action.');
      }
    }
  }

  // ── 4. Plan → validateOnly → apply ─────────────────────────────────────────
  console.log('\n[4/4] Changes …');
  const operations = [];

  // CustomerService.mutate is a separate endpoint from conversionActions:mutate,
  // so each change goes as its own validateOnly call — one rejection cannot hide
  // the other's verdict.
  const customerOps = [];
  if (cs.callReportingEnabled !== true) {
    console.log('  • enable call_reporting_enabled');
    customerOps.push('call_reporting_setting.call_reporting_enabled');
  }
  if (cs.callConversionReportingEnabled !== true) {
    console.log('  • enable call_conversion_reporting_enabled');
    customerOps.push('call_reporting_setting.call_conversion_reporting_enabled');
  }
  if (!customerOps.length) console.log('  • call reporting: already enabled, nothing to change');

  // Repoint the account-level default at the live WEBSITE_CALL action, when the
  // current default is dead or is the removed AD_CALL one. The resource name is
  // only known once the action exists, so the write itself runs after creation
  // — with its own validateOnly immediately before it.
  const willRepoint = Boolean(defaultIsDead || (defaultActionRow && defaultActionRow.type === 'AD_CALL'));

  if (existing) {
    console.log(`  • conversion action: AW-${existing.id} "${existing.name}" already exists — NOT creating a duplicate`);
    if (existing.phoneCallDurationSeconds === undefined) {
      console.log('    ⚠ its minimum call duration is unset. ValidateOnly below will not change it;');
      console.log('      set it in the UI: Tools → Conversions → the action → Edit → Count.');
      // Number(), not a bare !==. The Ads API returns int64 fields as STRINGS,
      // so a stored 60 arrives as "60" and a strict compare against the numeric
      // 60 is always true — which printed a self-contradicting
      // "its minimum call duration is 60s, not 60s" on a correct account.
    } else if (Number(existing.phoneCallDurationSeconds) !== Number(MIN_CALL_DURATION_SECONDS)) {
      console.log(`    ⚠ its minimum call duration is ${existing.phoneCallDurationSeconds}s, not ${MIN_CALL_DURATION_SECONDS}s.`);
      console.log('      Not changed automatically — edit it in the UI if that is not deliberate.');
    }
  } else {
    console.log(`  • conversion action: create "${ACTION_NAME}" (WEBSITE_CALL)`);
    operations.push({
      create: {
        name: ACTION_NAME,
        type: 'WEBSITE_CALL',
        category: ACTION_CATEGORY,
        status: 'ENABLED',
        countingType: 'ONE_PER_CLICK',
        // MUST be true for WEBSITE_CALL — false is rejected as INVALID_VALUE.
        valueSettings: { defaultValue: CALL_VALUE, alwaysUseDefaultValue: true },
        phoneCallDurationSeconds: MIN_CALL_DURATION_SECONDS,
        primaryForGoal: false,
      },
    });
  }

  if (willRepoint) {
    console.log(
      `  • repoint the account-level call conversion action from ${currentDefaultActionId} ` +
        `to the new "${ACTION_NAME}" (after it is created)`,
    );
    // Said plainly rather than left as an implied gap: the repoint cannot be
    // validateOnly'd here because the resource it points at does not exist yet.
    // It gets its own validateOnly immediately before its own write.
    console.log('    (validated at apply time — it needs the new action to exist first)');
  }

  if (CALL_VALUE === 0 && !existing) {
    console.log('\n  ⚠ NOTE: the new action is valued at £0 (--value=N to change).');
    console.log('    Smart Bidding will count these calls but treat each as worth nothing.');
    console.log('    The action is also created primaryForGoal=false on purpose: it has never');
    console.log('    recorded a conversion, so it must not become a bidding target until calls');
    console.log('    are seen to arrive. Promote it in the UI once the data is real.');
  }

  // validateOnly — full server-side validation, writes nothing.
  let dryOk = true;
  if (operations.length) {
    console.log('\n  validateOnly conversionActions:mutate …');
    const dry = await post(`/${API_VERSION}/customers/${customerId}/conversionActions:mutate`, headers, {
      validateOnly: true,
      operations,
    });
    if (dry.status !== 200) {
      dryOk = false;
      console.error(`    ✘ HTTP ${dry.status}`);
      errLines(dry.body).forEach((l) => console.error(`      ${l}`));
    } else {
      console.log('    ✔ ACCEPTED — payload valid and these credentials can write. Nothing created.');
    }
  }
  if (customerOps.length) {
    console.log('  validateOnly customers:mutate …');
    const dry = await post(`/${API_VERSION}/customers/${customerId}:mutate`, headers, {
      validateOnly: true,
      operations: [
        {
          update: { resourceName: `customers/${customerId}` },
          updateMask: customerOps.join(','),
        },
      ],
    });
    if (dry.status !== 200) {
      dryOk = false;
      console.error(`    ✘ HTTP ${dry.status}`);
      errLines(dry.body).forEach((l) => console.error(`      ${l}`));
    } else {
      console.log('    ✔ ACCEPTED — nothing changed.');
    }
  }

  if (!APPLY) {
    console.log('\nDry run complete. Nothing was written. Re-run with --apply to make these changes.\n');
    return;
  }
  if (!dryOk) {
    console.error('\n  ✘ Refusing to apply: validateOnly rejected something above.\n');
    process.exit(1);
  }

  console.log('\n  Applying …');

  if (customerOps.length) {
    const res = await post(`/${API_VERSION}/customers/${customerId}:mutate`, headers, {
      operations: [
        {
          update: {
            resourceName: `customers/${customerId}`,
            callReportingSetting: {
              callReportingEnabled: true,
              callConversionReportingEnabled: true,
            },
          },
          updateMask: customerOps.join(','),
        },
      ],
    });
    if (res.status !== 200) {
      console.error(`    ✘ call reporting: HTTP ${res.status}`);
      errLines(res.body).forEach((l) => console.error(`      ${l}`));
      process.exit(1);
    }
    console.log('    ✔ call reporting enabled');
  }

  let createdId = existing ? existing.id : null;
  if (operations.length) {
    const res = await post(`/${API_VERSION}/customers/${customerId}/conversionActions:mutate`, headers, {
      operations,
    });
    if (res.status !== 200) {
      console.error(`    ✘ conversion action: HTTP ${res.status}`);
      errLines(res.body).forEach((l) => console.error(`      ${l}`));
      process.exit(1);
    }
    createdId = (res.body.results || [])[0]?.resourceName?.split('/').pop() || null;
    console.log(`    ✔ created AW-${createdId}`);
  }

  // Repoint the account-level default, now that the target exists. validateOnly
  // runs immediately before the write, so this step gets the same guarantee as
  // the ones above rather than riding on their verdict.
  if (willRepoint && createdId) {
    const repointResource = `customers/${customerId}/conversionActions/${createdId}`;
    const repointOp = {
      update: {
        resourceName: `customers/${customerId}`,
        callReportingSetting: { callConversionAction: repointResource },
      },
      updateMask: 'call_reporting_setting.call_conversion_action',
    };

    // `operation`, SINGULAR — CustomerService.MutateCustomer takes one
    // CustomerOperation, where conversionActions:mutate takes an `operations`
    // array. Sending the plural here is rejected with 'Unknown name
    // "operations": Cannot find field', which is easy to misread as a bad
    // updateMask rather than as the wrong envelope.
    const dry = await post(`/${API_VERSION}/customers/${customerId}:mutate`, headers, {
      validateOnly: true,
      operation: repointOp,
    });
    if (dry.status !== 200) {
      console.error(`    ✘ repoint: validateOnly rejected it (HTTP ${dry.status})`);
      errLines(dry.body).forEach((l) => console.error(`      ${l}`));
      console.error('      The default still points at the dead action. Repoint it in the UI:');
      console.error('      Tools → Conversions → Settings → "Call conversions from website".');
    } else {
      const res = await post(`/${API_VERSION}/customers/${customerId}:mutate`, headers, {
        operation: repointOp,
      });
      if (res.status !== 200) {
        console.error(`    ✘ repoint: HTTP ${res.status}`);
        errLines(res.body).forEach((l) => console.error(`      ${l}`));
      } else {
        console.log(`    ✔ account-level call conversion action → AW-${createdId}`);
      }
    }
  }

  // ── Re-read: never report a value we did not see stored ────────────────────
  if (!createdId) return;
  console.log('\n── Verifying what the account actually stored ────────');
  const lookRes = await search(
    headers,
    customerId,
    `SELECT conversion_action.id, conversion_action.name, conversion_action.status,
            conversion_action.type, conversion_action.category,
            conversion_action.counting_type, conversion_action.primary_for_goal,
            conversion_action.phone_call_duration_seconds,
            conversion_action.tag_snippets
     FROM conversion_action WHERE conversion_action.id = ${createdId}`,
  );
  if (lookRes.error) {
    console.log('  (could not re-read: ' + lookRes.error + ')');
    return;
  }
  const a = rowsOf(lookRes.body, 'conversionAction')[0] || {};
  console.log(`  id=${a.id}  ${a.status}  ${a.type}  category=${a.category}  counting=${a.countingType}  primaryForGoal=${a.primaryForGoal}`);
  console.log(`  name: ${a.name}`);
  console.log(`  minCallDurationSeconds: ${a.phoneCallDurationSeconds === undefined ? '<UNSET — set it in the UI>' : a.phoneCallDurationSeconds}`);

  const labels = labelsFromTagSnippets(a.tagSnippets);
  console.log('\n── Conversion label — paste this into NEXT_PUBLIC_GADS_CALL_CONV_ID ──');
  if (!labels.length) {
    console.log('  <no label published yet>. Snippets can lag a new action by a few minutes;');
    console.log('  re-run this script to read it, or copy it from Tools → Conversions → the');
    console.log('  action → "Tag setup" → "Use Google Tag Manager" / "Install the tag yourself".');
  } else {
    // Prefer a WEBPAGE label; the account can also publish mobile ones.
    console.log('  ' + labels.join('\n  '));
  }
  console.log('\n  The account half MUST match the site\'s NEXT_PUBLIC_GADS_ID.');
  console.log('  Set the value in .env.local AND in Vercel, then REDEPLOY — an env var alone');
  console.log('  changes nothing until a deployment picks it up.');
  console.log('\n  Then verify:  node scripts/reconcile-conversions.js\n');
})().catch((err) => {
  console.error('\nFATAL:', err.message || err);
  process.exit(1);
});
