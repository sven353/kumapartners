// Netlify scheduled function: sends the 3-step follow-up sequence to people who completed the scan.
// Runs hourly (UTC). Scheduled functions only run on the published production deploy, never on previews.
// To test: Netlify dashboard, Functions, nurture-sweep, "Run now".
//
// Environment variables:
//   NURTURE_ENABLED     required, must be "true". Without it the function does nothing, so nothing is
//                       ever sent by accident.
//   RESEND_API_KEY      required (shared with submission-created).
//   NETLIFY_API_TOKEN   required (shared with submission-created). Used to list scan submissions.
//   CALENDLY_API_TOKEN  required. Personal access token. Used to skip anyone who has booked a debrief.
//                       If Calendly cannot be reached the person is skipped this run, never emailed blind.
//   NURTURE_OPTOUT      optional. Comma-separated email addresses to exclude (people who replied "stop").
//   BOOKING_URL, SCAN_FROM, SCAN_REPLY_TO  optional, same as submission-created.
//
// SITE_ID is provided by Netlify at runtime.
// Suppression covers a booking made with the same email address as the scan. A different booking email
// is not matched.

import { FORM_NAME, buildReport, oneLine } from './lib/scan-emails.mjs';
import { dueSteps, renderNurture, MAX_AGE_MS } from './lib/scan-nurture.mjs';

const NETLIFY_API = 'https://api.netlify.com/api/v1';
const CALENDLY_API = 'https://api.calendly.com';
const RESEND_API = 'https://api.resend.com/emails';

export function createSweep({ fetchImpl = fetch, env = process.env, log = console, now = () => Date.now() } = {}) {
  const jget = async (url, token) => {
    const res = await fetchImpl(url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
    if (!res.ok) throw new Error(url.split('?')[0] + ' returned ' + res.status);
    return res.json();
  };

  return async function sweep() {
    const summary = { sent: 0, skipped: 0, errors: 0 };
    if (String(env.NURTURE_ENABLED || '').toLowerCase() !== 'true') { log.log('[nurture] disabled (NURTURE_ENABLED is not "true")'); return { ...summary, disabled: true }; }
    const missing = ['RESEND_API_KEY', 'NETLIFY_API_TOKEN', 'CALENDLY_API_TOKEN', 'SITE_ID'].filter((k) => !env[k]);
    if (missing.length) { log.warn('[nurture] missing ' + missing.join(', ') + '; nothing sent'); return { ...summary, disabled: true }; }

    const optout = new Set(String(env.NURTURE_OPTOUT || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
    const t = now();
    const cutoff = t - MAX_AGE_MS;

    // 1. Find the scan form and read its recent submissions, newest first.
    let subs = [];
    try {
      const forms = await jget(NETLIFY_API + '/sites/' + env.SITE_ID + '/forms', env.NETLIFY_API_TOKEN);
      const form = (forms || []).find((f) => f.name === FORM_NAME);
      if (!form) { log.warn('[nurture] scan form not found'); return summary; }
      for (let page = 1; page <= 5; page += 1) {
        const batch = await jget(NETLIFY_API + '/forms/' + form.id + '/submissions?per_page=100&page=' + page, env.NETLIFY_API_TOKEN);
        if (!Array.isArray(batch) || !batch.length) break;
        subs = subs.concat(batch);
        if (Date.parse(batch[batch.length - 1].created_at) < cutoff) break;
      }
    } catch (e) { log.warn('[nurture] could not list submissions: ' + e.message); return { ...summary, errors: 1 }; }

    // 2. One sequence per email address: the newest submission wins.
    const latest = new Map();
    for (const s of subs) {
      const em = oneLine(s && s.data && s.data.email).toLowerCase();
      if (!em) continue;
      const prev = latest.get(em);
      if (!prev || Date.parse(s.created_at) > Date.parse(prev.created_at)) latest.set(em, s);
    }

    let orgUri = null;
    const booked = async (email, since) => {
      if (!orgUri) {
        const me = await jget(CALENDLY_API + '/users/me', env.CALENDLY_API_TOKEN);
        orgUri = me && me.resource && me.resource.current_organization;
        if (!orgUri) throw new Error('no Calendly organization');
      }
      const q = '?organization=' + encodeURIComponent(orgUri) + '&invitee_email=' + encodeURIComponent(email) +
        '&min_start_time=' + encodeURIComponent(new Date(since).toISOString()) + '&status=active&count=1';
      const r = await jget(CALENDLY_API + '/scheduled_events' + q, env.CALENDLY_API_TOKEN);
      return Array.isArray(r.collection) && r.collection.length > 0;
    };

    const from = env.SCAN_FROM || 'Sven Mulfinger • Kuma Partners <sven@kuma.partners>';
    const replyTo = env.SCAN_REPLY_TO || 'sven@kuma.partners';

    for (const [email, s] of latest) {
      const steps = dueSteps(s.created_at, t);
      if (!steps.length) continue;
      if (optout.has(email)) { summary.skipped += 1; continue; }
      if (oneLine(s.data.company_tax_id) !== '' || oneLine(s.data['bot-field']) !== '') { summary.skipped += 1; continue; }
      const report = buildReport(s.data, { submittedAt: s.created_at });
      if (report.error || report.insufficient) { summary.skipped += 1; continue; }

      try {
        if (await booked(email, s.created_at)) { log.log('[nurture] ' + s.id + ' has booked; sequence stopped'); summary.skipped += 1; continue; }
      } catch (e) { log.warn('[nurture] Calendly check failed for ' + s.id + ': ' + e.message + '; skipped this run'); summary.errors += 1; continue; }

      for (const n of steps) {
        const mail = renderNurture(n, report, { bookingUrl: env.BOOKING_URL || '' });
        const body = {
          from, to: [email], reply_to: replyTo, subject: mail.subject, text: mail.text,
          headers: { 'List-Unsubscribe': '<mailto:' + replyTo + '?subject=stop>' }
        };
        if (mail.html) body.html = mail.html;
        try {
          const res = await fetchImpl(RESEND_API, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'scan-nurture-' + n + '-' + s.id },
            body: JSON.stringify(body)
          });
          if (!res.ok) throw new Error('Resend returned ' + res.status);
          summary.sent += 1;
        } catch (e) { log.warn('[nurture] send failed for ' + s.id + ' step ' + n + ': ' + e.message); summary.errors += 1; }
      }
    }
    log.log('[nurture] done ' + JSON.stringify(summary));
    return summary;
  };
}

export default async () => {
  try { await createSweep()(); } catch (e) { console.warn('[nurture] unexpected: ' + e.message); }
  return new Response('ok');
};

export const config = { schedule: '@hourly' };
