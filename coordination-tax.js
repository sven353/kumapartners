/* Coordination Tax Calculator (/coordination-tax)
   Vanilla JS, no dependencies. Everything recalculates on input, with no network calls until the
   visitor asks for the breakdown. Edit CONFIG below to connect booking and a CRM webhook. */
(function () {
  'use strict';

  // ------------------------------ CONFIG ------------------------------
  var CONFIG = {
    // Calendar link for the "Book a 30-Minute Telemetry Debrief" button. While empty it falls back to the
    // homepage contact section, so the button always goes somewhere real.
    bookingUrl: '',
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

    var state = { team: 6, meet: 14, comp: 150000, frictionPct: 35, currency: 'EUR', symbol: '€' };

    var numInputs = { team: byId('ct-team'), meet: byId('ct-meet'), comp: byId('ct-comp') };
    var ranges = { team: byId('ct-team-range'), meet: byId('ct-meet-range'), comp: byId('ct-comp-range') };
    var outs = {};
    Array.prototype.forEach.call(document.querySelectorAll('[data-ct-out]'), function (el) {
      outs[el.getAttribute('data-ct-out')] = el;
    });
    var live = document.querySelector('[data-ct-live]');
    var liveTimer = null;

    function byId(id) { return document.getElementById(id); }

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

    // ---------------- lead capture ----------------
    var form = document.querySelector('[data-ct-form]');
    var formView = document.querySelector('[data-ct-form-view]');
    var success = document.querySelector('[data-ct-success]');
    var successText = document.querySelector('[data-ct-success-text]');
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
        capacity_lost_pct: Math.round(r.capacityPct * 10) / 10
      };
    }

    // The hidden Netlify fields always carry the model exactly as it stands when the visitor submits.
    function fillHiddenFields() {
      var snap = snapshot();
      Object.keys(snap).forEach(function (k) { form.elements[k].value = String(snap[k]); });
      form.elements.utm.value = utmString();
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

    function showSuccess(email) {
      successText.textContent = 'Breakdown requested. We will send it to ' + email + ' within 24 hours.';
      formView.hidden = true;
      success.hidden = false;
      success.focus();
    }

    form.elements.email.addEventListener('input', function () { setInvalid('email', false); });
    form.elements.stage.addEventListener('change', function () { setInvalid('stage', false); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var email = form.elements.email.value.trim();
      var stage = form.elements.stage.value;
      var okEmail = isValidEmail(email);
      var okStage = stage !== '';
      setInvalid('email', !okEmail);
      setInvalid('stage', !okStage);
      if (!okEmail) { form.elements.email.focus(); return; }
      if (!okStage) { form.elements.stage.focus(); return; }

      var snap = fillHiddenFields();
      var body = {
        product_intent: 'coordination-tax-calculator',
        email: email,
        stage: stage,
        model: snap,
        source: '/coordination-tax',
        utm: utmString(),
        referrer: document.referrer || '',
        submitted_at: new Date().toISOString()
      };

      // Bots get the normal confirmation and no network call, so they have no error to retry on.
      if (looksLikeBot()) { showSuccess(email); return; }

      formError.hidden = true;
      busy = true;
      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';

      submitLead(body).then(function () {
        busy = false;
        showSuccess(email);
      }).catch(function () {
        busy = false;
        submitBtn.disabled = false;
        submitLabel.textContent = 'Receive Telemetry Breakdown (PDF) →';
        formError.hidden = false;
      });
    });

    // ---------------- booking link ----------------
    var book = document.querySelector('[data-ct-book]');
    if (book && CONFIG.bookingUrl) {
      book.setAttribute('href', CONFIG.bookingUrl);
      if (/^https?:/i.test(CONFIG.bookingUrl)) {
        book.setAttribute('target', '_blank');
        book.setAttribute('rel', 'noopener');
      }
    }

    render();
  });
})();
