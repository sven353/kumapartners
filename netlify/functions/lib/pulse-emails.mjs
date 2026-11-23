// Impact Pulse and constellr debrief: alert email for Sven.
//
// Pure functions, no network and no environment access, so they can be tested on their own.
//   PULSE_FORMS                      form names this alert covers
//   buildPulseAlert(formName, fields) -> { subject, html, text } or { error }

import { esc, oneLine } from './scan-emails.mjs';

export const PULSE_FORMS = {
  'impact-pulse-v1': 'Impact Pulse',
  'constellr-debrief-v6': 'constellr debrief',
  'norrsken-community-v1': 'Founders offsite',
  'norrsken-community-worksheet-v1': 'Founders worksheet',
  'norrsken-community-call-v1': 'Founders call request'
};

export const OFFSITE_FORM = 'norrsken-community-v1';
export const WORKSHEET_FORM = 'norrsken-community-worksheet-v1';
export const CALL_FORM = 'norrsken-community-call-v1';

// Never shown in the alert: plumbing and honeypots.
const HIDDEN = new Set(['form-name', 'bot-field', 'company_tax_id', 'Submission Timestamp', 'Price tier shown', 'ip', 'user_agent', 'referrer']);

const PUBLISH_WORDS = 'Permission: publish my words';
const PUBLISH_NAME = 'Permission: use my name and company';

function clip(v, n) { return oneLine(v).slice(0, n); }
function yes(v) { return oneLine(v) !== ''; }

function npsBand(raw) {
  const n = Number(oneLine(raw));
  if (!Number.isFinite(n) || oneLine(raw) === '') return '';
  return n >= 9 ? 'promoter' : n >= 7 ? 'passive' : 'detractor';
}

export function buildPulseAlert(formName, fields, opts = {}) {
  const label = PULSE_FORMS[formName];
  if (!label) return { error: 'unknown form' };
  const f = fields || {};

  const isOffsite = formName === OFFSITE_FORM;
  const tier = isOffsite ? (opts.tier || '') : '';
  const company = clip(f['Company'] || f['Client Account'], 80) || 'Unknown company';
  const person = clip(f['Executive Name'] || f['Full name'], 80);
  const role = clip(f['Role or Domain'] || f['Role'], 80);
  const engagement = clip(f['Engagement'], 60);
  const subject = clip(label + ': ' + company + (person ? ', ' + person : '') + (role ? ' (' + role + ')' : '') + (engagement ? ', ' + engagement : '') + (tier ? ', ' + tier : ''), 200);

  const publishWords = yes(f[PUBLISH_WORDS]);
  const publishName = yes(f[PUBLISH_NAME]);
  const permission = publishWords
    ? 'You may publish the words from question 7' + (publishName ? ', with name and company.' : ', without a name.')
    : 'No permission to publish. Keep question 7 private.';
  const isWorksheet = formName === WORKSHEET_FORM;
  const isCall = formName === CALL_FORM;
  const topLine = isCall
    ? 'Call request, 30 minutes with Sven or Farid. Reply with a time or your booking link.'
    : isWorksheet
    ? 'Copy sent for information. Match it to the registration by email address.'
    : isOffsite
    ? 'Dates: ' + (oneLine(f['Dates that work']) || 'not stated') + '. Price tier: ' + (tier || 'unknown') + (oneLine(f['Price tier shown']) ? ' (the page showed: ' + oneLine(f['Price tier shown']) + ')' : '') + '. ' + offsiteDeadline(f['Dates that work']) + '.'
    : 'Publishing: ' + permission;

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
    engagement ? 'Engagement: ' + engagement : null,
    '',
    topLine,
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
    '<h1 style="margin:0 0 4px;color:#0B1523;font-size:22px">' + esc(company) + '</h1>' +
    (engagement ? '<p style="margin:0 0 16px;color:#17677B;font-size:14px">' + esc(engagement) + '</p>' : '<p style="margin:0 0 12px"></p>') +
    '<p style="margin:0 0 18px;padding:10px 14px;border-radius:8px;background:' + ((publishWords || isOffsite || isWorksheet || isCall) ? '#ecfdf5' : '#f8fafc') + ';color:#1e293b;font-size:14px">' + esc(topLine) + '</p>' +
    '<table role="presentation" style="width:100%;border-collapse:collapse">' + rows.map(tr).join('') + '</table>' +
    (submitted ? '<p style="margin:18px 0 0;color:#94a3b8;font-size:12px">Submitted ' + esc(submitted) + '</p>' : '') +
    '</div></body></html>';

  return { subject, html, text };
}

