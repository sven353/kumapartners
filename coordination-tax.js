/* Coordination Tax Calculator (/coordination-tax)
   Vanilla JS, no dependencies. Everything recalculates on input, with no network calls until the
   visitor asks for the breakdown. Edit CONFIG below to connect booking and a CRM webhook. */
(function () {
  'use strict';

  // ------------------------------ CONFIG ------------------------------
  var CONFIG = {
    // Calendar link for the debrief buttons and the PDF. While empty it falls back to the
    // homepage contact section, so the button always goes somewhere real.
    bookingUrl: 'https://calendly.com/sven-mulfinger/leadership-friction-debrief-30min',
    // Public address of the calculator. Every share link is built from this.
    shareUrl: 'https://www.kuma.partners/coordination-tax',
    // Optional second destination for the lead (HubSpot, Zapier, Make). Receives JSON after the Netlify
    // form accepts the submission. Leave empty to rely on Netlify Forms alone.
    crmWebhookUrl: '',
    // Submissions faster than this after page load are treated as bots and get a normal-looking success.
    minFillMs: 2500
  };

  // Model constants. Shown to visitors in "How this is calculated".
  var WEEKS_PER_YEAR = 46;
  var HOURS_PER_WEEK = 40;
  var HOURS_PER_YEAR = WEEKS_PER_YEAR * HOURS_PER_WEEK; // 1,840
  var WORKING_DAYS = WEEKS_PER_YEAR * 5; // 230

  var LIMITS = {
    team: { min: 3, max: 25, step: 1 },
    meet: { min: 4, max: 35, step: 1 },
    comp: { min: 80000, max: 350000, step: 5000 }
  };

  // Pure calculation, kept separate from the DOM so it can be tested on its own.
  function compute(input) {
    var frictionShare = input.frictionPct / 100;
    var payroll = input.team * input.comp;
    var meetingPayroll = payroll * (input.meet / HOURS_PER_WEEK);
    var cost = meetingPayroll * frictionShare;
    var annualMeetingHours = input.team * input.meet * WEEKS_PER_YEAR;
    var dragHours = annualMeetingHours * frictionShare;
    var weeklyLost = input.meet * frictionShare;
    return {
      payroll: payroll,
      meetingPayroll: meetingPayroll,
      cost: cost,
      annualMeetingHours: annualMeetingHours,
      dragHours: dragHours,
      fte: dragHours / HOURS_PER_YEAR,
      weeklyLost: weeklyLost,
      capacityPct: (weeklyLost / HOURS_PER_WEEK) * 100
    };
  }

  function clamp(value, limits) {
    if (isNaN(value)) return limits.min;
    var v = Math.min(limits.max, Math.max(limits.min, value));
    return Math.round(v / limits.step) * limits.step;
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { compute: compute, clamp: clamp, isValidEmail: isValidEmail, LIMITS: LIMITS };
  }
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    var pageLoadedAt = Date.now();
    var nf = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
    var nf1 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    var state = { team: 6, meet: 14, comp: 150000, frictionPct: 35, delay: 0, currency: 'EUR', symbol: '€' };
    var DELAY_MAX = 1000000000;

    var numInputs = { team: byId('ct-team'), meet: byId('ct-meet'), comp: byId('ct-comp') };
    var ranges = { team: byId('ct-team-range'), meet: byId('ct-meet-range'), comp: byId('ct-comp-range') };
    var outs = {};
    Array.prototype.forEach.call(document.querySelectorAll('[data-ct-out]'), function (el) {
      outs[el.getAttribute('data-ct-out')] = el;
    });
    var delayInput = document.getElementById('ct-delay');
    var delayCard = document.querySelector('[data-ct-delay-card]');
    var live = document.querySelector('[data-ct-live]');
    var liveTimer = null;

    function byId(id) { return document.getElementById(id); }

    // Working weeks each leader loses a year: drag hours per leader over a 40-hour week.
    function weeksPerLeader(r) { return r.dragHours / state.team / HOURS_PER_WEEK; }

    // ---------------- render ----------------
    function render() {
      var r = compute(state);
      outs.cost.textContent = nf.format(Math.round(r.cost));
      outs.cost2.textContent = nf.format(Math.round(r.cost));
      outs.payroll.textContent = nf.format(Math.round(r.payroll));
      outs.meetingPayroll.textContent = nf.format(Math.round(r.meetingPayroll));
      outs.hours.textContent = nf.format(Math.round(r.dragHours));
      outs.fte.textContent = nf1.format(r.fte);
      outs.weekly.textContent = nf1.format(r.weeklyLost);
      outs.capacity.textContent = Math.round(r.capacityPct) + '%';
      outs.cost3.textContent = nf.format(Math.round(r.cost));
      outs.perWeek.textContent = nf.format(Math.round(r.cost / WEEKS_PER_YEAR));
      outs.perDay.textContent = nf.format(Math.round(r.cost / WORKING_DAYS));
      outs.weeks.textContent = nf1.format(weeksPerLeader(r));

      var hasDelay = state.delay > 0;
      delayCard.hidden = !hasDelay;
      if (hasDelay) {
        outs.delayMonth.textContent = nf.format(Math.round(state.delay));
        outs.delayQuarter.textContent = nf.format(Math.round(state.delay * 3));
      }
      Array.prototype.forEach.call(document.querySelectorAll('[data-ct-book-label]'), function (el) {
        el.textContent = 'Talk through your ' + state.symbol + nf.format(Math.round(r.cost)) + ' with a Kuma partner';
      });

      Object.keys(ranges).forEach(function (key) {
        var l = LIMITS[key];
        ranges[key].style.setProperty('--pct', ((state[key] - l.min) / (l.max - l.min) * 100) + '%');
      });
      ranges.comp.setAttribute('aria-valuetext', state.symbol + nf.format(state.comp));
      ranges.meet.setAttribute('aria-valuetext', state.meet + ' hours per week');

      // Screen readers get one calm summary after the visitor pauses, not a stream while dragging.
      window.clearTimeout(liveTimer);
      liveTimer = window.setTimeout(function () {
        live.textContent = 'Coordination drag costs ' + state.symbol + nf.format(Math.round(r.cost)) + ' a year, ' +
          nf.format(Math.round(r.dragHours)) + ' hours, or ' + nf1.format(r.fte) + ' full-time leaders.';
      }, 500);
    }

    function setValue(key, value, source) {
      state[key] = value;
      if (source !== 'num') numInputs[key].value = value;
      if (source !== 'range') ranges[key].value = value;
      render();
    }

    Object.keys(ranges).forEach(function (key) {
      ranges[key].addEventListener('input', function () {
        setValue(key, clamp(parseFloat(ranges[key].value), LIMITS[key]), 'range');
      });
      // Typing: update live while the number is in range, tidy up on blur or Enter.
      numInputs[key].addEventListener('input', function () {
        var v = parseFloat(numInputs[key].value);
        if (!isNaN(v) && v >= LIMITS[key].min && v <= LIMITS[key].max) {
          setValue(key, v, 'num');
        }
      });
      numInputs[key].addEventListener('change', function () {
        setValue(key, clamp(parseFloat(numInputs[key].value), LIMITS[key]));
      });
    });

    // ---------------- radio-style button groups ----------------
    function wireRadioGroup(buttons, onSelect) {
      function select(btn, focus) {
        buttons.forEach(function (b) {
          var on = b === btn;
          b.setAttribute('aria-checked', on ? 'true' : 'false');
          b.tabIndex = on ? 0 : -1;
        });
        if (focus) btn.focus();
        onSelect(btn);
      }
      buttons.forEach(function (btn, i) {
        btn.addEventListener('click', function () { select(btn, false); });
        btn.addEventListener('keydown', function (e) {
          var next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = buttons[(i + 1) % buttons.length];
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = buttons[(i - 1 + buttons.length) % buttons.length];
          if (next) { e.preventDefault(); select(next, true); }
        });
      });
    }

    wireRadioGroup(Array.prototype.slice.call(document.querySelectorAll('[data-ct-friction]')), function (btn) {
      state.frictionPct = parseInt(btn.getAttribute('data-ct-friction'), 10);
      render();
    });

    wireRadioGroup(Array.prototype.slice.call(document.querySelectorAll('[data-ct-currency]')), function (btn) {
      state.currency = btn.getAttribute('data-ct-currency');
      state.symbol = btn.getAttribute('data-symbol');
      Array.prototype.forEach.call(document.querySelectorAll('[data-ct-cur]'), function (el) { el.textContent = state.symbol; });
      render();
    });

    // ---------------- optional cost of delay ----------------
    function setDelay(value) {
      var v = parseFloat(value);
      state.delay = (isNaN(v) || v < 0) ? 0 : Math.min(DELAY_MAX, Math.round(v));
      render();
    }
    delayInput.addEventListener('input', function () { setDelay(delayInput.value); });

    // ---------------- lead capture ----------------
    var form = document.querySelector('[data-ct-form]');
    var formView = document.querySelector('[data-ct-form-view]');
    var success = document.querySelector('[data-ct-success]');
    var successText = document.querySelector('[data-ct-success-text]');
    var successSub = document.querySelector('[data-ct-success-sub]');
    var contactBox = form.querySelector('[data-ct-contact]');
    var submitBtn = form.querySelector('[data-ct-submit]');
    var submitLabel = submitBtn.querySelector('[data-btn-label]');
    var formError = form.querySelector('[data-ct-form-error]');
    var busy = false;

    function utmString() {
      try {
        var p = new URLSearchParams(window.location.search);
        return ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
          .filter(function (k) { return p.get(k); })
          .map(function (k) { return k + '=' + p.get(k); }).join('&');
      } catch (e) { return ''; }
    }

    function snapshot() {
      var r = compute(state);
      return {
        currency: state.currency,
        team_size: state.team,
        meeting_hours_per_week: state.meet,
        avg_annual_cost: state.comp,
        friction_pct: state.frictionPct,
        annual_drag_cost: Math.round(r.cost),
        annual_drag_hours: Math.round(r.dragHours),
        fte_equivalent: Math.round(r.fte * 10) / 10,
        capacity_lost_pct: Math.round(r.capacityPct * 10) / 10,
        weeks_per_leader: Math.round(weeksPerLeader(r) * 10) / 10,
        monthly_delay_cost: state.delay > 0 ? state.delay : ''
      };
    }

    // The hidden Netlify fields always carry the model exactly as it stands when the visitor submits.
    function fillHiddenFields() {
      var snap = snapshot();
      Object.keys(snap).forEach(function (k) { form.elements[k].value = String(snap[k]); });
      form.elements.utm.value = utmString();
      form.elements.contact_me.value = contactBox.checked ? 'Yes' : 'No';
      return snap;
    }

    function looksLikeBot() {
      var trap = form.querySelector('[name="company_tax_id"]');
      if (trap && trap.value.trim() !== '') return true;
      var honey = form.querySelector('[name="bot-field"]');
      if (honey && honey.value.trim() !== '') return true;
      return (Date.now() - pageLoadedAt) < CONFIG.minFillMs;
    }

    function isLocalPreview() {
      var h = window.location.hostname;
      return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || /\.localhost$/.test(h);
    }

    function forwardToCrm(body) {
      if (!CONFIG.crmWebhookUrl) return;
      try {
        fetch(CONFIG.crmWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          keepalive: true
        }).catch(function () { /* best effort, never blocks the visitor */ });
      } catch (e) { /* same */ }
    }

    function submitLead(body) {
      if (isLocalPreview()) {
        if (window.console && console.info) console.info('[Coordination Tax] local preview, lead not sent', body);
        return Promise.resolve(body);
      }
      return fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (response) {
        if (!response.ok) throw new Error('Form submission failed with status ' + response.status);
        forwardToCrm(body);
        return body;
      });
    }

    function setInvalid(name, on) {
      var field = form.querySelector('[data-ct-error="' + name + '"]').closest('.field');
      field.classList.toggle('is-invalid', on);
    }

    function firstName(full) {
      var t = String(full || '').trim().split(/\s+/)[0];
      return t || '';
    }

    function showSuccess(name, wantsContact) {
      fillReport(name);
      refreshShareLinks();
      var first = firstName(name);
      successText.textContent = first ? 'Thank you, ' + first + '. Your breakdown is ready.' : 'Your breakdown is ready.';
      successSub.textContent = wantsContact
        ? 'A Kuma partner will be in touch about your numbers. You can also pick a time yourself below.'
        : 'Download the PDF, share it with a peer or book a time to go through the numbers.';
      formView.hidden = true;
      success.hidden = false;
      success.focus();
    }

    form.elements.email.addEventListener('input', function () { setInvalid('email', false); });
    form.elements.stage.addEventListener('change', function () { setInvalid('stage', false); });
    form.elements.name.addEventListener('input', function () { setInvalid('name', false); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var stage = form.elements.stage.value;
      var okName = name !== '';
      var okEmail = isValidEmail(email);
      var okStage = stage !== '';
      setInvalid('name', !okName);
      setInvalid('email', !okEmail);
      setInvalid('stage', !okStage);
      if (!okName) { form.elements.name.focus(); return; }
      if (!okEmail) { form.elements.email.focus(); return; }
      if (!okStage) { form.elements.stage.focus(); return; }

      var snap = fillHiddenFields();
      var body = {
        product_intent: 'coordination-tax-calculator',
        name: name,
        email: email,
        stage: stage,
        contact_me: contactBox.checked ? 'Yes' : 'No',
        model: snap,
        source: '/coordination-tax',
        utm: utmString(),
        referrer: document.referrer || '',
        submitted_at: new Date().toISOString()
      };

      // Bots get the normal confirmation and no network call, so they have no error to retry on.
      if (looksLikeBot()) { showSuccess(name, contactBox.checked); return; }

      formError.hidden = true;
      busy = true;
      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';

      submitLead(body).then(function () {
        busy = false;
        showSuccess(name, contactBox.checked);
      }).catch(function () {
        busy = false;
        submitBtn.disabled = false;
        submitLabel.textContent = 'Download my breakdown (PDF) →';
        formError.hidden = false;
      });
    });

    // ---------------- booking link ----------------
    var bookUrl = CONFIG.bookingUrl || 'https://www.kuma.partners/#contact';
    Array.prototype.forEach.call(document.querySelectorAll('[data-ct-book]'), function (book) {
      if (!CONFIG.bookingUrl) return;
      book.setAttribute('href', CONFIG.bookingUrl);
      if (/^https?:/i.test(CONFIG.bookingUrl)) {
        book.setAttribute('target', '_blank');
        book.setAttribute('rel', 'noopener');
      }
    });

    // ---------------- shared links open with the sender's inputs ----------------
    (function applySharedInputs() {
      var p;
      try { p = new URLSearchParams(window.location.search); } catch (e) { return; }
      var map = { t: 'team', m: 'meet', c: 'comp' };
      var touched = false;
      Object.keys(map).forEach(function (q) {
        var raw = p.get(q);
        if (raw === null || raw === '') return;
        var v = parseFloat(raw);
        if (isNaN(v)) return;
        setValue(map[q], clamp(v, LIMITS[map[q]]));
        touched = true;
      });
      var d = parseFloat(p.get('d'));
      if (!isNaN(d) && d > 0) {
        delayInput.value = String(Math.min(DELAY_MAX, Math.round(d)));
        setDelay(delayInput.value);
        touched = true;
      }
      var f = p.get('f');
      if (f === '20' || f === '35' || f === '50') {
        var fb = document.querySelector('[data-ct-friction="' + f + '"]');
        if (fb) { fb.click(); touched = true; }
      }
      var cur = p.get('cur');
      if (cur === 'EUR' || cur === 'USD') {
        var cb = document.querySelector('[data-ct-currency="' + cur + '"]');
        if (cb) { cb.click(); touched = true; }
      }
      return touched;
    })();

    // ---------------- PDF breakdown (browser print, same approach as the Leadership Friction Scan) ----------------
    var report = document.querySelector('[data-ct-report]');
    function rep(key) { return report.querySelector('[data-rep="' + key + '"]'); }
    function money(n) { return state.symbol + nf.format(Math.round(n)); }

    function fillReport(name) {
      var r = compute(state);
      var today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      rep('meta').textContent = (name ? 'Prepared for ' + name + ' • ' : '') + today;
      rep('lede').textContent = 'With ' + state.team + ' leaders spending ' + state.meet + ' hours a week in internal meetings and ' +
        state.frictionPct + '% of that time adding no decision, coordination drag costs about ' + money(r.cost) + ' a year.';
      rep('cost').textContent = money(r.cost);
      rep('hours').textContent = nf.format(Math.round(r.dragHours)) + ' hrs';
      rep('fteText').textContent = 'Equivalent to ' + nf1.format(r.fte) + ' full-time leaders of capacity.';
      rep('perDay').textContent = 'About ' + money(r.cost / WEEKS_PER_YEAR) + ' a week, or ' + money(r.cost / WORKING_DAYS) + ' for every working day.';
      rep('weekly').textContent = nf1.format(weeksPerLeader(r)) + ' wks';
      rep('capacityText').textContent = 'Working weeks lost per leader, every year. In an ordinary week that is ' + nf1.format(r.weeklyLost) +
        ' hours, or ' + Math.round(r.capacityPct) + '% of a 40-hour week.';
      var delayBlock = rep('delayBlock');
      if (state.delay > 0) {
        delayBlock.hidden = false;
        rep('delayText').textContent = 'At ' + money(state.delay) + ' a month, every quarter a decision waits costs you ' + money(state.delay * 3) +
          '. This is your own figure and sits on top of the payroll cost above.';
      } else {
        delayBlock.hidden = true;
      }
      rep('ctaText').textContent = 'Talk through your ' + money(r.cost) + ' with a Kuma partner. Book 30 minutes and bring your answers to the questions above.';
      rep('in-team').textContent = String(state.team);
      rep('in-meet').textContent = state.meet + ' hours';
      rep('in-comp').textContent = money(state.comp);
      rep('in-friction').textContent = state.frictionPct + '%';

      var rows = [[20, 'Optimised / lean'], [35, 'Typical scale-up'], [50, 'High drag / consensus trap']];
      var body = rep('scenarios');
      body.textContent = '';
      rows.forEach(function (row) {
        var sc = compute({ team: state.team, meet: state.meet, comp: state.comp, frictionPct: row[0] });
        var tr = document.createElement('tr');
        if (row[0] === state.frictionPct) tr.className = 'is-current';
        [row[0] + '% ' + row[1], money(sc.cost), nf.format(Math.round(sc.dragHours)), nf1.format(sc.fte)].forEach(function (cell) {
          var td = document.createElement('td');
          td.textContent = cell;
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });

      rep('book').textContent = bookUrl;
      report.setAttribute('data-ready', 'true');
    }

    var originalTitle = document.title;
    function restoreTitle() { document.title = originalTitle; }
    window.addEventListener('afterprint', restoreTitle);

    var downloadBtn = document.querySelector('[data-ct-download]');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        fillReport(form.elements.name.value.trim());
        document.title = 'Coordination tax breakdown | Kuma Partners';
        window.print();
        window.setTimeout(restoreTitle, 1500);
      });
    }

    // ---------------- sharing ----------------
    var shareStatus = document.querySelector('[data-ct-share-status]');
    var statusTimer = null;
    function flash(text) {
      if (!shareStatus) return;
      shareStatus.textContent = text;
      window.clearTimeout(statusTimer);
      statusTimer = window.setTimeout(function () { shareStatus.textContent = ''; }, 3500);
    }

    function calcLink(source) {
      return CONFIG.shareUrl + '?utm_source=' + source + '&utm_medium=share';
    }
    function resultsLink(source) {
      return CONFIG.shareUrl + '?t=' + state.team + '&m=' + state.meet + '&c=' + state.comp + '&f=' + state.frictionPct +
        '&cur=' + state.currency + (state.delay > 0 ? '&d=' + state.delay : '') +
        '&utm_source=' + source + '&utm_medium=share';
    }
    function mailto(subject, body) {
      return 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body).replace(/%0A/g, '%0D%0A');
    }
    function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      return new Promise(function (resolve, reject) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('copy failed'));
      });
    }

    function refreshShareLinks() {
      var r = compute(state);
      var calcMail = document.querySelector('[data-ct-mail="calc"]');
      if (calcMail) {
        calcMail.setAttribute('href', mailto(
          'What does coordination drag cost your leadership team?',
          'I tried this calculator from Kuma Partners. It models what meeting load and consensus loops cost an executive team each year, in money, hours and full-time capacity.\n\nTry it with your own figures:\n' + calcLink('peer_mail') + '\n'
        ));
      }
      var resMail = document.querySelector('[data-ct-mail="results"]');
      if (resMail) {
        resMail.setAttribute('href', mailto(
          'Our coordination tax: ' + money(r.cost) + ' a year',
          'I ran our leadership team through the Coordination Tax Calculator from Kuma Partners.\n\n' +
          state.team + ' leaders, ' + state.meet + ' meeting hours a week each, ' + state.frictionPct + '% of that time adding no decision. ' +
          'It comes to about ' + money(r.cost) + ' a year, or ' + nf1.format(r.fte) + ' full-time leaders.\n\n' +
          'The inputs are filled in, so change them to fit your own team:\n' + resultsLink('peer_mail') + '\n'
        ));
      }
      var ln = document.querySelector('[data-ct-linkedin]');
      if (ln) ln.setAttribute('href', 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(calcLink('linkedin')));
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-ct-copy]'), function (btn) {
      btn.addEventListener('click', function () {
        var which = btn.getAttribute('data-ct-copy');
        var link = which === 'results' ? resultsLink('peer_copy') : calcLink('peer_copy');
        copyText(link).then(
          function () { flash('Link copied.'); },
          function () { flash('Copy failed. Copy this link by hand: ' + link); }
        );
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ct-mail], [data-ct-linkedin]'), function (a) {
      a.addEventListener('mouseenter', refreshShareLinks);
      a.addEventListener('focus', refreshShareLinks);
      a.addEventListener('touchstart', refreshShareLinks, { passive: true });
    });
    refreshShareLinks();

    render();
  });
})();
