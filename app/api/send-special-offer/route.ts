import { NextRequest, NextResponse } from 'next/server';
import { emitFleetIngest } from '@/lib/fleet-ingest';
import { pushLeadToGhl } from '@/lib/ghl';
import { FORM_FIELD_RULES, validateLeadFields } from '@/lib/lead-validation';
import { verifyTurnstile } from '@/lib/turnstile';
import { logLeadSubmission } from '@/lib/lead-logger';
import { isSpamSubmission } from '@/lib/spam-filter';
import { getMailConfig, mailErrorResponseMessage } from '@/lib/mail';
import { checkRateLimit, getClientIp, isTooFast } from '@/lib/rate-limit';

const ghlOpps = require('@/lib/ghl/opportunities.js');

/**
 * After the contact lands in GHL: open a pipeline opportunity and fire the
 * speed-to-lead workflow (instant SMS/call). Non-blocking — never fatal.
 */
async function postLeadFollowUp(contactId: string | null, name: string) {
  if (!contactId) return;
  try {
    const { pipelines } = await ghlOpps.listPipelines();
    const first = pipelines[0];
    const firstStage = first && first.stages && first.stages[0];
    if (first && firstStage) {
      await ghlOpps.createOpportunity({
        contactId,
        name: `${name} — Special Offer`,
        pipelineId: first.id,
        stageId: firstStage.id,
        status: 'open',
      });
    }
  } catch (err) {
    console.warn('[ghl] opportunity create error:', err);
  }
  ghlOpps.triggerSpeedToLead(contactId, { source: 'special_offer' })
    .then((r: any) => { if (!r.triggered) console.log('[ghl] speed-to-lead not triggered:', r.reason); })
    .catch((err: any) => console.warn('[ghl] speed-to-lead error:', err));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();

    // Honeypot check — if filled, silently return success to trick bots
    if (formData.website) {
      console.log('[spam] Honeypot triggered for special offer form');
      return NextResponse.json(
        { success: true, message: 'Special offer request received' },
        { status: 200 }
      );
    }

    // B2B / link spam filter — drop solicitation pitches and scraper artifacts
    // silently so the sender doesn't loop, and never dispatch them to GHL/mail.
    if (isSpamSubmission(formData)) {
      console.log(`[spam] special-offer lead blocked by B2B/link filter — name="${formData.name}"`);
      return NextResponse.json(
        { success: true, message: 'Special offer request received' },
        { status: 200 }
      );
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

    if (!formData?.name || !formData?.phone) {
      return NextResponse.json(
        { success: false, error: 'Name and phone are required.' },
        { status: 400 }
      );
    }

    // Timing heuristic — reject a repeat submission from the same identity
    // arriving faster than a human can (scripted/retry bots). Fake success.
    if (isTooFast(clientIp, 3)) {
      console.log(`[spam] special-offer lead too fast from ${clientIp}`);
      return NextResponse.json(
        { success: true, message: 'Special offer request received' },
        { status: 200 }
      );
    }

    // Turnstile — env-gated. Only rejects when the gate is configured and the
    // token fails; otherwise permits through.
    const turnstile = await verifyTurnstile(formData.turnstileToken);
    if (!turnstile.ok) {
      console.log(`[spam] special-offer lead failed turnstile (${turnstile.reason}) from ${clientIp}`);
      return NextResponse.json(
        { success: false, error: 'CAPTCHA verification failed. Please try again.' },
        { status: 400 }
      );
    }

    // Content validation — reject junk leads (gibberish names, non-UK phones,
    // invalid postcodes) that the honeypot and IP rate limit let through.
    // Return a fake success so bots can't tell they've been filtered.
    //
    // Rules come from FORM_FIELD_RULES.specialOffer — name, phone, postcode.
    // Email is deliberately not required: this form's wizard only hard-requires
    // name/phone/service/roof-type and postcode, its Email input carries no
    // `required` attribute, and both offer pages check the format only *if*
    // something was typed. Requiring it server-side silently discarded every
    // submission where the customer skipped that field — and these two pages
    // have no Supabase write to recover it from.
    const spamReasons = validateLeadFields(formData, FORM_FIELD_RULES.specialOffer);
    if (spamReasons.length > 0) {
      console.log(`[spam] special-offer lead rejected (${spamReasons.join('; ')}) — name="${formData.name}" phone="${formData.phone}" postcode="${formData.postcode || ''}"`);
      return NextResponse.json(
        { success: true, message: 'Special offer request received' },
        { status: 200 }
      );
    }

    await emitFleetIngest({
      event_type: 'lead',
      summary: `Special offer: ${formData.name} (${formData.phone}) — ${formData.postcode || 'n/a'}`,
      payload: {
        name: formData.name,
        phone: formData.phone,
        postcode: formData.postcode,
        roofType: formData.roofType,
        serviceNeeded: formData.serviceNeeded,
        sameDayCallback: formData.sameDayCallback,
        message: formData.message,
      },
    });

    // Push the lead into GHL. Awaited so the serverless runtime doesn't freeze
    // the in-flight request when the response returns — pushLeadToGhl never
    // throws, so a GHL outage still can't lose the lead. The opportunity +
    // speed-to-lead follow-up stays fire-and-forget (secondary).
    const ghlContactId = await pushLeadToGhl({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      postcode: formData.postcode,
      gclid: formData.gclid,
      tags: ['website-lead', 'special-offer', ...(formData.gclid ? ['google-ads-lead'] : [])],
      source: 'special_offer',
      notes: `Service needed: ${formData.serviceNeeded || 'n/a'}\nRoof type: ${formData.roofType || 'n/a'}\nSame-day callback: ${formData.sameDayCallback ? 'Yes' : 'No'}\n\n${formData.message || ''}`,
      customFields: {
        ...(formData.roofType ? { roof_type: formData.roofType } : {}),
        ...(formData.serviceNeeded ? { service_needed: formData.serviceNeeded } : {}),
      },
    });
    if (!ghlContactId) {
      console.error(
        `[lead] GHL upsert failed — special-offer lead NOT in CRM. ` +
          `name="${formData.name}" phone="${formData.phone}" postcode="${formData.postcode}"`,
      );
    }
    postLeadFollowUp(ghlContactId, formData.name)
      .catch(err => console.warn('[ghl] special-offer follow-up error:', err));

    // Local audit log — fire-and-forget, never blocks the response path.
    logLeadSubmission('send-special-offer', formData);

    // Email dispatch. Recorded rather than returned-from, so the response can
    // report what actually happened instead of assuming success.
    let emailDelivered = false;
    let emailError: string | null = null;
    try {
      const { transporter, from, to } = getMailConfig();

      const emailHtml = `
      <h2>New Special Offer Form Submission</h2>
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p><strong>Name:</strong> ${formData.name}</p>
        <p><strong>Phone:</strong> ${formData.phone}</p>
        <p><strong>Postcode:</strong> ${formData.postcode}</p>
        ${formData.roofType ? `<p><strong>Roof Type:</strong> ${formData.roofType}</p>` : ''}
        ${formData.serviceNeeded ? `<p><strong>Service Needed:</strong> ${formData.serviceNeeded}</p>` : ''}
        <p><strong>Same Day Callback Requested:</strong> ${formData.sameDayCallback ? 'Yes' : 'No'}</p>
        ${formData.message ? `<p><strong>Project Details:</strong></p><p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${formData.message}</p>` : ''}
      </div>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #666; font-size: 12px;">
        This form was submitted from the Special Offer page.
      </p>
    `;

      await transporter.sendMail({
        from,
        to,
        subject: `New Special Offer Form Submission - ${formData.name}`,
        html: emailHtml,
      });
      emailDelivered = true;
    } catch (mailErr: unknown) {
      emailError = mailErrorResponseMessage(mailErr);
      console.error(
        `[lead] Special-offer mail failed — lead NOT in inbox. ` +
          `name="${formData.name}" phone="${formData.phone}" postcode="${formData.postcode}"`,
        mailErr,
      );
    }

    // Delivery integrity — a 200 here is a promise that the lead was captured.
    // GHL and SMTP are independent sinks, so the lead survives if EITHER took
    // it. It is only genuinely lost when both failed, and that is the one case
    // where returning success would be a lie the customer never recovers from.
    if (!ghlContactId && !emailDelivered) {
      console.error(
        `[lead] LOST — both GHL and SMTP failed for special-offer lead. ` +
          `name="${formData.name}" phone="${formData.phone}" postcode="${formData.postcode}" message="${formData.message}"`,
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
          : 'Lead received (email delivery pending)',
        ghl: ghlContactId ? 'ok' : 'failed',
        email: emailDelivered ? 'ok' : 'failed',
        ...(emailError ? { email_error: emailError } : {}),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error sending special offer:', error);
    return NextResponse.json(
      { success: false, error: mailErrorResponseMessage(error) },
      { status: 500 }
    );
  }
}