// Payment deadline text for the dates a founder ticked.
export function offsiteDeadline(dates) {
  const d = String(dates || '');
  const a = d.includes('7 and 8');
  const b = d.includes('28 and 29');
  if (a && !b) return 'Invoice due within 7 days and by 21 December';
  if (b && !a) return 'Invoice due within 7 days and by 15 January';
  return 'Invoice due within 7 days and by 21 December (7 and 8 January) or 15 January (28 and 29 January)';
}

// Price tier from the time Netlify stored the submission (Spain winter time, UTC+1).
// Early price until the end of 10 December 2026, standard price until registration closes on 15 January 2027.
export function offsiteTier(createdAt) {
  const t = Date.parse(createdAt || '');
  if (!Number.isFinite(t)) return '';
  if (t <= Date.parse('2026-12-10T23:59:59+01:00')) return 'Early, EUR 990 + VAT';
  if (t <= Date.parse('2027-01-15T23:59:59+01:00')) return 'Standard, EUR 1,450 + VAT';
  return 'After registration closed, check with Sven';
}

// Confirmation for the registrant. Plain and short, no promises beyond the page.
export function buildOffsiteConfirmation(fields, tier) {
  const f = fields || {};
  const first = clip(f['Full name'], 80).split(' ')[0] || 'there';
  const picked = oneLine(f['Dates that work']);
  const both = picked.includes('7 and 8') && picked.includes('28 and 29');
  const when = both ? 'Thursday 7 and Friday 8 January, or Thursday 28 and Friday 29 January 2027 (we confirm your date with the invoice)'
    : picked.includes('28 and 29') ? 'Thursday 28 and Friday 29 January 2027'
    : 'Thursday 7 and Friday 8 January 2027';
  const deadline = offsiteDeadline(picked).replace('Invoice due', 'The full amount is due').replace(/^The full amount is due within 7 days and by/, 'The full amount is due within 7 days of the invoice and no later than').replace(' (7 and 8 January) or ', ' for 7 and 8 January or ').replace(' (28 and 29 January)', ' for 28 and 29 January');
  const subject = 'Your request for a place at the founders offsite';
  const worksheet = 'https://www.kuma.partners/offsite/norrsken-community/worksheet';
  const lines = [
    'Hello ' + first + ',',
    '',
    'We have your request for a place at the founders offsite on ' + when + ', one night in nature near Barcelona. We confirm every place personally and come back to you shortly.',
    '',
    'Price: ' + (tier || 'see the page') + '.',
    'If it is a fit, we email you for your invoice details and then send the invoice from Kuma Partners. ' + deadline + '. Your place is confirmed when we receive it.',
    'If the offsite does not take place for any reason, you get back everything you paid.',
    '',
    'While you wait, start your year review. Nine private questions about where you are and where you want to go: ' + worksheet,
    '',
    'Sven Mulfinger and Farid Chaouki'
  ];
  const text = lines.join('\n');
  const html = '<!doctype html><html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:26px 28px;color:#1e293b;font-size:15px;line-height:1.6">' +
    '<p style="margin:0 0 14px">Hello ' + esc(first) + ',</p>' +
    '<p style="margin:0 0 14px">We have your request for a place at the founders offsite on ' + when + ', one night in nature near Barcelona. We confirm every place personally and come back to you shortly.</p>' +
    '<p style="margin:0 0 14px">Price: ' + esc(tier || 'see the page') + '.<br>If it is a fit, we email you for your invoice details and then send the invoice from Kuma Partners. ' + deadline + '. Your place is confirmed when we receive it.<br>If the offsite does not take place for any reason, you get back everything you paid.</p>' +
    '<p style="margin:0 0 14px">While you wait, start your year review. Nine private questions about where you are and where you want to go: <a href="' + worksheet + '" style="color:#17677B">open the worksheet</a>.</p>' +
    '<p style="margin:0">Sven Mulfinger and Farid Chaouki</p></div></body></html>';
  return { subject, html, text };
}
