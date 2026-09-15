import { NextRequest, NextResponse } from 'next/server';
import { emitFleetIngest } from '@/lib/fleet-ingest';
import { pushLeadToGhl } from '@/lib/ghl';
import { getMailConfig, mailErrorResponseMessage } from '@/lib/mail';
import { checkRateLimit, getClientIp, isTooFast } from '@/lib/rate-limit';
import { FORM_FIELD_RULES, validateLeadFields, sanitizeLeadName } from '@/lib/lead-validation';
import { verifyTurnstile } from '@/lib/turnstile';
import { logLeadSubmission } from '@/lib/lead-logger';
import { assessSubmission } from '@/lib/spam-filter';
import { notifyOwnerOfLead } from '@/lib/sms-notify';
import { recordPipelineEvent, recordSilentDrop } from '@/lib/lead-health';

const ROUTE = 'send-quote';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();

    // Honeypot check — if filled, silently return success to trick bots
    if (formData.website) {
      console.log('[spam] Honeypot triggered for quote form');
      return NextResponse.json(
        { success: true, message: 'Quote request received' },
        { status: 200 }
      );
    }

    // Spam assessment — three-valued, deliberately asymmetric. Only a confident
    // 'block' is dropped (with a decoy 200 so bots can't adapt). A 'review'
    // verdict delivers the lead normally and tags it `needs-review` in GHL, so a
    // human decides. Dropping a real customer is far worse than admitting spam —
    // see the header of lib/spam-filter.ts.
    const spam = assessSubmission(formData);
    if (spam.verdict === 'block') {
      recordSilentDrop(
        ROUTE,
        `rejected-by-filter: ${spam.reasons.join(', ')}`,
        `name="${formData.name}"`,
      );
      return NextResponse.json(
        { success: true, message: 'Quote request received' },
        { status: 200 }
      );
    }
    const needsReview = spam.verdict === 'review';
    if (needsReview) {
      void recordPipelineEvent({
        source: ROUTE,
        channel: 'filter',
        ok: true,
        detail: `flagged-for-review: ${spam.reasons.join(', ')}`,
      });
    }

    // Rate limiting — max 3 submissions per IP per hour
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(clientIp, 3, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      console.log(`[spam] Rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        { success: false, error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    // Isolate any ad-tracking token that leaked into the name field: keep it in
    // the dedicated gclid metadata, fall the display name back to a placeholder.
    const nameResolution = sanitizeLeadName(formData?.name);
    if (nameResolution.leakedGclid && !formData?.gclid) {
      formData.gclid = nameResolution.leakedGclid;
    }
    formData.name = nameResolution.name;

    if (!formData?.name || !formData?.phone || !formData?.postcode) {
      return NextResponse.json(
        { success: false, error: 'Name, phone and postcode are required.' },
        { status: 400 }
      );
    }

    // Timing heuristic — reject a repeat submission from the same identity
    // arriving faster than a human can re-read and re-submit (retry/scripted
    // bots). Fake success so bots can't tell they've been filtered.
    if (isTooFast(clientIp, 3)) {
      recordSilentDrop(ROUTE, 'submitted too fast', `ip=${clientIp}`);
      return NextResponse.json(
        { success: true, message: 'Quote request received' },
        { status: 200 }
      );
    }

    // Turnstile — env-gated. A configured gate rejects invalid/missing tokens;
    // an unconfigured one passes everyone through. When the gate is on and the
    // token fails, return a hard 400 (bot should give up), not a fake success.
    const turnstile = await verifyTurnstile(formData.turnstileToken);
    if (!turnstile.ok) {
      console.log(`[spam] quote lead failed turnstile (${turnstile.reason}) from ${clientIp}`);
      return NextResponse.json(
        { success: false, error: 'CAPTCHA verification failed. Please try again.' },
        { status: 400 }
      );
    }

    // Content validation — reject junk leads the honeypot + rate limit let
    // through. Return a fake success so bots can't tell they've been filtered.
    const spamReasons = validateLeadFields(formData, FORM_FIELD_RULES.quote);
    if (spamReasons.length > 0) {
      recordSilentDrop(
        ROUTE,
        `validation: ${spamReasons.join('; ')}`,
        `name="${formData.name}" phone="${formData.phone}" postcode="${formData.postcode}"`,
      );
      return NextResponse.json(
        { success: true, message: 'Quote request received' },
        { status: 200 }
      );
    }

    // Await so Vercel does not kill the fetch before JARVIS receives it.
    await emitFleetIngest({
      event_type: 'lead',
      summary: `Quote request: ${formData.name} (${formData.email}) — ${formData.service_type || 'n/a'} (${formData.postcode || 'n/a'})`,
      payload: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        postcode: formData.postcode,
        service_type: formData.service_type,
        roof_type: formData.roof_type,
        message: formData.message,
      },
    });

    // Push the lead into GHL. Awaited so the serverless runtime doesn't freeze
    // the in-flight request — pushLeadToGhl never throws, so a GHL outage
    // still can't lose the lead.
    // Resolves to null when the upsert failed — the only reliable signal that
    // the CRM did NOT take the lead. pushLeadToGhl never throws, so without
    // this check a CRM outage is indistinguishable from a CRM success.
    const ghlContactId = await pushLeadToGhl({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      postcode: formData.postcode,
      gclid: formData.gclid,
      tags: [
        'website-lead',
        'cheshire-roof-quote',
        ...(formData.gclid ? ['google-ads-lead'] : []),
        ...(needsReview ? ['needs-review'] : []),
      ],
      source: 'quote_form',
      notes: `Service: ${formData.service_type || 'n/a'}\nRoof type: ${formData.roof_type || 'n/a'}\n\n${formData.message || ''}`,
      customFields: {
        ...(formData.service_type ? { service_type: formData.service_type } : {}),
        ...(formData.roof_type ? { roof_type: formData.roof_type } : {}),
      },
    });
    void recordPipelineEvent({
      source: ROUTE,
      channel: 'ghl',
      ok: !!ghlContactId,
      detail: ghlContactId ? undefined : 'upsert failed — lead not in CRM',
    });
    if (!ghlContactId) {
      console.error(
        `[lead] GHL upsert failed — quote lead NOT in CRM. ` +
          `name="${formData.name}" email="${formData.email}" phone="${formData.phone}" postcode="${formData.postcode}"`,
      );
    }

    // Local audit log — fire-and-forget, never blocks the response path.
    logLeadSubmission('send-quote', formData);

    // Owner notification SMS. Awaited for the same reason as the GHL push —
    // serverless may freeze an in-flight request once the response returns.
    // notifyOwnerOfLead never throws, so a failed or unconfigured SMS cannot
    // change the customer's outcome; it is logged inside the module.
    await notifyOwnerOfLead({
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      postcode: formData.postcode,
      service: formData.service_type,
      source: 'quote form',
    });

    // Email dispatch. Recorded rather than returned-from, so the response can
    // report what actually happened instead of assuming success.
    let emailDelivered = false;
    let emailError: string | null = null;
    try {
      const { transporter, from, to } = getMailConfig();

      const emailHtml = `
      <h2>New Quote Request</h2>
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p><strong>Name:</strong> ${formData.name}</p>
        ${formData.email ? `<p><strong>Email:</strong> ${formData.email}</p>` : ''}
        <p><strong>Phone:</strong> ${formData.phone}</p>
        <p><strong>Postcode:</strong> ${formData.postcode}</p>
        ${formData.service_type ? `<p><strong>Service Type:</strong> ${formData.service_type}</p>` : ''}
        ${formData.roof_type ? `<p><strong>Roof Type:</strong> ${formData.roof_type}</p>` : ''}
        ${formData.message ? `<p><strong>Additional Details:</strong></p><p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${formData.message}</p>` : ''}
      </div>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #666; font-size: 12px;">
        This quote request was submitted from the website.
      </p>
    `;

      await transporter.sendMail({
        from,
        to,
        subject: `New Quote Request - ${formData.service_type || 'Free Inspection'} (${formData.name})`,
        html: emailHtml,
      });
      emailDelivered = true;
    } catch (mailErr: unknown) {
      emailError = mailErrorResponseMessage(mailErr);
      console.error(
        `[lead] Quote mail failed — lead NOT in inbox. ` +
          `name="${formData.name}" email="${formData.email}" phone="${formData.phone}"`,
        mailErr,
      );
    }

    void recordPipelineEvent({
      source: ROUTE,
      channel: 'email',
      ok: emailDelivered,
      detail: emailDelivered ? undefined : emailError || 'SMTP send failed',
    });

    // Delivery integrity — a 200 here is a promise that the lead was captured.
    // GHL and SMTP are independent sinks, so the lead survives if EITHER took
    // it. It is only genuinely lost when both failed, and that is the one case
    // where returning success would be a lie the customer never recovers from.
    if (!ghlContactId && !emailDelivered) {
      console.error(
        `[lead] LOST — both GHL and SMTP failed for quote lead. ` +
          `name="${formData.name}" email="${formData.email}" phone="${formData.phone}" postcode="${formData.postcode}" message="${formData.message}"`,
      );
      return NextResponse.json(
        {
          success: false,
          error: 'We could not record your request. Please call us on 01270 897 606.',
          ghl: 'failed',
          email_error: emailError,
        },
        { status: 502 }
      );
    }

    // Partial delivery is still a captured lead — report it honestly rather
    // than as a clean success, so the caller can see which sink missed it.
    return NextResponse.json(
      {
        success: true,
        message: emailDelivered
          ? 'Email sent successfully'
          : 'Quote received (email delivery pending)',
        ghl: ghlContactId ? 'ok' : 'failed',
        email: emailDelivered ? 'ok' : 'failed',
        ...(emailError ? { email_error: emailError } : {}),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error sending quote:', error);
    return NextResponse.json(
      { success: false, error: mailErrorResponseMessage(error) },
      { status: 500 }
    );
  }
}
