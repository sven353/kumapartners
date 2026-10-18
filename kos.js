// Kuma Partners: Kuma Operating System router (/KOS)
// Vanilla JS, no dependencies, same conventions as site.js.
//
// Cards 2 to 4 open an access request drawer (name, work email, company or fund). Each
// submission is tagged with the product the visitor asked for, as product_intent, and goes to
// Netlify Forms (form "kos-interest") and, if configured, to a second webhook. Configure
// everything in CONFIG below.

(function () {
  'use strict';

  var CONFIG = {
    // Booking link for the 30-minute friction debrief (Cal.com, HubSpot Meetings, Chili Piper).
    // While empty, the link at the bottom of the page goes to the intake form on the homepage.
    bookingUrl: '',

    // Optional second destination for each interest event, sent as JSON. Netlify Forms always
    // receives the submission first, and a failure here never blocks the visitor.
    crmWebhookUrl: '',

    // Anti-bot: minimum time between the drawer opening and a valid submit.
    minFillMs: 1500
  };

  // The three pilot instruments. The key is the product_intent value written to the CRM.
  // `accessUrl` is optional: when set, the confirmation also shows a button to open the tool
  // straight away. Leave it empty while the tool is not ready. Example for card 3, if you want to
  // route people to the calculator that already lives at velocity.kuma.partners:
  // accessUrl: 'https://velocity.kuma.partners'.
  var DIAGNOSTICS = {
    'co-founder-radar': {
      product: 'Co-Founder Alignment Radar',
      modalTitle: 'Join the Pilot Cohort',
      modalLead: 'The Dual-Input Co-Founder Alignment Radar is currently in private pilot for executive pairs. Enter your work email to request early access.',
      accessUrl: ''
    },
    'coordination-tax-calculator': {
      product: 'Executive Coordination Tax Calculator',
      modalTitle: 'Request Benchmark Telemetry',
      modalLead: 'Access the interactive model to calculate executive consensus cost and runway drag on your balance sheet.',
      accessUrl: ''
    },
    'vc-portfolio-velocity-benchmark': {
      product: 'VC Portfolio Velocity Benchmark',
      modalTitle: 'Investor & Board Telemetry',
      modalLead: 'Access the portfolio operating framework designed for Venture Partners and Operating Executives.',
      accessUrl: ''
    }
  };

  // Same list the homepage scan modal blocks, so every Kuma form applies one policy.
  var FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'live.com', 'msn.com', 'proton.me', 'protonmail.com'];

  function isFreeEmail(email) {
    var domain = email.split('@')[1] ? email.split('@')[1].toLowerCase() : '';
    return FREE_EMAIL_DOMAINS.indexOf(domain) !== -1;
  }
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  // Test hook for Node. In the browser `module` is undefined, so this is a no-op.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DIAGNOSTICS: DIAGNOSTICS, isFreeEmail: isFreeEmail, isValidEmail: isValidEmail };
  }
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    var overlay = document.getElementById('kos-modal-overlay');
    if (!overlay) return;

    var modal = overlay.querySelector('.scan-modal');
    var formView = overlay.querySelector('[data-kos-form-view]');
    var form = overlay.querySelector('[data-kos-form]');
    var titleEl = overlay.querySelector('[data-kos-title]');
    var leadEl = overlay.querySelector('[data-kos-lead]');
    var nameInput = form.elements.name;
    var emailInput = form.elements.email;
    var companyInput = form.elements.company;
    var nameError = overlay.querySelector('[data-kos-name-error]');
    var emailError = overlay.querySelector('[data-kos-email-error]');
    var companyError = overlay.querySelector('[data-kos-company-error]');
    var submitBtn = form.querySelector('[data-kos-submit]');
    var submitLabel = submitBtn.querySelector('[data-btn-label]');
    var formError = overlay.querySelector('[data-kos-error]');
    var success = overlay.querySelector('[data-kos-success]');
    var successLink = overlay.querySelector('[data-kos-success-link]');

    var current = null;       // key of the open diagnostic
    var openedAt = 0;
    var lastFocused = null;
    var busy = false;
    var closeTimer = null;
    var backgroundEls = [document.querySelector('header.site'), document.getElementById('main-content'), document.querySelector('footer.site')];

    // ---- analytics-neutral events: other scripts can listen for these. They never carry the email. ----
    function emit(name, detail) {
      try { document.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) { /* old browsers */ }
    }

    // ---- drawer ----
    function setBackgroundInert(on) {
      backgroundEls.forEach(function (el) {
        if (!el) return;
        if (on) { el.setAttribute('inert', ''); } else { el.removeAttribute('inert'); }
      });
    }

    function openDrawer(key, opener) {
      var d = DIAGNOSTICS[key];
      if (!d) return;
      if (closeTimer) { window.clearTimeout(closeTimer); closeTimer = null; }
      current = key;
      lastFocused = opener || document.activeElement;

      titleEl.textContent = d.modalTitle;
      leadEl.textContent = d.modalLead;
      form.elements.product_intent.value = key;
      form.elements.product_name.value = d.product;

      resetState();
      overlay.hidden = false;
      document.body.classList.add('scan-modal-locked');
      setBackgroundInert(true);
      window.requestAnimationFrame(function () { overlay.classList.add('open'); });
      openedAt = Date.now();
      window.setTimeout(function () { nameInput.focus(); }, 60);
      document.addEventListener('keydown', onKeydown);
      emit('kos:interest-open', { product_intent: key });
    }

    function closeDrawer() {
      overlay.classList.remove('open');
      document.body.classList.remove('scan-modal-locked');
      setBackgroundInert(false);
      document.removeEventListener('keydown', onKeydown);
      closeTimer = window.setTimeout(function () { overlay.hidden = true; resetState(); closeTimer = null; }, 260);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
      current = null;
    }

    function resetState() {
      form.reset();
      formView.hidden = false;
      success.hidden = true;
      successLink.hidden = true;
      [[nameError, nameInput], [emailError, emailInput], [companyError, companyInput]].forEach(function (pair) {
        pair[0].classList.remove('show');
        pair[1].setAttribute('aria-invalid', 'false');
      });
      formError.hidden = true;
      submitBtn.disabled = false;
      submitLabel.textContent = 'Request Access →';
      busy = false;
      // form.reset() clears the hidden fields too, so restore the selection if a card is open.
      if (current) {
        form.elements.product_intent.value = current;
        form.elements.product_name.value = DIAGNOSTICS[current].product;
      }
    }

    function focusables() {
      return Array.prototype.filter.call(
        modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]'),
        function (el) {
          return !el.disabled && el.getAttribute('tabindex') !== '-1' && !el.closest('[hidden]') && el.getClientRects().length > 0;
        }
      );
    }

    function onKeydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
      if (e.key !== 'Tab') return;
      var items = focusables();
      if (!items.length) { e.preventDefault(); return; }
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    }

    // ---- submit ----
    function looksLikeBot() {
      var trap = form.querySelector('[name="company_tax_id"]');
      if (trap && trap.value.trim() !== '') return true;
      var honey = form.querySelector('[name="bot-field"]');
      if (honey && honey.value.trim() !== '') return true;
      return openedAt > 0 && (Date.now() - openedAt) < CONFIG.minFillMs;
    }

    function isLocalPreview() {
      var h = window.location.hostname;
      return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || /\.localhost$/.test(h);
    }

    // ---- INTEREST HOOK -------------------------------------------------------
    // The one place an interest event leaves the page.
    //   payload: { product_intent, product_name, name, email, company, source, submitted_at }
    // Step 1 posts the form to Netlify Forms. Step 2 forwards the payload as JSON to
    // CONFIG.crmWebhookUrl when set. Resolves once the Netlify submission has succeeded.
    function handleInterest(payload) {
      if (isLocalPreview()) {
        // Netlify Forms does not exist on a local static server, so skip the network.
        if (window.console && console.info) console.info('[KOS] local preview, interest not sent', payload);
        return Promise.resolve(payload);
      }
      return fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (response) {
        if (!response.ok) throw new Error('Form submission failed with status ' + response.status);
        forwardToCrm(payload);
        return payload;
      });
    }

    function forwardToCrm(payload) {
      if (!CONFIG.crmWebhookUrl) return;
      try {
        fetch(CONFIG.crmWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function () { /* best effort, never blocks the visitor */ });
      } catch (e) { /* same */ }
    }
    // ---------------------------------------------------------------------------

    function showSuccess(key) {
      var d = DIAGNOSTICS[key];
      formView.hidden = true;
      success.hidden = false;
      if (d.accessUrl) {
        successLink.setAttribute('href', d.accessUrl);
        successLink.hidden = false;
      } else {
        successLink.hidden = true;
      }
      success.focus();
    }

    function fail(errorEl, input, message) {
      if (message) errorEl.textContent = message;
      errorEl.classList.add('show');
      input.setAttribute('aria-invalid', 'true');
    }

    function validate() {
      var ok = true;
      var first = null;
      var name = nameInput.value.trim();
      var email = emailInput.value.trim();
      var company = companyInput.value.trim();
      if (name.length < 2) { fail(nameError, nameInput); ok = false; first = first || nameInput; }
      if (!isValidEmail(email)) {
        fail(emailError, emailInput, 'Please enter a valid email address.'); ok = false; first = first || emailInput;
      } else if (isFreeEmail(email)) {
        fail(emailError, emailInput, 'Please use your business email address, not a personal inbox.'); ok = false; first = first || emailInput;
      }
      if (company.length < 2) { fail(companyError, companyInput); ok = false; first = first || companyInput; }
      if (first) first.focus();
      return ok;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy || !current) return;
      if (!validate()) return;

      var key = current;
      var payload = {
        product_intent: key,
        product_name: DIAGNOSTICS[key].product,
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        company: companyInput.value.trim(),
        source: '/KOS',
        submitted_at: new Date().toISOString()
      };

      // Bots get the normal confirmation and no network call, so they have no error to retry on.
      if (looksLikeBot()) { showSuccess(key); return; }

      formError.hidden = true;
      busy = true;
      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';

      handleInterest(payload).then(function () {
        busy = false;
        emit('kos:interest', { product_intent: key });
        showSuccess(key);
      }).catch(function () {
        busy = false;
        submitBtn.disabled = false;
        submitLabel.textContent = 'Request Access →';
        formError.hidden = false;
      });
    });

    [[nameError, nameInput], [emailError, emailInput], [companyError, companyInput]].forEach(function (pair) {
      pair[1].addEventListener('input', function () {
        pair[0].classList.remove('show');
        pair[1].setAttribute('aria-invalid', 'false');
      });
    });

    // ---- wiring ----
    Array.prototype.forEach.call(document.querySelectorAll('[data-kos-open]'), function (btn) {
      btn.addEventListener('click', function () { openDrawer(btn.getAttribute('data-kos-open'), btn); });
    });
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-kos-close]'), function (btn) {
      btn.addEventListener('click', closeDrawer);
    });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeDrawer(); });

    var cardLink = document.querySelector('[data-kos-card-link]');
    if (cardLink) {
      cardLink.addEventListener('click', function () {
        emit('kos:interest', { product_intent: cardLink.getAttribute('data-kos-card-link') });
      });
    }

    var book = document.querySelector('[data-kos-book]');
    if (book && CONFIG.bookingUrl) {
      book.setAttribute('href', CONFIG.bookingUrl);
      book.setAttribute('target', '_blank');
      book.setAttribute('rel', 'noopener');
    }
  });
})();
