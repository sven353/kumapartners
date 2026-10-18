// Netlify event function: runs automatically after every verified Netlify Forms submission.
// Netlify matches the file name "submission-created", so there is no route and no config to add.
//
// For the Leadership Friction Scan form only, it sends two emails in parallel:
//   1. the executive report to the respondent
//   2. a triage alert to Sven
// Every other form on the site is ignored here and keeps its normal Netlify handling.
//
// Environment variables (Netlify site settings, Environment variables):
//   RESEND_API_KEY      required. Resend API key. The sending domain (kuma.partners) must be verified in Resend.
//   NETLIFY_API_TOKEN   required. A Netlify personal access token. Used to re-read the submission from
//                       Netlify, because this function's URL is public and anyone could post a fake payload to it.
//   SCAN_FROM           optional. Default: Sven Mulfinger • Kuma Partners <sven@kuma.partners>
//   SCAN_REPLY_TO       optional. Default: sven@kuma.partners
//   SCAN_ALERT_TO       optional. Default: sven@kuma.partners
//   BOOKING_URL         optional. Calendly link for the debrief button. Default: the leadership-friction-debrief-30min event.
//   DATA_PURGE_LIVE     optional. Set to "true" only once responses really are purged after 30 days. It switches
//                       the governance line in the respondent email to the 30-day wording.
//
// If a required variable is missing the function logs the reason and does nothing. It never throws,
// so a problem here can never affect the visitor or the stored submission.

import { FORM_NAME, buildReport, renderRespondentEmail, renderTriageEmail, oneLine } from './lib/scan-emails.mjs';

const NETLIFY_API = 'https://api.netlify.com/api/v1';
const RESEND_API = 'https://api.resend.com/emails';

const ok = (body) => ({ statusCode: 200, body: JSON.stringify(body) });

// Re-reads the submission from Netlify so the payload cannot be forged by calling this URL directly.
async function fetchVerified(submissionId, token, fetchImpl) {
  const res = await fetchImpl(NETLIFY_API + '/submissions/' + encodeURIComponent(submissionId), {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) throw new Error('Netlify API returned ' + res.status);
  return res.json();
}

async function sendEmail(fetchImpl, apiKey, message, idempotencyKey) {
  const res = await fetchImpl(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(message)
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error('Resend returned ' + res.status + ' ' + detail.slice(0, 200));
  }
  return res.json().catch(() => ({}));
}

// Factory so tests can inject fetch and the environment.
export function createHandler({ fetchImpl = fetch, env = process.env, log = console } = {}) {
  return async function handler(event) {
    try {
      let payload;
      try { payload = JSON.parse(event.body || '{}').payload || {}; } catch (e) { return ok({ skipped: 'unreadable body' }); }

      if (payload.form_name !== FORM_NAME) return ok({ skipped: 'other form' });

      const claimed = payload.data || {};
      // Honeypots: any content means a bot. Nothing is sent.
      if (oneLine(claimed.company_tax_id) !== '' || oneLine(claimed['bot-field']) !== '') return ok({ skipped: 'honeypot' });

      if (!env.RESEND_API_KEY) { log.warn('[scan-emails] RESEND_API_KEY is not set, no emails sent'); return ok({ skipped: 'no email provider' }); }
      if (!env.NETLIFY_API_TOKEN) { log.warn('[scan-emails] NETLIFY_API_TOKEN is not set, cannot verify the submission, no emails sent'); return ok({ skipped: 'no verification token' }); }
      if (!payload.id) return ok({ skipped: 'no submission id' });

      // Trust Netlify's stored copy, not the posted payload.
      let stored;
      try { stored = await fetchVerified(payload.id, env.NETLIFY_API_TOKEN, fetchImpl); }
      catch (e) { log.warn('[scan-emails] could not verify submission ' + payload.id + ': ' + e.message); return ok({ skipped: 'unverified' }); }
      if (!stored || stored.form_name !== FORM_NAME || !stored.data) { log.warn('[scan-emails] submission ' + payload.id + ' is not a scan submission'); return ok({ skipped: 'unverified' }); }
      const fields = stored.data;
      if (oneLine(fields.company_tax_id) !== '' || oneLine(fields['bot-field']) !== '') return ok({ skipped: 'honeypot' });

      const report = buildReport(fields, { submittedAt: stored.created_at || payload.created_at });
      if (report.error) { log.warn('[scan-emails] submission ' + payload.id + ' rejected: ' + report.error); return ok({ skipped: report.error }); }

      const opts = {
        bookingUrl: env.BOOKING_URL || '',
        purgeLive: String(env.DATA_PURGE_LIVE || '').toLowerCase() === 'true',
        logoUrl: 'https://www.kuma.partners/assets/logo-lockup.png'
      };
      const from = env.SCAN_FROM || 'Sven Mulfinger • Kuma Partners <sven@kuma.partners>';
      const replyTo = env.SCAN_REPLY_TO || 'sven@kuma.partners';
      const alertTo = env.SCAN_ALERT_TO || 'sven@kuma.partners';

      const respondent = renderRespondentEmail(report, opts);
      const triage = renderTriageEmail(report);

      const results = await Promise.allSettled([
        sendEmail(fetchImpl, env.RESEND_API_KEY, {
          from, to: [report.email], reply_to: replyTo, subject: respondent.subject, html: respondent.html, text: respondent.text
        }, 'scan-report-' + payload.id),
        sendEmail(fetchImpl, env.RESEND_API_KEY, {
          from, to: [alertTo], reply_to: report.email, subject: triage.subject, html: triage.html, text: triage.text
        }, 'scan-alert-' + payload.id)
      ]);

      const names = ['respondent report', 'triage alert'];
      results.forEach((r, i) => {
        if (r.status === 'rejected') log.error('[scan-emails] ' + names[i] + ' failed for submission ' + payload.id + ': ' + r.reason.message);
      });
      return ok({ sent: results.map((r) => r.status === 'fulfilled') });
    } catch (e) {
      log.error('[scan-emails] unexpected error: ' + (e && e.message));
      return ok({ skipped: 'error' });
    }
  };
}

export const handler = createHandler();
