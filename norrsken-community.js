// Founders offsite page (/offsite/norrsken-community): two dates, price by registration date, honest urgency line and Netlify Forms AJAX submit.
document.addEventListener('DOMContentLoaded', function () {
  var cfg = window.JO || { max: 15, closed: false, earlyUntil: '2026-12-10T23:59:59+01:00', taken: {}, dates: [
    { value: '7 and 8 January', closeAt: '2026-12-18T23:59:59+01:00' },
    { value: '28 and 29 January', closeAt: '2027-01-15T23:59:59+01:00' }] };
  var now = new Date();
  var early = new Date(cfg.earlyUntil);

  function daysTo(d) { return Math.max(0, Math.ceil((d - now) / 86400000)); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  // A date is open until its own close time, or until it is full
  var dates = cfg.dates.map(function (d) {
    var taken = (cfg.taken && cfg.taken[d.value]) || 0;
    var closeAt = new Date(d.closeAt);
    return { value: d.value, closeAt: closeAt, taken: taken, open: !cfg.closed && now <= closeAt && taken < cfg.max };
  });
  var openDates = dates.filter(function (d) { return d.open; });
  var tier = openDates.length === 0 ? 'closed' : (now <= early ? 'early' : 'standard');

  var priceNow = document.querySelector('[data-price-now]');
  var priceNote = document.querySelector('[data-price-note]');
  var urgency = document.querySelector('[data-urgency]');

  var taken = dates.filter(function (d) { return d.taken > 0; }).map(function (d) { return d.value + ': ' + d.taken + ' of ' + cfg.max + ' places taken'; });
  var places = 'Fifteen places per date, one room each.' + (taken.length ? ' ' + taken.join('. ') + '.' : '');
  var nextClose = openDates.slice().sort(function (x, y) { return x.closeAt - y.closeAt; })[0];

  if (tier === 'early') {
    if (priceNow) priceNow.textContent = '€990 + VAT';
    if (priceNote) priceNote.textContent = 'Early price until 10 December. From 11 December the price is €1,450 + VAT.';
    var d = daysTo(early);
    if (urgency) urgency.textContent = places + ' The early price ends ' + (d <= 1 ? 'today.' : 'in ' + plural(d, 'day') + '.');
  } else if (tier === 'standard') {
    if (priceNow) priceNow.textContent = '€1,450 + VAT';
    if (priceNote) priceNote.textContent = 'The early price of €990 + VAT ended on 10 December.';
    var c = daysTo(nextClose.closeAt);
    if (urgency) urgency.textContent = places + ' Registration for ' + nextClose.value + ' closes ' + (c <= 1 ? 'today.' : 'in ' + plural(c, 'day') + '.');
  } else {
    if (priceNow) priceNow.textContent = 'Closed';
    if (priceNote) priceNote.textContent = 'Registration is closed.';
    if (urgency) urgency.textContent = 'Registration is closed.';
  }

  var form = document.getElementById('norrsken-community-form');
  var closedPanel = document.querySelector('[data-jo-closed]');
  var successPanel = document.getElementById('review-success-panel');
  var params = new URLSearchParams(window.location.search);

  function showSuccess() {
    if (form) form.hidden = true;
    if (successPanel) {
      successPanel.hidden = false;
      successPanel.focus({ preventScroll: true });
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  // Back from the no-JavaScript fallback POST
  if (params.get('submitted') === '1') { showSuccess(); return; }

  if (tier === 'closed') {
    if (form) form.hidden = true;
    if (closedPanel) closedPanel.hidden = false;
    return;
  }
  if (!form) return;

  var tierField = document.getElementById('field-price-tier');
  var timeField = document.getElementById('field-submission-time');
  var errorEl = form.querySelector('[data-review-error]');
  var btn = form.querySelector('[data-review-submit]');
  var dateBoxes = Array.prototype.slice.call(form.querySelectorAll('input[data-date]'));
  var dateField = document.getElementById('field-dates');
  var dateError = form.querySelector('[data-dates-error]');
  dateBoxes.forEach(function (box) {
    var info = dates.filter(function (d) { return d.value === box.value; })[0];
    if (info && !info.open) {
      box.disabled = true; box.checked = false;
      var pill = box.closest('.checkbox-pill');
      var lab = pill && pill.querySelector('.pill-label');
      if (lab) lab.textContent += info.taken >= cfg.max ? ' (full)' : ' (registration closed)';
    }
    box.addEventListener('change', syncDates);
  });
  function syncDates() {
    var picked = dateBoxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
    if (dateField) dateField.value = picked.join(' and ');
    if (dateError && picked.length) dateError.hidden = true;
    return picked;
  }
  syncDates();
  if (tierField) tierField.value = tier === 'early' ? 'Early €990 + VAT' : 'Standard €1,450 + VAT';

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!syncDates().length) {
      if (dateError) dateError.hidden = false;
      var grp = document.getElementById('dates-group');
      if (grp) grp.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (timeField) timeField.value = new Date().toISOString();
    if (errorEl) errorEl.hidden = true;
    var original = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (r) {
      if (!r.ok) throw new Error('Status ' + r.status);
      showSuccess();
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.innerHTML = original; }
      if (errorEl) errorEl.hidden = false;
    });
  });
});
