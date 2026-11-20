// Impact Pulse and constellr debrief: alert email for Sven.
//
// Pure functions, no network and no environment access, so they can be tested on their own.
//   PULSE_FORMS                      form names this alert covers
//   buildPulseAlert(formName, fields) -> { subject, html, text } or { error }

import { esc, oneLine } from './scan-emails.mjs';

export const PULSE_FORMS = {
  'impact-pulse-v1': 'Impact Pulse',
  'constellr-debrief-v6': 'constellr debrief'
};

// Never shown in the alert: plumbing and honeypots.
const HIDDEN = new Set(['form-name', 'bot-field', 'company_tax_id', 'Submission Timestamp', 'ip', 'user_agent', 'referrer']);

const PUBLISH_WORDS = 'Permission: publish my words';
const PUBLISH_NAME = 'Permission: use my name and company';

function clip(v, n) { return oneLine(v).slice(0, n); }
function yes(v) { return oneLine(v) !== ''; }

function npsBand(raw) {
  const n = Number(oneLine(raw));
  if (!Number.isFinite(n) || oneLine(raw) === '') return '';
  return n >= 9 ? 'promoter' : n >= 7 ? 'passive' : 'detractor';
}

export function buildPulseAlert(formName, fields) {
  const label = PULSE_FORMS[formName];
  if (!label) return { error: 'unknown form' };
  const f = fields || {};

  const company = clip(f['Company'] || f['Client Account'], 80) || 'Unknown company';
  const person = clip(f['Executive Name'], 80);
  const role = clip(f['Role or Domain'], 80);
  const subject = clip(label + ': ' + company + (person ? ', ' + person : '') + (role ? ' (' + role + ')' : ''), 200);

  const publishWords = yes(f[PUBLISH_WORDS]);
  const publishName = yes(f[PUBLISH_NAME]);
  const permission = publishWords
    ? 'You may publish the words from question 7' + (publishName ? ', with name and company.' : ', without a name.')
    : 'No permission to publish. Keep question 7 private.';

  // Order: whatever Netlify stored, minus plumbing and the two permission fields (shown on top).
  const rows = [];
  for (const key of Object.keys(f)) {
    if (HIDDEN.has(key) || key === 'Company' || key === 'Client Account' || key === PUBLISH_WORDS || key === PUBLISH_NAME) continue;
    let value = String(f[key] === null || f[key] === undefined ? '' : f[key]).trim();
    if (value === '') continue;
    if (/NPS/.test(key)) { const band = npsBand(value); if (band) value += ' (' + band + ')'; }
    rows.push([key, value.slice(0, 4000)]);
  }

  const submitted = oneLine(f['Submission Timestamp']);

  const text = [
    label + ' received',
    'Company: ' + company,
    '',
    'Publishing: ' + permission,
    '',
    ...rows.map(([k, v]) => k + ': ' + v),
    submitted ? '' : null,
    submitted ? 'Submitted: ' + submitted : null,
    '',
    'All entries: https://app.netlify.com (Forms, ' + formName + ')'
  ].filter((x) => x !== null).join('\n');

  const tr = ([k, v]) =>
    '<tr><td style="padding:8px 12px 8px 0;vertical-align:top;color:#64748b;font-size:13px;width:38%">' + esc(k) + '</td>' +
    '<td style="padding:8px 0;vertical-align:top;color:#1e293b;font-size:14px;white-space:pre-wrap">' + esc(v) + '</td></tr>';

  const html =
    '<!doctype html><html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">' +
    '<div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px 28px">' +
    '<p style="margin:0 0 4px;color:#64748b;font-size:12px;letter-spacing:.06em;text-transform:uppercase">' + esc(label) + ' received</p>' +
    '<h1 style="margin:0 0 16px;color:#0B1523;font-size:22px">' + esc(company) + '</h1>' +
    '<p style="margin:0 0 18px;padding:10px 14px;border-radius:8px;background:' + (publishWords ? '#ecfdf5' : '#f8fafc') + ';color:#1e293b;font-size:14px">Publishing: ' + esc(permission) + '</p>' +
    '<table role="presentation" style="width:100%;border-collapse:collapse">' + rows.map(tr).join('') + '</table>' +
    (submitted ? '<p style="margin:18px 0 0;color:#94a3b8;font-size:12px">Submitted ' + esc(submitted) + '</p>' : '') +
    '</div></body></html>';

  return { subject, html, text };
}
